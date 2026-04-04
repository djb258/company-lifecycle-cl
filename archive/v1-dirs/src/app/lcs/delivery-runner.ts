/**
 * @deprecated REPLACED by supabase/functions/lcs-delivery-runner/index.ts
 * This file used lcsClient (Supabase PostgREST) which cannot reach the lcs schema on Neon.
 * The edge function connects to Neon via pg directly, does dedup via CET LEFT JOIN,
 * and writes results to lcs.event without updating mid_sequence_state.
 * Kept for type reference only — do not call runQueuedDeliveries().
 */
import { fetchQueuedDeliveries, type HydratedDelivery } from './delivery-queue';
import { resolveAdapter } from './adapters';
import { callAdapter } from './pipeline/steps/06-call-adapter';
import { logCetEvent } from './cet-logger';
import type { PipelineState, SignalInput } from './pipeline/types';
import type { Channel, DeliveryStatus } from '@/data/lcs';

/**
 * Delivery Runner — the entry point an edge function or cron invokes.
 *
 * 1. Reads QUEUED rows (mid_sequence_state + sid_output)
 * 2. For each, selects the adapter (MG or HR) and calls it
 * 3. Logs the result to lcs.event via CET logger
 */
export async function runQueuedDeliveries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const deliveries = await fetchQueuedDeliveries();
  let succeeded = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    try {
      await processDelivery(delivery);
      succeeded++;
    } catch (err) {
      failed++;
      console.error(
        '[DeliveryRunner] Unhandled error for communication_id:',
        delivery.queue.communication_id,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { processed: deliveries.length, succeeded, failed };
}

/**
 * Process a single hydrated delivery: build state → call adapter → log CET.
 */
async function processDelivery(delivery: HydratedDelivery): Promise<void> {
  const { queue, content } = delivery;

  // Resolve adapter by channel
  const adapter = resolveAdapter(queue.channel as Channel);
  if (!adapter) {
    // Log a DELIVERY_FAILED event — no adapter for this channel
    await logCetEvent({
      communication_id: queue.communication_id,
      message_run_id: queue.message_run_id,
      sovereign_company_id: queue.sovereign_company_id,
      entity_id: queue.entity_id ?? '00000000-0000-0000-0000-000000000000',
      entity_type: queue.entity_type ?? 'slot',
      event_type: 'DELIVERY_FAILED',
      delivery_status: 'FAILED' as DeliveryStatus,
      channel: queue.channel,
      adapter_type: queue.adapter_type ?? 'UNKNOWN',
      lifecycle_phase: queue.lifecycle_phase,
      agent_number: queue.agent_number,
      lane: queue.lane,
      signal_set_hash: queue.signal_set_hash,
      frame_id: queue.frame_id ?? 'UNRESOLVED',
      step_number: 6,
      step_name: 'Call Adapter',
      payload: null,
      adapter_response: { error: `No adapter for channel ${queue.channel}` },
      intelligence_tier: null,
      sender_identity: content?.sender_identity ?? null,
    });
    return;
  }

  // Build PipelineState from hydrated data
  const signal: SignalInput = {
    spoke_id: 'SPOKE-CL-DELIVERY-RUNNER',
    signal_set_hash: queue.signal_set_hash,
    signal_category: 'MANUAL_TRIGGER',
    sovereign_company_id: queue.sovereign_company_id,
    lifecycle_phase: queue.lifecycle_phase,
    preferred_channel: queue.channel as Channel,
    preferred_lane: queue.lane,
    agent_number: queue.agent_number,
    signal_data: {},
  };

  const state: PipelineState = {
    signal,
    agent_number: queue.agent_number,
    lane: queue.lane,

    intelligence: null,
    intelligence_tier: null,

    frame_id: queue.frame_id,
    frame_type: null,
    frame_required_fields: [],
    frame_fallback_id: null,

    communication_id: queue.communication_id,

    entity_type: queue.entity_type,
    entity_id: queue.entity_id,
    recipient_email: content?.recipient_email ?? null,
    recipient_linkedin_url: null,
    sender_identity: content?.sender_identity ?? null,
    sender_email: null,
    sender_domain: null,

    // Hydrated content fields from sid_output
    subject_line: content?.subject_line ?? null,
    body_plain: content?.body_plain ?? null,
    body_html: content?.body_html ?? null,
    recipient_name: content?.recipient_name ?? null,

    message_run_id: queue.message_run_id,
    channel: queue.channel as Channel,
    adapter_type: queue.adapter_type,

    adapter_response: null,
    delivery_status: null,

    gate_results: [],

    failed: false,
    failure_step: null,
    failure_reason: null,
  };

  // Call the adapter (Step 6)
  const result = await callAdapter(state, adapter);

  // Log CET event
  await logCetEvent({
    communication_id: queue.communication_id,
    message_run_id: state.message_run_id ?? queue.message_run_id,
    sovereign_company_id: queue.sovereign_company_id,
    entity_id: queue.entity_id ?? '00000000-0000-0000-0000-000000000000',
    entity_type: queue.entity_type ?? 'slot',
    event_type: result.event_type,
    delivery_status: state.delivery_status ?? 'PENDING',
    channel: state.channel ?? queue.channel,
    adapter_type: state.adapter_type ?? queue.adapter_type ?? 'UNKNOWN',
    lifecycle_phase: queue.lifecycle_phase,
    agent_number: queue.agent_number,
    lane: queue.lane,
    signal_set_hash: queue.signal_set_hash,
    frame_id: queue.frame_id ?? 'UNRESOLVED',
    step_number: 6,
    step_name: 'Call Adapter',
    payload: result.payload ?? null,
    adapter_response: state.adapter_response?.raw_response ?? null,
    intelligence_tier: null,
    sender_identity: content?.sender_identity ?? null,
  });
}
