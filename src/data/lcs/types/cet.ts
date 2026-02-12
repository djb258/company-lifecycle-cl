import type {
  LifecyclePhase, EventType, DeliveryStatus, Lane,
  Channel, EntityType, IntelligenceTier
} from './enums';

/**
 * LCS Canonical Event Table (CET) — lcs.event
 * Classification: APPEND-ONLY
 * Partitioned monthly by RANGE on created_at
 */
export interface LcsEventRow {
  // Dual-ID Model
  communication_id: string;    // LCS-{PHASE}-{YYYYMMDD}-{ULID}
  message_run_id: string;      // RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}

  // Sovereign identity reference (by value)
  sovereign_company_id: string; // UUID from cl.company_identity

  // Entity target
  entity_type: EntityType;
  entity_id: string;           // UUID

  // Signal and frame
  signal_set_hash: string;
  frame_id: string;

  // Delivery
  adapter_type: string;
  channel: Channel;
  delivery_status: DeliveryStatus;

  // Lifecycle classification
  lifecycle_phase: LifecyclePhase;

  // Event classification
  event_type: EventType;

  // Lane
  lane: Lane;

  // Agent and pipeline step
  agent_number: string;
  step_number: number;         // 1-9
  step_name: string;

  // Payloads (nullable)
  payload: Record<string, unknown> | null;
  adapter_response: Record<string, unknown> | null;

  // Intelligence snapshot
  intelligence_tier: IntelligenceTier | null;
  sender_identity: string | null;

  // Timestamp
  created_at: string;          // ISO 8601 timestamptz
}

/**
 * Insert type — what you provide to INSERT into lcs.event.
 * created_at is optional (defaults to NOW()).
 */
export type LcsEventInsert = Omit<LcsEventRow, 'created_at'> & {
  created_at?: string;
};
