import type { LifecyclePhase, FailureType, OrbtAction } from './enums';

/**
 * LCS Error Table (ERR0) — lcs.err0
 * Classification: APPEND-ONLY
 * ORBT 3-strike protocol
 */
export interface LcsErr0Row {
  error_id: string;            // UUID (auto-generated)
  message_run_id: string;
  communication_id: string | null;  // NULL if pre-CET failure
  sovereign_company_id: string | null;
  failure_type: FailureType;
  failure_message: string;
  lifecycle_phase: LifecyclePhase | null;
  adapter_type: string | null;

  // ORBT Strike Protocol
  orbt_strike_number: number | null;    // 1, 2, or 3
  orbt_action_taken: OrbtAction | null;
  orbt_alt_channel_eligible: boolean | null;
  orbt_alt_channel_reason: string | null;

  created_at: string;
}

/**
 * Insert type — error_id and created_at are auto-generated.
 */
export type LcsErr0Insert = Omit<LcsErr0Row, 'error_id' | 'created_at'> & {
  error_id?: string;
  created_at?: string;
};
