import type { PipelineState, StepResult } from '../types';
import type { LcsAdapter, AdapterPayload } from '../../adapters/types';
import type { Channel } from '@/data/lcs';
import { mintMessageRunId } from '../../id-minter';

/**
 * Step 6: Call Adapter — mint message_run_id, select adapter, send payload.
 *
 * What triggers this? Successful Step 5.
 * How do we get it? Adapter registry + domain rotation config determine which adapter.
 *   The adapter instance is injected by the orchestrator.
 */
export async function callAdapter(
  state: PipelineState,
  adapter: LcsAdapter
): Promise<StepResult> {
  try {
    // Determine channel from signal preference or default
    const channel: Channel = state.signal.preferred_channel ?? adapter.channel;
    state.channel = channel;
    state.adapter_type = adapter.channel;

    // Mint message_run_id (attempt 1 — ORBT retries would increment)
    const attempt = 1; // First attempt; ORBT handler mints subsequent attempts
    state.message_run_id = mintMessageRunId(
      state.communication_id!,
      channel,
      attempt
    );

    // Build adapter payload
    const payload: AdapterPayload = {
      message_run_id: state.message_run_id,
      communication_id: state.communication_id!,
      channel,
      recipient_email: state.recipient_email,
      recipient_linkedin_url: state.recipient_linkedin_url,
      subject: null,        // Frame template populates this (future: AI composition)
      body_html: null,      // Frame template populates this
      body_text: null,      // Frame template populates this
      sender_identity: state.sender_identity!,
      sender_email: state.sender_email,
      sender_domain: state.sender_domain,
      metadata: { frame_id: state.frame_id, signal_set_hash: state.signal.signal_set_hash },
    };

    // Call the adapter
    const response = await adapter.send(payload);

    state.adapter_response = response;
    state.delivery_status = response.delivery_status;

    if (!response.success) {
      // Adapter returned a failure — pipeline continues to Step 7 for logging
      // but marks as failed for ORBT handling
      return {
        step_number: 6,
        step_name: 'Call Adapter',
        event_type: 'ADAPTER_CALLED',
        success: true, // Step itself succeeded (adapter was called). Delivery failed.
        state,
        payload: { adapter_response: response.raw_response },
      };
    }

    return {
      step_number: 6,
      step_name: 'Call Adapter',
      event_type: 'ADAPTER_CALLED',
      success: true,
      state,
      payload: { adapter_response: response.raw_response },
    };
  } catch (err) {
    state.failed = true;
    state.failure_step = 6;
    state.failure_reason = err instanceof Error ? err.message : 'Adapter call failed';

    return {
      step_number: 6,
      step_name: 'Call Adapter',
      event_type: 'DELIVERY_FAILED',
      success: false,
      state,
    };
  }
}
