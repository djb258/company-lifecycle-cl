import type {
  Channel, DeliveryStatus, EntityType, LifecyclePhase, Lane
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
