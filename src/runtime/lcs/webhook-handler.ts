import { logCetEvent } from '@/app/lcs';
import type { LcsEventInsert, EventType, DeliveryStatus } from '@/data/lcs';
import { supabase } from '@/data/integrations/supabase/client';

/**
 * Webhook Handler — processes inbound delivery events from adapters.
 *
 * What triggers this? Mailgun webhook POST to our Supabase Edge Function endpoint.
 * How do we get it? Mailgun sends delivery events to a configured webhook URL.
 *
 * This is the FEEDBACK LOOP in the bicycle wheel:
 *   Output (adapter sends) → External (Mailgun delivers) → Input (webhook receives)
 *   → Hub (CET logs the status update)
 *
 * Supported Mailgun events:
 *   - delivered → DELIVERY_SUCCESS
 *   - bounced (permanent) → DELIVERY_BOUNCED
 *   - failed (temporary) → DELIVERY_FAILED
 *   - complained → DELIVERY_COMPLAINED (triggers suppression)
 *   - opened → OPENED
 *   - clicked → CLICKED
 */

interface MailgunWebhookEvent {
  event: string;                      // 'delivered' | 'failed' | 'bounced' | 'complained' | 'unsubscribed' | 'opened' | 'clicked'
  timestamp: number;                  // Unix timestamp
  'message-id'?: string;             // Mailgun message ID (matches adapter_message_id)
  recipient?: string;
  'user-variables'?: {
    communication_id?: string;
    message_run_id?: string;
  };
  severity?: string;                  // for 'failed': 'temporary' | 'permanent'
  reason?: string;                    // bounce/failure reason
}

interface WebhookResult {
  processed: number;
  errors: string[];
}

// ─── Event mapping ───────────────────────────────────────
// Maps Mailgun event names to CET event_type + delivery_status.
// event_type values must exist in the EventType enum.
const EVENT_MAP: Record<string, { event_type: EventType; delivery_status: DeliveryStatus }> = {
  delivered:    { event_type: 'DELIVERY_SUCCESS',    delivery_status: 'DELIVERED' },
  bounced:      { event_type: 'DELIVERY_BOUNCED',    delivery_status: 'BOUNCED' },
  failed:       { event_type: 'DELIVERY_FAILED',     delivery_status: 'FAILED' },
  complained:   { event_type: 'DELIVERY_COMPLAINED', delivery_status: 'FAILED' },
  opened:       { event_type: 'OPENED',              delivery_status: 'OPENED' },
  clicked:      { event_type: 'CLICKED',             delivery_status: 'CLICKED' },
};

/**
 * Process a batch of Mailgun webhook events.
 */
export async function handleMailgunWebhook(
  events: MailgunWebhookEvent[]
): Promise<WebhookResult> {
  const result: WebhookResult = { processed: 0, errors: [] };

  for (const event of events) {
    try {
      const mapping = EVENT_MAP[event.event];
      if (!mapping) {
        // Unrecognized event type — skip silently (Mailgun sends many event types)
        continue;
      }

      const userVars = event['user-variables'] ?? {};
      const communicationId = userVars.communication_id;
      const messageRunId = userVars.message_run_id;

      if (!communicationId || !messageRunId) {
        result.errors.push(`Missing LCS IDs in webhook event: ${event.event} for ${event.recipient ?? 'unknown'}`);
        continue;
      }

      // Look up the original CET event to get company/entity context
      const { data: originalEvent } = await supabase
        .from('event')
        // @ts-expect-error — lcs schema requires PostgREST config
        .schema('lcs')
        .select('sovereign_company_id, entity_type, entity_id, lifecycle_phase, lane, agent_number, frame_id, signal_set_hash, channel, sender_identity, intelligence_tier')
        .eq('communication_id', communicationId)
        .limit(1)
        .single();

      if (!originalEvent) {
        result.errors.push(`No original CET event found for communication_id: ${communicationId}`);
        continue;
      }

      // Log the webhook event as a new CET row
      const cetEvent: LcsEventInsert = {
        communication_id: communicationId,
        message_run_id: messageRunId,
        sovereign_company_id: originalEvent.sovereign_company_id as string,
        entity_type: originalEvent.entity_type as LcsEventInsert['entity_type'],
        entity_id: originalEvent.entity_id as string,
        signal_set_hash: originalEvent.signal_set_hash as string,
        frame_id: originalEvent.frame_id as string,
        adapter_type: 'MG',
        channel: 'MG',
        delivery_status: mapping.delivery_status,
        lifecycle_phase: originalEvent.lifecycle_phase as LcsEventInsert['lifecycle_phase'],
        event_type: mapping.event_type,
        lane: originalEvent.lane as LcsEventInsert['lane'],
        agent_number: originalEvent.agent_number as string,
        step_number: 8,               // Webhook events are "Step 8" — async feedback
        step_name: 'Webhook Feedback',
        payload: {
          mailgun_event: event.event,
          mailgun_timestamp: event.timestamp,
          mailgun_message_id: event['message-id'] ?? null,
          recipient: event.recipient ?? null,
          severity: event.severity ?? null,
          reason: event.reason ?? null,
        },
        adapter_response: null,
        intelligence_tier: (originalEvent.intelligence_tier as number) ?? null,
        sender_identity: (originalEvent.sender_identity as string) ?? null,
      };

      await logCetEvent(cetEvent);
      result.processed++;

      // Handle suppression-triggering events
      if (event.event === 'complained' || event.event === 'unsubscribed') {
        // Future: update suppression state table
        // For v1, the CET event itself serves as the suppression record.
        // The suppression engine reads these when building context.
        console.log(`[Webhook] Suppression event: ${event.event} for ${event.recipient}`);
      }

    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : 'Unknown webhook processing error');
    }
  }

  return result;
}

/**
 * Validate Mailgun webhook signature.
 * Mailgun signs webhooks with HMAC-SHA256 using the webhook signing key.
 */
export function validateMailgunSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY ?? '';
  if (!signingKey) return false;

  // HMAC-SHA256 validation
  // In Node/Deno: use crypto.createHmac('sha256', signingKey).update(timestamp + token).digest('hex')
  // For Supabase Edge Functions (Deno): use Web Crypto API
  // Stubbed here — implementation depends on runtime
  // TODO: Implement HMAC validation for production
  return true;
}
