import type {
  LifecyclePhase, FrameType, Channel, IntelligenceTier,
  CidCompilationRule, MidSequenceType
} from './enums';

/**
 * LCS Frame Registry — lcs.frame_registry
 * Classification: CONFIG (INSERT/UPDATE, no DELETE)
 */
export interface LcsFrameRegistryRow {
  frame_id: string;            // PK
  frame_name: string;
  lifecycle_phase: LifecyclePhase;
  frame_type: FrameType;

  // Intelligence requirements
  tier: IntelligenceTier;
  required_fields: string[];   // JSONB array of field names
  fallback_frame: string | null;  // references another frame_id

  // Channel and sequencing
  channel: Exclude<Channel, 'SH'> | null;  // MG or HR only (no SH for frames)
  step_in_sequence: number | null;

  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // CID/SID/MID pipeline integration (migration 005)
  cid_compilation_rule: CidCompilationRule | null;
  sid_template_id: string | null;
  mid_sequence_type: MidSequenceType | null;
  mid_delay_hours: number | null;
  mid_max_attempts: number | null;  // default 3
}
