/**
 * LCS Inbound Reply — Supabase Edge Function
 *
 * Receives forwarded inbound emails from Cloudflare Email Routing (via Worker POST).
 * Extracts the original communication_id from In-Reply-To / References headers,
 * then inserts a REPLY_RECEIVED signal into lcs.signal_queue and logs to CET.
 *
 * Endpoint: POST /functions/v1/lcs-inbound-reply
 * Auth: Shared secret via X-Webhook-Secret header
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

/**
 * Extract LCS communication_id from email headers.
 * We encode the communication_id in the Message-ID of outbound emails as:
 *   <{communication_id}@mail.yourdomain.com>
 *
 * Inbound replies include this in In-Reply-To or References headers.
 */
function extractCommunicationId(headers: Record<string, string>): string | null {
  const candidates = [
    headers['in-reply-to'],
    headers['In-Reply-To'],
    headers['references'],
    headers['References'],
  ].filter(Boolean);

  for (const header of candidates) {
    if (!header) continue;
    // Match LCS communication ID pattern: LCS-{PHASE}-{YYYYMMDD}-{ULID}
    const match = header.match(/(LCS-[A-Z]+-\d{8}-[A-Z0-9]{26})/);
    if (match) return match[1];
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ─── Validate webhook secret ─────────────────────
    const expectedSecret = Deno.env.get('MAILGUN_WEBHOOK_SIGNING_KEY') ?? '';
    const providedSecret = req.headers.get('x-webhook-secret') ?? '';

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Parse inbound email payload ─────────────────
    // Cloudflare Worker should POST JSON with shape:
    // { from, to, subject, headers: { "in-reply-to": "...", ... }, text_body, html_body }
    const body = await req.json();

    const emailHeaders: Record<string, string> = body.headers ?? {};
    const communicationId = extractCommunicationId(emailHeaders);

    if (!communicationId) {
      // Not a reply to an LCS-originated email — ignore
      return new Response(JSON.stringify({ status: 'ignored', reason: 'no_communication_id' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      console.error('[Inbound Reply] Original event not found:', communicationId);
      return new Response(JSON.stringify({ status: 'error', reason: 'original_not_found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Insert reply event into CET ─────────────────
    const messageRunId = `RUN-${communicationId}-REPLY-1`;

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
        adapter_type: 'CF_EMAIL',
        channel: 'MG',
        delivery_status: 'REPLIED',
        lifecycle_phase: originalEvent.lifecycle_phase,
        event_type: 'REPLY_RECEIVED',
        lane: originalEvent.lane,
        agent_number: originalEvent.agent_number,
        step_number: 9,
        step_name: 'Inbound Reply',
        payload: {
          from: body.from ?? null,
          to: body.to ?? null,
          subject: body.subject ?? null,
          reply_snippet: (body.text_body ?? '').slice(0, 500),
          received_at: new Date().toISOString(),
        },
        adapter_response: null,
        intelligence_tier: originalEvent.intelligence_tier,
        sender_identity: originalEvent.sender_identity,
      });

    if (insertError) {
      console.error('[Inbound Reply] CET insert failed:', insertError.message);
      return new Response(JSON.stringify({ status: 'error', reason: insertError.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Insert REPLY_RECEIVED signal into queue ─────
    const { error: signalError } = await supabase
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
          from: body.from ?? null,
          subject: body.subject ?? null,
        },
        source_hub: 'MANUAL',
        source_signal_id: null,
        status: 'PENDING',
        priority: 3,
      });

    if (signalError) {
      console.error('[Inbound Reply] Signal queue insert failed:', signalError.message);
    }

    return new Response(JSON.stringify({ status: 'ok', communication_id: communicationId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[Inbound Reply] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
