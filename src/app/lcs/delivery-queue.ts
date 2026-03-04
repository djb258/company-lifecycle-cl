/**
 * @deprecated REPLACED by supabase/functions/lcs-delivery-runner/index.ts
 * This file used lcsClient (Supabase PostgREST) which cannot reach the lcs schema on Neon.
 * The edge function connects to Neon via pg directly and does a proper JOIN.
 * Kept for type reference only — do not call fetchQueuedDeliveries().
 */
import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type { MidSequenceStateRow, SidOutputRow } from '@/data/lcs';

/**
 * HydratedDelivery — a QUEUED row from mid_sequence_state joined with
 * its sid_output content row. Everything the adapter needs to send.
 */
export interface HydratedDelivery {
  // From mid_sequence_state
  queue: MidSequenceStateRow;
  // From sid_output (may be null if composition hasn't run)
  content: SidOutputRow | null;
}

/**
 * Fetch all QUEUED deliveries from lcs.mid_sequence_state,
 * then hydrate each with its sid_output content row.
 *
 * Two sequential queries (PostgREST cannot cross-table JOIN).
 * Volume is small — QUEUED rows are a working set, not a backlog.
 */
export async function fetchQueuedDeliveries(): Promise<HydratedDelivery[]> {
  // 1. Fetch QUEUED rows
  const { data: queueRows, error: queueError } = await lcsClient
    .from('mid_sequence_state')
    .select('*')
    .eq('delivery_status', 'QUEUED');

  if (queueError) {
    console.error('[DeliveryQueue] Failed to read mid_sequence_state:', queueError.message);
    return [];
  }

  if (!queueRows || queueRows.length === 0) {
    return [];
  }

  // 2. Collect communication_ids for the sid_output lookup
  const commIds = (queueRows as MidSequenceStateRow[]).map(r => r.communication_id);

  const { data: sidRows, error: sidError } = await lcsClient
    .from('sid_output')
    .select('*')
    .in('communication_id', commIds);

  if (sidError) {
    console.error('[DeliveryQueue] Failed to read sid_output:', sidError.message);
    // Continue — content will be null, adapter will fail gracefully
  }

  // 3. Index sid_output by communication_id
  const sidMap = new Map<string, SidOutputRow>();
  if (sidRows) {
    for (const row of sidRows as SidOutputRow[]) {
      sidMap.set(row.communication_id, row);
    }
  }

  // 4. Hydrate
  return (queueRows as MidSequenceStateRow[]).map(queue => ({
    queue,
    content: sidMap.get(queue.communication_id) ?? null,
  }));
}
