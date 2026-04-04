import type { Channel, AdapterHealthStatus, AdapterDirection } from './enums';

/**
 * LCS Adapter Registry — lcs.adapter_registry
 * Classification: CONFIG (INSERT/UPDATE, no DELETE)
 */
export interface LcsAdapterRegistryRow {
  adapter_type: string;        // PK
  adapter_name: string;
  channel: Channel;
  direction: AdapterDirection;
  description: string | null;

  // Domain rotation (MG adapter only)
  domain_rotation_config: {
    domains: string[];
    rotation_strategy: string;
    daily_cap_per_domain: number;
  } | null;

  // Health monitoring
  health_status: AdapterHealthStatus;
  daily_cap: number | null;
  sent_today: number;
  bounce_rate_24h: number;
  complaint_rate_24h: number;
  auto_pause_rules: {
    max_bounce_rate: number;
    max_complaint_rate: number;
    daily_cap_pause: boolean;
  } | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}
