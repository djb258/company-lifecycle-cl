import type { LifecyclePhase, SignalCategory } from './enums';

/**
 * LCS Signal Registry — lcs.signal_registry
 * Classification: CONFIG (INSERT/UPDATE, no DELETE)
 */
export interface LcsSignalRegistryRow {
  signal_set_hash: string;     // PK
  signal_name: string;
  lifecycle_phase: LifecyclePhase;
  signal_category: SignalCategory;
  description: string | null;

  // Freshness tracking
  data_fetched_at: string | null;
  data_expires_at: string | null;
  freshness_window: string;    // INTERVAL as string (e.g., '30 days')

  // Validity scoring
  signal_validity_score: number | null;  // 0.00-1.00
  validity_threshold: number;            // default 0.50

  is_active: boolean;
  created_at: string;
  updated_at: string;
}
