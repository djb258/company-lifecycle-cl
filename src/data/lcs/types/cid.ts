import type {
  LifecyclePhase, Lane, EntityType, IntelligenceTier, CompilationStatus
} from './enums';

/**
 * LCS CID Compiler Registry — lcs.cid
 * Classification: CANONICAL (APPEND-ONLY)
 * Sub-hub: SH-LCS-PIPELINE
 *
 * Origin of every communication. CID compiler mints a communication_id
 * by binding signal + company + entity + frame.
 */
export interface LcsCidRow {
  communication_id: string;       // PK, format: LCS-{PHASE}-{YYYYMMDD}-{ULID}
  sovereign_company_id: string;   // UUID, by value (not FK)
  entity_type: EntityType;
  entity_id: string;              // UUID
  signal_set_hash: string;        // by value ref to signal_registry
  signal_queue_id: string | null; // UUID, nullable for manual mints
  frame_id: string;               // by value ref to frame_registry
  lifecycle_phase: LifecyclePhase;
  lane: Lane;
  agent_number: string;
  intelligence_tier: IntelligenceTier | null;
  compilation_status: CompilationStatus;
  compilation_reason: string | null;
  created_at: string;             // ISO 8601 timestamptz
}

/**
 * Insert type — what you provide to INSERT into lcs.cid.
 * created_at is optional (defaults to NOW()).
 */
export type LcsCidInsert = Omit<LcsCidRow, 'created_at'> & {
  created_at?: string;
};
