import type { PipelineState, StepResult } from '../types';
import type { EventType } from '@/data/lcs';

/**
 * Step 7: Log Delivery — determine final delivery event_type from adapter response.
 *
 * What triggers this? Step 6 completion (success or failure).
 * How do we get it? adapter_response from pipeline state.
 */
export async function logDelivery(state: PipelineState): Promise<StepResult> {
  const response = state.adapter_response;

  // Map delivery_status to CET event_type
  let eventType: EventType;

  if (!response) {
    eventType = 'DELIVERY_FAILED';
    state.failed = true;
    state.failure_step = 7;
    state.failure_reason = 'No adapter response available';
  } else if (response.success) {
    eventType = response.delivery_status === 'DELIVERED'
      ? 'DELIVERY_SUCCESS'
      : 'DELIVERY_SENT';  // SENT but not yet confirmed delivered
  } else if (response.delivery_status === 'BOUNCED') {
    eventType = 'DELIVERY_BOUNCED';
  } else {
    eventType = 'DELIVERY_FAILED';
  }

  return {
    step_number: 7,
    step_name: 'Log Delivery',
    event_type: eventType,
    success: !state.failed,
    state,
    payload: response ? { raw_response: response.raw_response } : undefined,
  };
}
