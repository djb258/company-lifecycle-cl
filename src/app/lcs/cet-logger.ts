import { supabase } from '@/data/integrations/supabase/client';
import type { LcsEventInsert } from '@/data/lcs';

/**
 * CET Logger — append-only writes to lcs.event.
 *
 * Every pipeline step logs one CET row. The pipeline state provides all column values.
 * This function does NOT read from CET — it only writes.
 *
 * What triggers this? Every pipeline step completion (success or failure).
 * How do we get it? Pipeline orchestrator calls logCetEvent after each step.
 */
export async function logCetEvent(event: LcsEventInsert): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('event')
      .insert(event)
      // @ts-expect-error — lcs schema requires PostgREST config; see deployment notes
      .schema('lcs');

    if (error) {
      console.error('[CET Logger] Insert failed:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CET Logger] Exception:', message);
    return { success: false, error: message };
  }
}
