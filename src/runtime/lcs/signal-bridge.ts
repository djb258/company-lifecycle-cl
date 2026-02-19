/**
 * Signal Bridge Runner — TypeScript wrapper for lcs.bridge_pressure_signals().
 */

import { lcsClient } from '@/data/integrations/supabase/lcs-client';

interface BridgeResult {
  source_hub: string;
  signals_found: number;
  signals_inserted: number;
  signals_skipped: number;
}

export async function runSignalBridge(): Promise<BridgeResult[]> {
  const { data, error } = await lcsClient
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
