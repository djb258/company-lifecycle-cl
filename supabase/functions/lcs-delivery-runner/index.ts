/**
 * LCS Delivery Runner — Supabase Edge Function
 *
 * Connects directly to Neon via pg. Reads QUEUED rows from
 * lcs.mid_sequence_state, joins lcs.sid_output for content,
 * fires Mailgun or HeyReach, writes results to lcs.event.
 *
 * No UPDATE on mid_sequence_state — CET is the delivery outcome record.
 * Dedup via LEFT JOIN lcs.event to skip already-processed rows.
 *
 * Auth: x-webhook-secret header matching MAILGUN_WEBHOOK_SIGNING_KEY
 * Trigger: cron or manual POST
 *
 * @deprecated client-side delivery-queue.ts / delivery-runner.ts
 */

import postgres from 'npm:postgres@3.4.5';

// ─── Types ──────────────────────────────────────────────

interface QueuedDelivery {
  message_run_id: string;
  communication_id: string;
  channel: string;
  sovereign_company_id: string;
  entity_id: string | null;
  entity_type: string | null;
  lifecycle_phase: string;
  agent_number: string;
  lane: string;
  signal_set_hash: string;
  frame_id: string | null;
  adapter_type: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  subject_line: string | null;
  body_plain: string | null;
  body_html: string | null;
  sender_identity: string | null;
}

interface DeliveryResult {
  event_type: 'DELIVERY_SENT' | 'DELIVERY_FAILED';
  delivery_status: 'SENT' | 'FAILED';
  adapter_response: Record<string, unknown>;
  payload: Record<string, unknown> | null;
  failure_type?: string;
  failure_message?: string;
}

// ─── Mailgun Adapter ───────────────────────────────────

