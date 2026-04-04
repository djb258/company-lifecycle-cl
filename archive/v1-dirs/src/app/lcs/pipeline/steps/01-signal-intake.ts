import type { PipelineState, StepResult } from '../types';

/**
 * Step 1: Signal Intake — validate inbound signal and initialize pipeline state.
 *
 * What triggers this? An ingress spoke (I-010 through I-015) delivers a SignalInput.
 * How do we get it? The spoke pushes to the orchestrator entry point.
 */
export async function signalIntake(state: PipelineState): Promise<StepResult> {
  const signal = state.signal;

  // Validate required fields
  if (!signal.sovereign_company_id || !signal.signal_set_hash || !signal.lifecycle_phase) {
    state.failed = true;
    state.failure_step = 1;
    state.failure_reason = 'Signal missing required fields: sovereign_company_id, signal_set_hash, or lifecycle_phase';

    return {
      step_number: 1,
      step_name: 'Signal Intake',
      event_type: 'SIGNAL_DROPPED',
      success: false,
      state,
    };
  }

  // Set defaults from signal hints
  state.lane = signal.preferred_lane ?? 'MAIN';
  state.agent_number = signal.agent_number ?? 'UNASSIGNED';

  return {
    step_number: 1,
    step_name: 'Signal Intake',
    event_type: 'SIGNAL_RECEIVED',
    success: true,
    state,
    payload: { signal_data: signal.signal_data },
  };
}
