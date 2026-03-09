import type {
  Channel, DeliveryStatus, EntityType, LifecyclePhase, Lane,
  GateVerdict, ThrottleStatus, MidDeliveryStatus
} from './enums';

/**
 * MidSequenceStateRow — READ table for queued deliveries.
 * Source: lcs.mid_sequence_state
 * The delivery-queue reader fetches rows where delivery_status = 'QUEUED'.
 */
export interface MidSequenceStateRow {
  message_run_id: string;
  communication_id: string;
  channel: Channel;
  delivery_status: DeliveryStatus;
  sovereign_company_id: string;
  entity_id: string | null;
  entity_type: EntityType | null;
  lifecycle_phase: LifecyclePhase;
  agent_number: string;
  lane: Lane;
  signal_set_hash: string;
  frame_id: string | null;
  adapter_type: string | null;
  step_number: number;
  created_at: string;
}

/**
 * LCS MID Delivery Sequence State — lcs.mid_sequence_state
 * Classification: STAGING (APPEND-ONLY)
 * Sub-hub: SH-LCS-PIPELINE
 *
 * Tracks delivery sequencing, gate verdicts, adapter routing decisions,
 * and attempt lifecycle per message_run_id. Each attempt = new row.
 * Downstream of SID, feeds into CET (lcs.event).
 */
export interface LcsMidSequenceStateRow {
  mid_id: string;                    // UUID PK, auto-generated
  message_run_id: string;            // format: RUN-LCS-{PHASE}-{YYYYMMDD}-{ULID}-{CHANNEL}-{ATTEMPT}
  communication_id: string;          // by value ref to lcs.cid
  adapter_type: string;              // by value ref to adapter_registry
  channel: Channel;
  sequence_position: number;
  attempt_number: number;            // 1-10, default 1
  gate_verdict: GateVerdict;
  gate_reason: string | null;
  throttle_status: ThrottleStatus | null;
  delivery_status: MidDeliveryStatus;
  scheduled_at: string | null;       // ISO 8601, for DELAYED sequences
  attempted_at: string | null;       // ISO 8601
  created_at: string;                // ISO 8601 timestamptz
}

/**
 * Insert type — what you provide to INSERT into lcs.mid_sequence_state.
 * mid_id and created_at are optional (auto-generated).
 */
export type LcsMidSequenceStateInsert = Omit<LcsMidSequenceStateRow, 'mid_id' | 'created_at'> & {
  mid_id?: string;
  created_at?: string;
};
