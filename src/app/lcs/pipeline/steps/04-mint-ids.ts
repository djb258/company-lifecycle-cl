import type { PipelineState, StepResult } from '../types';
import { mintCommunicationId } from '../../id-minter';

/**
 * Step 4: Mint IDs — mint the communication_id (ULID-based).
 * message_run_id is minted later at Step 6 (needs channel info).
 *
 * What triggers this? Successful Step 3.
 * How do we get it? id-minter.ts generates the ULID.
 */
export async function mintIds(state: PipelineState): Promise<StepResult> {
  try {
    state.communication_id = mintCommunicationId(state.signal.lifecycle_phase);

    return {
      step_number: 4,
      step_name: 'Mint IDs',
      event_type: 'ID_MINTED',
      success: true,
      state,
      payload: { communication_id: state.communication_id },
    };
  } catch (err) {
    state.failed = true;
    state.failure_step = 4;
    state.failure_reason = err instanceof Error ? err.message : 'ID minting failed';

    return {
      step_number: 4,
      step_name: 'Mint IDs',
      event_type: 'ERROR_LOGGED',
      success: false,
      state,
    };
  }
}
