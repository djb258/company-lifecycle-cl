import type { LifecyclePhase, Channel, IntelligenceTier } from '@/data/lcs';

// ═══════════════════════════════════════════════════════════════
// Gate Decision Types
// ═══════════════════════════════════════════════════════════════

/** Every gate returns one of these verdicts */
export type GateVerdict = 'PASS' | 'BLOCK' | 'DOWNGRADE';

/** Standardized gate result — every gate returns this shape */
export interface GateResult {
  gate: string;                    // which gate produced this (e.g., 'CAPACITY', 'SUPPRESSION', 'FRESHNESS')
  verdict: GateVerdict;
  reason: string;                  // human-readable explanation
  blocked_event_type?: string;     // if BLOCK, which CET event_type to log (e.g., 'RECIPIENT_THROTTLED')
  downgraded_tier?: IntelligenceTier;  // if DOWNGRADE, the new tier
}

// ═══════════════════════════════════════════════════════════════
// Capacity Gate Context
// ═══════════════════════════════════════════════════════════════

/** What the app pipeline provides to the capacity gate */
export interface CapacityGateContext {
  /** Is the founder calendar currently available? (global gate) */
  founder_calendar_available: boolean;

  /** Agent territory info */
  agent_number: string;
  agent_daily_cap: number;         // max sends per day for this agent's territory
  agent_sent_today: number;        // how many already sent today

  /** Adapter-level capacity (from adapter_registry) */
  adapter_daily_cap: number | null;  // null = unlimited
  adapter_sent_today: number;
  adapter_health_status: string;     // 'HEALTHY' | 'DEGRADED' | 'PAUSED' | 'WARMING'
}

// ═══════════════════════════════════════════════════════════════
// Suppression Engine Context
// ═══════════════════════════════════════════════════════════════

/** Suppression state for a recipient entity */
export type SuppressionState = 'ACTIVE' | 'COOLED' | 'PARKED' | 'SUPPRESSED';

/** What the app pipeline provides to the suppression engine */
export interface SuppressionContext {
  /** Current suppression state of the recipient */
  suppression_state: SuppressionState;

  /** Per-recipient frequency cap */
  last_contact_at: string | null;     // ISO timestamp of last delivery to this entity
  min_contact_interval_days: number;  // minimum days between contacts (e.g., 14)

  /** Company-level throttle */
  company_sends_this_week: number;    // total sends to any entity at this company this week
  company_weekly_cap: number;         // max sends per company per week (e.g., 3)

  /** Hard suppression flags */
  never_contact: boolean;             // permanent suppression flag
  unsubscribed: boolean;              // recipient opted out
  hard_bounced: boolean;              // email permanently undeliverable
  complained: boolean;                // marked as spam

  /** Lifecycle context */
  lifecycle_phase: LifecyclePhase;
  channel: Channel;
}

// ═══════════════════════════════════════════════════════════════
// Freshness Gate Context
// ═══════════════════════════════════════════════════════════════

/** Freshness status for a single sub-hub data source */
export interface SubHubFreshness {
  sub_hub: 'PEOPLE' | 'DOL' | 'BLOG' | 'SITEMAP';
  data_fetched_at: string | null;     // ISO timestamp, null = never fetched
  freshness_window_days: number;      // how many days before data is stale
}

/** What the app pipeline provides to the freshness gate */
export interface FreshnessGateContext {
  /** Intelligence tier from matview snapshot */
  current_tier: IntelligenceTier;

  /** Freshness status per sub-hub */
  sub_hub_freshness: SubHubFreshness[];

  /** Frame requirements */
  frame_required_fields: string[];    // fields the selected frame needs
  frame_fallback_id: string | null;   // fallback frame if tier downgrades
}
