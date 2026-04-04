import type {
  LifecyclePhase, EventType, DeliveryStatus, Lane,
  Channel, EntityType, IntelligenceTier
} from './enums';

/**
 * lcs.v_latest_by_entity — Latest event per entity
 * Refresh: Nightly 2:30 AM
 */
export interface LcsLatestByEntityRow {
  communication_id: string;
  message_run_id: string;
  sovereign_company_id: string;
  entity_type: EntityType;
  entity_id: string;
  signal_set_hash: string;
  frame_id: string;
  adapter_type: string;
  lifecycle_phase: LifecyclePhase;
  event_type: EventType;
  lane: Lane;
  delivery_status: DeliveryStatus;
  channel: Channel;
  agent_number: string;
  intelligence_tier: IntelligenceTier | null;
  created_at: string;
}

/**
 * lcs.v_latest_by_company — Latest event per company
 * Refresh: Nightly 2:30 AM
 */
export interface LcsLatestByCompanyRow {
  communication_id: string;
  message_run_id: string;
  sovereign_company_id: string;
  entity_type: EntityType;
  entity_id: string;
  signal_set_hash: string;
  frame_id: string;
  adapter_type: string;
  lifecycle_phase: LifecyclePhase;
  event_type: EventType;
  lane: Lane;
  delivery_status: DeliveryStatus;
  channel: Channel;
  agent_number: string;
  intelligence_tier: IntelligenceTier | null;
  created_at: string;
}

/**
 * lcs.v_company_intelligence — Cross-sub-hub intelligence snapshot
 * Refresh: Nightly 2:00 AM
 *
 * NOTE: Field names match the matview SELECT aliases.
 * Sub-hub table/column names are [[VERIFY]] — this type matches
 * the matview OUTPUT, not the source tables.
 */
export interface LcsCompanyIntelligenceRow {
  sovereign_company_id: string;
  company_name: string;
  agent_number: string | null;

  // CEO slot
  ceo_entity_id: string | null;
  ceo_name: string | null;
  ceo_email: string | null;
  ceo_linkedin_url: string | null;
  ceo_data_fetched_at: string | null;

  // CFO slot
  cfo_entity_id: string | null;
  cfo_name: string | null;
  cfo_email: string | null;
  cfo_linkedin_url: string | null;

  // HR slot
  hr_entity_id: string | null;
  hr_name: string | null;
  hr_email: string | null;
  hr_linkedin_url: string | null;

  // DOL
  plan_year_end: string | null;     // DATE as string
  total_participants: number | null;
  total_plan_cost: number | null;
  carrier_name: string | null;
  days_to_renewal: number | null;   // computed

  // Blog
  latest_post_title: string | null;
  latest_post_date: string | null;
  post_count: number | null;

  // Sitemap
  page_count: number | null;
  has_careers_page: boolean | null;
  location_count: number | null;

  // Computed
  intelligence_tier: IntelligenceTier;
  snapshot_at: string;
}
