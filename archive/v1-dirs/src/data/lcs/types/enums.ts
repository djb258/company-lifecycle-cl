// ═══════════════════════════════════════════════════════════════
// LCS Enum Types — derived from SQL CHECK constraints
// Authority: HUB-CL-001, SUBHUB-CL-LCS
// Version: 2.2.0
// ═══════════════════════════════════════════════════════════════

// --- Lifecycle Phase (shared across all tables) ---
export type LifecyclePhase = 'OUTREACH' | 'SALES' | 'CLIENT';

// --- CET: event_type ---
export type EventType =
  | 'SIGNAL_RECEIVED'
  | 'INTELLIGENCE_COLLECTED'
  | 'FRAME_MATCHED'
  | 'ID_MINTED'
  | 'AUDIENCE_RESOLVED'
  | 'ADAPTER_CALLED'
  | 'DELIVERY_SENT'
  | 'DELIVERY_SUCCESS'
  | 'DELIVERY_FAILED'
  | 'DELIVERY_BOUNCED'
  | 'DELIVERY_COMPLAINED'
  | 'OPENED'
  | 'CLICKED'
  | 'ERROR_LOGGED'
  | 'SIGNAL_DROPPED'
  | 'COMPOSITION_BLOCKED'
  | 'RECIPIENT_THROTTLED'
  | 'COMPANY_THROTTLED'
  | 'DATA_STALE'
  | 'FRAME_INELIGIBLE';

// --- CET: delivery_status ---
export type DeliveryStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'REPLIED'
  | 'BOUNCED'
  | 'FAILED';

// --- CET: lane ---
export type Lane = 'MAIN' | 'LANE_A' | 'LANE_B' | 'NEWSLETTER';

// --- CET + Adapter: channel ---
export type Channel = 'MG' | 'HR' | 'SH';

// --- CET: entity_type ---
export type EntityType = 'slot' | 'person';

// --- ERR0: failure_type ---
export type FailureType =
  | 'ADAPTER_ERROR'
  | 'TIMEOUT'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMIT'
  | 'BOUNCE_HARD'
  | 'BOUNCE_SOFT'
  | 'COMPLAINT'
  | 'AUTH_FAILURE'
  | 'PAYLOAD_REJECTED'
  | 'CONNECTION_FAILED'
  | 'UNKNOWN';

// --- ERR0: orbt_action_taken ---
export type OrbtAction = 'AUTO_RETRY' | 'ALT_CHANNEL' | 'HUMAN_ESCALATION';

// --- Signal Registry: signal_category ---
export type SignalCategory =
  | 'RENEWAL_PROXIMITY'
  | 'PLAN_CHANGE'
  | 'GROWTH_SIGNAL'
  | 'ENGAGEMENT_SIGNAL'
  | 'BLOG_TRIGGER'
  | 'SITEMAP_CHANGE'
  | 'MEETING_BOOKED'
  | 'REPLY_RECEIVED'
  | 'MANUAL_TRIGGER';

// --- Frame Registry: frame_type ---
export type FrameType =
  | 'HAMMER'
  | 'NEWSLETTER'
  | 'POND'
  | 'MEETING_FOLLOWUP'
  | 'EMPLOYEE_COMM'
  | 'RENEWAL_NOTICE'
  | 'ONBOARDING';

// --- Adapter Registry: health_status ---
export type AdapterHealthStatus = 'HEALTHY' | 'DEGRADED' | 'PAUSED' | 'WARMING';

// --- Adapter Registry: direction ---
export type AdapterDirection = 'outbound' | 'inbound';

// --- Intelligence Tier (computed in v_company_intelligence) ---
export type IntelligenceTier = 1 | 2 | 3 | 4 | 5;

// --- Phase code (used in ID format) ---
export type PhaseCode = 'OUT' | 'SAL' | 'CLI';
