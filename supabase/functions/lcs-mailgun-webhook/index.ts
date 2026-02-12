/**
 * LCS Mailgun Webhook — Supabase Edge Function
 *
 * What triggers this? Mailgun POST to https://<project>.supabase.co/functions/v1/lcs-mailgun-webhook
 * How do we get it? Configured in Mailgun dashboard → Webhooks → Legacy or Events
 *
 * Mailgun sends webhook events for: delivered, bounced, failed, complained, opened, clicked
 * Each event includes the custom variables (communication_id, message_run_id) set during send.
 *
 * Security: HMAC-SHA256 signature validation using MAILGUN_WEBHOOK_SIGNING_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Crypto: HMAC-SHA256 validation ─────────────────────
async function validateMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
  signature: string
): Promise<boolean> {
  if (!signingKey || !timestamp || !token || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = encoder.encode(timestamp + token);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, data);
  const computedHex = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedHex === signature;
}

// ─── Mailgun event type → CET mapping ───────────────────
const EVENT_MAP: Record<string, { event_type: string; delivery_status: string }> = {
  delivered:   { event_type: 'DELIVERY_SUCCESS',    delivery_status: 'DELIVERED' },
  bounced:     { event_type: 'DELIVERY_BOUNCED',    delivery_status: 'BOUNCED' },
  failed:      { event_type: 'DELIVERY_FAILED',     delivery_status: 'FAILED' },
  complained:  { event_type: 'DELIVERY_COMPLAINED', delivery_status: 'FAILED' },
  opened:      { event_type: 'OPENED',              delivery_status: 'OPENED' },
  clicked:     { event_type: 'CLICKED',             delivery_status: 'CLICKED' },
};

serve(async (req: Request) => {
  // ─── Only accept POST ──────────────────────────────
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // ─── Mailgun signature validation ────────────────
    const signingKey = Deno.env.get('MAILGUN_WEBHOOK_SIGNING_KEY') ?? '';
    const sig = body?.signature;

    if (!sig || !sig.timestamp || !sig.token || !sig.signature) {
      return new Response(JSON.stringify({ error: 'Missing signature fields' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const valid = await validateMailgunSignature(
      signingKey,
      String(sig.timestamp),
      sig.token,
      sig.signature
    );

    if (!valid) {
      console.error('[MG Webhook] Invalid HMAC signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ─── Parse event data ────────────────────────────
    const eventData = body['event-data'] ?? body;
    const eventName = eventData?.event;

    if (!eventName || !EVENT_MAP[eventName]) {
      // Unrecognized event — accept silently (Mailgun sends many types)
      return new Response(JSON.stringify({ status: 'ignored', event: eventName }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mapping = EVENT_MAP[eventName];
    const userVars = eventData['user-variables'] ?? {};
    const communicationId = userVars.communication_id;
    const messageRunId = userVars.message_run_id;

    if (!communicationId || !messageRunId) {
      // Not an LCS-originated message — skip
      return new Response(JSON.stringify({ status: 'skipped', reason: 'no_lcs_ids' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ─── Supabase client (service role) ──────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Look up original CET event ──────────────────
    const { data: originalEvent, error: lookupError } = await supabase
      .schema('lcs')
      .from('event')
      .select('sovereign_company_id, entity_type, entity_id, lifecycle_phase, lane, agent_number, frame_id, signal_set_hash, channel, sender_identity, intelligence_tier')
      .eq('communication_id', communicationId)
      .limit(1)
      .single();

    if (lookupError || !originalEvent) {
      console.error('[MG Webhook] Original event not found:', communicationId);
      return new Response(JSON.stringify({ status: 'error', reason: 'original_not_found' }), {
        status: 200, // Return 200 to prevent Mailgun retry
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ─── Insert webhook event into CET ───────────────
    const { error: insertError } = await supabase
      .schema('lcs')
      .from('event')
      .insert({
        communication_id: communicationId,
        message_run_id: messageRunId,
        sovereign_company_id: originalEvent.sovereign_company_id,
        entity_type: originalEvent.entity_type,
        entity_id: originalEvent.entity_id,
        signal_set_hash: originalEvent.signal_set_hash,
        frame_id: originalEvent.frame_id,
        adapter_type: 'MG',
        channel: 'MG',
        delivery_status: mapping.delivery_status,
        lifecycle_phase: originalEvent.lifecycle_phase,
        event_type: mapping.event_type,
        lane: originalEvent.lane,
        agent_number: originalEvent.agent_number,
        step_number: 8,
        step_name: 'Webhook Feedback',
        payload: {
          mailgun_event: eventName,
          mailgun_timestamp: eventData.timestamp ?? null,
          mailgun_message_id: eventData['message-id'] ?? eventData.message?.headers?.['message-id'] ?? null,
          recipient: eventData.recipient ?? null,
          severity: eventData.severity ?? null,
          reason: eventData.reason ?? null,
        },
        adapter_response: null,
        intelligence_tier: originalEvent.intelligence_tier,
        sender_identity: originalEvent.sender_identity,
      });

    if (insertError) {
      console.error('[MG Webhook] CET insert failed:', insertError.message);
      return new Response(JSON.stringify({ status: 'error', reason: insertError.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ─── Engagement signal → signal_queue ────────────
    // Opens and clicks are engagement signals that can re-trigger pipeline
    if (eventName === 'opened' || eventName === 'clicked') {
      await supabase
        .schema('lcs')
        .from('signal_queue')
        .insert({
          signal_set_hash: 'SIG-ENGAGEMENT-V1',
          signal_category: 'ENGAGEMENT_SIGNAL',
          sovereign_company_id: originalEvent.sovereign_company_id,
          lifecycle_phase: originalEvent.lifecycle_phase,
          signal_data: {
            trigger_event: eventName,
            communication_id: communicationId,
            recipient: eventData.recipient ?? null,
          },
          source_hub: 'MANUAL',  // Webhook-originated, not sub-hub
          source_signal_id: null,
          status: 'PENDING',
          priority: eventName === 'clicked' ? 2 : 1,
        });
    }

    // ─── Reply signal → signal_queue ─────────────────
    // Note: Mailgun does not natively send 'replied' events.
    // This block is future-proofing for custom reply detection.
    // If/when reply tracking is implemented, this is ready.
    if (eventName === 'replied') {
      await supabase
        .schema('lcs')
        .from('signal_queue')
        .insert({
          signal_set_hash: 'SIG-REPLY-RECEIVED-V1',
          signal_category: 'REPLY_RECEIVED',
          sovereign_company_id: originalEvent.sovereign_company_id,
          lifecycle_phase: originalEvent.lifecycle_phase,
          signal_data: {
            trigger_event: 'replied',
            communication_id: communicationId,
            recipient: eventData.recipient ?? null,
          },
          source_hub: 'MANUAL',
          source_signal_id: null,
          status: 'PENDING',
          priority: 3,  // highest
        });
    }

    return new Response(JSON.stringify({ status: 'ok', event: eventName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[MG Webhook] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200, // Return 200 to prevent Mailgun retry loop
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
