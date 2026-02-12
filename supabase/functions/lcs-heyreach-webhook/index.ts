/**
 * LCS HeyReach Webhook — Supabase Edge Function
 *
 * What triggers this? HeyReach POST to https://<project>.supabase.co/functions/v1/lcs-heyreach-webhook
 * How do we get it? Configured in HeyReach dashboard → Webhook Settings
 *
 * HeyReach sends webhook events for LinkedIn actions:
 *   - connection_accepted → DELIVERY_SUCCESS / DELIVERED
 *   - message_sent → DELIVERY_SENT / SENT
 *   - replied → CLICKED / CLICKED (treat LinkedIn reply as engagement)
 *
 * Security: Validates X-HeyReach-Signature header or shared API key
 * Channel: HR
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Auth: API key validation ────────────────────────────
function validateHeyReachAuth(req: Request): boolean {
  const apiKey = Deno.env.get('HEYREACH_WEBHOOK_SECRET') ?? '';
  if (!apiKey) return false;

  // Check X-HeyReach-Signature header first
  const headerSig = req.headers.get('x-heyreach-signature') ?? '';
  if (headerSig && headerSig === apiKey) return true;

  // Fallback: check Authorization header
  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${apiKey}`) return true;

  // TODO: If HeyReach implements HMAC signing, add crypto.subtle validation here
  // similar to the Mailgun Edge Function pattern

  return false;
}

// ─── HeyReach event type → CET mapping ──────────────────
const EVENT_MAP: Record<string, { event_type: string; delivery_status: string }> = {
  connection_accepted: { event_type: 'DELIVERY_SUCCESS', delivery_status: 'DELIVERED' },
  message_sent:        { event_type: 'DELIVERY_SENT',    delivery_status: 'SENT' },
  replied:             { event_type: 'CLICKED',           delivery_status: 'CLICKED' },
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
    // ─── Auth validation ─────────────────────────────
    if (!validateHeyReachAuth(req)) {
      console.error('[HR Webhook] Invalid authentication');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // ─── Parse event data ────────────────────────────
    // TODO: Verify HeyReach webhook payload structure against actual API docs.
    // The field paths below are best-effort based on common webhook patterns.
    const eventName = body?.event ?? body?.event_type ?? body?.type;

    if (!eventName || !EVENT_MAP[eventName]) {
      return new Response(JSON.stringify({ status: 'ignored', event: eventName }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const mapping = EVENT_MAP[eventName];

    // HeyReach webhook format — robust fallback parsing
    const communicationId = body?.metadata?.communication_id
      ?? body?.custom_data?.communication_id
      ?? body?.data?.communication_id
      ?? null;
    const messageRunId = body?.metadata?.message_run_id
      ?? body?.custom_data?.message_run_id
      ?? body?.data?.message_run_id
      ?? null;

    if (!communicationId || !messageRunId) {
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
      console.error('[HR Webhook] Original event not found:', communicationId);
      return new Response(JSON.stringify({ status: 'error', reason: 'original_not_found' }), {
        status: 200, // Return 200 to prevent retry
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
        adapter_type: 'HR',
        channel: 'HR',
        delivery_status: mapping.delivery_status,
        lifecycle_phase: originalEvent.lifecycle_phase,
        event_type: mapping.event_type,
        lane: originalEvent.lane,
        agent_number: originalEvent.agent_number,
        step_number: 8,
        step_name: 'Webhook Feedback',
        payload: {
          heyreach_event: eventName,
          heyreach_timestamp: body?.timestamp ?? body?.created_at ?? null,
          linkedin_profile: body?.data?.linkedin_url ?? body?.linkedin_profile_url ?? null,
          recipient: body?.data?.recipient ?? body?.recipient ?? null,
        },
        adapter_response: null,
        intelligence_tier: originalEvent.intelligence_tier,
        sender_identity: originalEvent.sender_identity,
      });

    if (insertError) {
      console.error('[HR Webhook] CET insert failed:', insertError.message);
      return new Response(JSON.stringify({ status: 'error', reason: insertError.message }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ─── LinkedIn reply → engagement signal ──────────
    if (eventName === 'replied') {
      await supabase
        .schema('lcs')
        .from('signal_queue')
        .insert({
          signal_set_hash: 'SIG-ENGAGEMENT-V1',
          signal_category: 'ENGAGEMENT_SIGNAL',
          sovereign_company_id: originalEvent.sovereign_company_id,
          lifecycle_phase: originalEvent.lifecycle_phase,
          signal_data: {
            trigger_event: 'linkedin_reply',
            communication_id: communicationId,
            channel: 'HR',
          },
          source_hub: 'MANUAL',
          source_signal_id: null,
          status: 'PENDING',
          priority: 2,
        });
    }

    return new Response(JSON.stringify({ status: 'ok', event: eventName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[HR Webhook] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200, // Return 200 to prevent retry loop
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