async function sendMailgun(
  delivery: QueuedDelivery,
  apiKey: string,
): Promise<DeliveryResult> {
  if (!delivery.recipient_email) {
    return {
      event_type: 'DELIVERY_FAILED',
      delivery_status: 'FAILED',
      adapter_response: { error: 'No recipient_email in sid_output' },
      payload: null,
      failure_type: 'VALIDATION_ERROR',
      failure_message: 'Missing recipient_email',
    };
  }

  if (!delivery.body_plain && !delivery.body_html) {
    return {
      event_type: 'DELIVERY_FAILED',
      delivery_status: 'FAILED',
      adapter_response: { error: 'No body content in sid_output' },
      payload: null,
      failure_type: 'VALIDATION_ERROR',
      failure_message: 'Missing body_plain and body_html',
    };
  }

  // Build Mailgun send payload
  const senderDomain = delivery.sender_identity?.split('@')[1] ?? 'mail.example.com';
  const fromAddress = delivery.sender_identity ?? `noreply@${senderDomain}`;

  const formData = new FormData();
  formData.append('from', fromAddress);
  formData.append('to', delivery.recipient_email);
  formData.append('subject', delivery.subject_line ?? '(no subject)');
  if (delivery.body_html) formData.append('html', delivery.body_html);
  if (delivery.body_plain) formData.append('text', delivery.body_plain);
  // Custom variables for webhook correlation
  formData.append('v:communication_id', delivery.communication_id);
  formData.append('v:message_run_id', delivery.message_run_id);

  const mailgunDomain = senderDomain;
  const url = `https://api.mailgun.net/v3/${mailgunDomain}/messages`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${apiKey}`)}`,
      },
      body: formData,
    });

    const respBody = await resp.json().catch(() => ({ raw: await resp.text() }));

    if (!resp.ok) {
      return {
        event_type: 'DELIVERY_FAILED',
        delivery_status: 'FAILED',
        adapter_response: { status: resp.status, body: respBody },
        payload: { to: delivery.recipient_email, subject: delivery.subject_line },
        failure_type: resp.status === 429 ? 'RATE_LIMIT' : 'ADAPTER_ERROR',
        failure_message: `Mailgun ${resp.status}: ${JSON.stringify(respBody)}`,
      };
    }

    return {
      event_type: 'DELIVERY_SENT',
      delivery_status: 'SENT',
      adapter_response: { status: resp.status, body: respBody },
      payload: { to: delivery.recipient_email, subject: delivery.subject_line, mailgun_id: respBody?.id },
    };
  } catch (err) {
    return {
      event_type: 'DELIVERY_FAILED',
      delivery_status: 'FAILED',
      adapter_response: { error: err instanceof Error ? err.message : String(err) },
      payload: null,
      failure_type: 'CONNECTION_FAILED',
      failure_message: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── HeyReach Adapter (stub — logs DELIVERY_FAILED until HEYREACH_API_KEY is set) ─

async function sendHeyReach(
  delivery: QueuedDelivery,
  _apiKey: string | undefined,
): Promise<DeliveryResult> {
  if (!_apiKey) {
    return {
      event_type: 'DELIVERY_FAILED',
      delivery_status: 'FAILED',
      adapter_response: { error: 'HEYREACH_API_KEY not configured' },
      payload: null,
      failure_type: 'AUTH_FAILURE',
      failure_message: 'HEYREACH_API_KEY secret not set',
    };
  }

  // TODO: Implement HeyReach API integration when ready
  // For now, return a clear failure so it shows up in CET
  return {
    event_type: 'DELIVERY_FAILED',
    delivery_status: 'FAILED',
    adapter_response: { error: 'HeyReach adapter not yet implemented' },
    payload: { communication_id: delivery.communication_id },
    failure_type: 'ADAPTER_ERROR',
    failure_message: 'HeyReach adapter pending implementation',
  };
}

// ─── Main Handler ──────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Auth: webhook secret ─────────────────────────
  const webhookSecret = Deno.env.get('MAILGUN_WEBHOOK_SIGNING_KEY') ?? '';
  const providedSecret = req.headers.get('x-webhook-secret') ?? '';

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Connect to Neon ──────────────────────────────
  const connectionString = Deno.env.get('NEON_CONNECTION_STRING');
  if (!connectionString) {
    console.error('[DeliveryRunner] NEON_CONNECTION_STRING not set');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sql = postgres(connectionString, { ssl: 'require' });

  try {
    // ─── Dedup query: QUEUED rows not yet in CET ────
    const deliveries = await sql<QueuedDelivery[]>`
      SELECT
        mss.message_run_id,
        mss.communication_id,
        mss.channel,
        mss.sovereign_company_id,
        mss.entity_id,
        mss.entity_type,
        mss.lifecycle_phase,
        mss.agent_number,
        mss.lane,
        mss.signal_set_hash,
        mss.frame_id,
        mss.adapter_type,
        sid.recipient_email,
        sid.recipient_name,
        sid.subject_line,
        sid.body_plain,
        sid.body_html,
        sid.sender_identity
      FROM lcs.mid_sequence_state mss
      JOIN lcs.sid_output sid ON sid.communication_id = mss.communication_id
      LEFT JOIN lcs.event evt
        ON evt.communication_id = mss.communication_id
        AND evt.event_type IN ('DELIVERY_SENT', 'DELIVERY_FAILED')
      WHERE mss.delivery_status = 'QUEUED'
        AND evt.communication_id IS NULL
    `;

    if (deliveries.length === 0) {
      await sql.end();
      return new Response(JSON.stringify({ status: 'ok', processed: 0, succeeded: 0, failed: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[DeliveryRunner] Processing ${deliveries.length} queued deliveries`);

    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY') ?? '';
    const heyreachApiKey = Deno.env.get('HEYREACH_API_KEY');

    let succeeded = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      try {
        // ─── Select adapter by channel ──────────────
        let result: DeliveryResult;

        if (delivery.channel === 'MG') {
          result = await sendMailgun(delivery, mailgunApiKey);
        } else if (delivery.channel === 'HR') {
          result = await sendHeyReach(delivery, heyreachApiKey);
        } else {
          result = {
            event_type: 'DELIVERY_FAILED',
            delivery_status: 'FAILED',
            adapter_response: { error: `Unknown channel: ${delivery.channel}` },
            payload: null,
            failure_type: 'VALIDATION_ERROR',
            failure_message: `No adapter for channel ${delivery.channel}`,
          };
        }

        // ─── Write CET event ────────────────────────
        await sql`
          INSERT INTO lcs.event (
            communication_id, message_run_id,
            sovereign_company_id, entity_type, entity_id,
            signal_set_hash, frame_id,
            adapter_type, channel, delivery_status,
            lifecycle_phase, event_type, lane,
            agent_number, step_number, step_name,
            payload, adapter_response,
            intelligence_tier, sender_identity
          ) VALUES (
            ${delivery.communication_id},
            ${delivery.message_run_id},
            ${delivery.sovereign_company_id}::uuid,
            ${delivery.entity_type ?? 'slot'},
            ${delivery.entity_id ?? '00000000-0000-0000-0000-000000000000'}::uuid,
            ${delivery.signal_set_hash},
            ${delivery.frame_id ?? 'UNRESOLVED'},
            ${delivery.adapter_type ?? delivery.channel},
            ${delivery.channel},
            ${result.delivery_status},
            ${delivery.lifecycle_phase},
            ${result.event_type},
            ${delivery.lane},
            ${delivery.agent_number},
            6,
            'Call Adapter',
            ${result.payload ? JSON.stringify(result.payload) : null}::jsonb,
            ${JSON.stringify(result.adapter_response)}::jsonb,
            null,
            ${delivery.sender_identity}
          )
        `;

        // ─── On failure: also write to err0 ─────────
        if (result.event_type === 'DELIVERY_FAILED' && result.failure_type) {
          await sql`
            INSERT INTO lcs.err0 (
              message_run_id, communication_id,
              sovereign_company_id, failure_type, failure_message,
              lifecycle_phase, adapter_type,
              orbt_strike_number, orbt_action_taken,
              orbt_alt_channel_eligible, orbt_alt_channel_reason
            ) VALUES (
              ${delivery.message_run_id},
              ${delivery.communication_id},
              ${delivery.sovereign_company_id},
              ${result.failure_type},
              ${result.failure_message ?? 'Unknown error'},
              ${delivery.lifecycle_phase},
              ${delivery.adapter_type ?? delivery.channel},
              1,
              'AUTO_RETRY',
              false,
              null
            )
          `;
          failed++;
        } else {
          succeeded++;
        }
      } catch (err) {
        console.error(
          `[DeliveryRunner] Error processing ${delivery.communication_id}:`,
          err instanceof Error ? err.message : err,
        );

        // Best-effort: write DELIVERY_FAILED to CET
        try {
          await sql`
            INSERT INTO lcs.event (
              communication_id, message_run_id,
              sovereign_company_id, entity_type, entity_id,
              signal_set_hash, frame_id,
              adapter_type, channel, delivery_status,
              lifecycle_phase, event_type, lane,
              agent_number, step_number, step_name,
              payload, adapter_response,
              intelligence_tier, sender_identity
            ) VALUES (
              ${delivery.communication_id},
              ${delivery.message_run_id},
              ${delivery.sovereign_company_id}::uuid,
              ${delivery.entity_type ?? 'slot'},
              ${delivery.entity_id ?? '00000000-0000-0000-0000-000000000000'}::uuid,
              ${delivery.signal_set_hash},
              ${delivery.frame_id ?? 'UNRESOLVED'},
              ${delivery.adapter_type ?? delivery.channel},
              ${delivery.channel},
              'FAILED',
              ${delivery.lifecycle_phase},
              'DELIVERY_FAILED',
              ${delivery.lane},
              ${delivery.agent_number},
              6,
              'Call Adapter',
              null,
              ${JSON.stringify({ error: err instanceof Error ? err.message : String(err) })}::jsonb,
              null,
              ${delivery.sender_identity}
            )
          `;
        } catch (cetErr) {
          console.error('[DeliveryRunner] CET fallback write also failed:', cetErr);
        }

        failed++;
      }
    }

    await sql.end();

    console.log(`[DeliveryRunner] Done: ${succeeded} sent, ${failed} failed out of ${deliveries.length}`);

    return new Response(
      JSON.stringify({ status: 'ok', processed: deliveries.length, succeeded, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[DeliveryRunner] Fatal error:', err);
    try { await sql.end(); } catch { /* ignore */ }
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
