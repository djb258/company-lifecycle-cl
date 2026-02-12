import type {
  LifecyclePhase, EventType, DeliveryStatus, Lane, Channel,
  EntityType, IntelligenceTier, FrameType
} from '@/data/lcs';
import type { GateResult } from '@/sys/lcs/gates';
import type { AdapterResponse } from '../adapters/types';

// ═══════════════════════════════════════════════════════════════
// Signal Input — what arrives from an ingress spoke
// ═══════════════════════════════════════════════════════════════

/** The raw signal from an ingress spoke (I-010 through I-015) */
export interface SignalInput {
  /** Which spoke sent this signal */
  spoke_id: string;               // e.g., 'SPOKE-CL-I-010'

  /** Signal identification */
  signal_set_hash: string;        // references signal_registry
  signal_category: string;        // from signal_registry

  /** Target */
  sovereign_company_id: string;
  lifecycle_phase: LifecyclePhase;

  /** Routing hints (optional — pipeline resolves if missing) */
  preferred_channel?: Channel;
  preferred_lane?: Lane;
  agent_number?: string;

  /** Arbitrary signal payload from the spoke */
  signal_data: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// Pipeline State — accumulates as steps execute
// ═══════════════════════════════════════════════════════════════

/** Mutable state that flows through all 9 pipeline steps */
export interface PipelineState {
  // --- From Signal (Step 1) ---
  signal: SignalInput;
  agent_number: string;
  lane: Lane;

  // --- From Intelligence (Step 2) ---
  intelligence: Record<string, unknown> | null;   // row from v_company_intelligence
  intelligence_tier: IntelligenceTier | null;

  // --- From Frame Match (Step 3) ---
  frame_id: string | null;
  frame_type: FrameType | null;
  frame_required_fields: string[];
  frame_fallback_id: string | null;

  // --- From ID Mint (Step 4) ---
  communication_id: string | null;

  // --- From Audience Resolution (Step 5) ---
  entity_type: EntityType | null;
  entity_id: string | null;
  recipient_email: string | null;
  recipient_linkedin_url: string | null;
  sender_identity: string | null;
  sender_email: string | null;
  sender_domain: string | null;

  // --- From Adapter Call (Step 6) ---
  message_run_id: string | null;
  channel: Channel | null;
  adapter_type: string | null;

  // --- From Delivery (Step 7) ---
  adapter_response: AdapterResponse | null;
  delivery_status: DeliveryStatus | null;

  // --- Gate results (accumulated) ---
  gate_results: GateResult[];

  // --- Error tracking ---
  failed: boolean;
  failure_step: number | null;
  failure_reason: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Step Result — what each step returns
// ═══════════════════════════════════════════════════════════════

export interface StepResult {
  step_number: number;            // 1-9
  step_name: string;              // human-readable
  event_type: EventType;          // CET event to log
  success: boolean;
  state: PipelineState;           // updated state after this step
  /** If step produced data to log as CET payload */
  payload?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// Pipeline Result — final output of the orchestrator
// ═══════════════════════════════════════════════════════════════

export interface PipelineResult {
  success: boolean;
  communication_id: string | null;
  message_run_id: string | null;
  delivery_status: DeliveryStatus | null;
  steps_completed: number;
  gate_results: GateResult[];
  failure_reason: string | null;
}
