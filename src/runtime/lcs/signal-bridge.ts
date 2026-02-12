/**
 * Signal Bridge Runner — TypeScript wrapper for lcs.bridge_pressure_signals().
 *
 * What triggers this? Supabase cron or manual invocation.
 * How do we get it? Calls the SQL function via Supabase RPC.
 *
 * This is a thin spoke — it calls the SQL function and logs results.
 * All bridge logic lives in the SQL function (Prompt 12, Part A).
 */

import { supabase } from '@/data/integrations/supabase/client';

interface BridgeResult {
  source_hub: string;
  signals_found: number;
  signals_inserted: number;
  signals_skipped: number;
}

export async function runSignalBridge(): Promise<BridgeResult[]> {
  const { data, error } = await supabase
    .rpc('bridge_pressure_signals');

  if (error) {
    console.error('[Signal Bridge] RPC failed:', error.message);
    return [];
  }

  const results = (data as BridgeResult[]) ?? [];

  for (const r of results) {
    console.log(
      `[Signal Bridge] ${r.source_hub}: found=${r.signals_found}, inserted=${r.signals_inserted}, skipped=${r.signals_skipped}`
    );
  }

  return results;
}
