import { runPipeline } from '@/app/lcs';
import type { SignalInput } from '@/app/lcs';
import { resolveAdapter } from '@/app/lcs/adapters';
import type { Channel } from '@/data/lcs';
import {
  assembleCapacityContext,
  assembleSuppressionContext,
  assembleFreshnessContext
} from './context-assembler';
import { supabase } from '@/data/integrations/supabase/client';

/**
 * LCS Cron Runner — scheduled pipeline executor.
 *
 * What triggers this? Supabase cron schedule (e.g., every 5 minutes during business hours).
 * How do we get it? Supabase Edge Function with pg_cron trigger.
 *
 * Process:
 *   1. Query for pending signals (from a signal queue table or webhook ingestion)
 *   2. For each signal: assemble gate contexts, resolve adapter, run pipeline
 *   3. Log batch results
 *
 * v1: Processes signals from a simple queue. Future: event-driven with pg_notify.
 */

interface CronResult {
  total_signals: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ signal_set_hash: string; reason: string }>;
}

/**
 * Main cron entry point — process all pending signals.
 *
 * @param batchSize — Max signals to process per run (default: 50)
 * @param defaultChannel — Default delivery channel if signal doesn't specify (default: 'MG')
 */
export async function runLcsCron(
  batchSize: number = 50,
  defaultChannel: Channel = 'MG'
): Promise<CronResult> {
  const result: CronResult = {
    total_signals: 0,
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // ─── 1. Fetch pending signals ──────────────────────────
  // v1: Query a signal_queue table for unprocessed signals.
  // The signal_queue is populated by ingress webhooks/crons.
  // For now, we define the query shape — the actual table is a deployment concern.
  const { data: pendingSignals, error: fetchError } = await supabase
    .from('signal_queue')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError || !pendingSignals) {
    console.error('[LCS Cron] Failed to fetch pending signals:', fetchError?.message);
    return result;
  }

  result.total_signals = pendingSignals.length;

  if (pendingSignals.length === 0) {
    console.log('[LCS Cron] No pending signals.');
    return result;
  }

  // ─── 2. Process each signal ────────────────────────────
  for (const raw of pendingSignals) {
    try {
      // Parse signal from queue row
      const signal: SignalInput = {
        spoke_id: (raw.spoke_id as string) ?? 'SPOKE-CL-I-010',
        signal_set_hash: raw.signal_set_hash as string,
        signal_category: (raw.signal_category as string) ?? 'UNKNOWN',
        sovereign_company_id: raw.sovereign_company_id as string,
        lifecycle_phase: raw.lifecycle_phase as SignalInput['lifecycle_phase'],
        preferred_channel: (raw.preferred_channel as Channel) ?? undefined,
        preferred_lane: raw.preferred_lane ?? undefined,
        agent_number: (raw.agent_number as string) ?? undefined,
        signal_data: (raw.signal_data as Record<string, unknown>) ?? {},
      };

      // Determine channel
      const channel: Channel = signal.preferred_channel ?? defaultChannel;

      // Resolve adapter
      const adapter = resolveAdapter(channel);
      if (!adapter) {
        result.skipped++;
        result.errors.push({
          signal_set_hash: signal.signal_set_hash,
          reason: `No adapter found for channel: ${channel}`,
        });
        await markSignalProcessed(raw.id as string, 'SKIPPED');
        continue;
      }

      // Assemble gate contexts
      const agentNumber = signal.agent_number ?? 'UNASSIGNED';
      const [capacityCtx, freshnessCtx] = await Promise.all([
        assembleCapacityContext(agentNumber, channel),
        assembleFreshnessContext(signal.sovereign_company_id),
      ]);

      // Suppression context needs entity_id — we use a placeholder for now.
      // The real entity_id is resolved inside the pipeline at Step 5.
      // For pre-pipeline suppression check, use company-level data.
      const suppressionCtx = await assembleSuppressionContext(
        '00000000-0000-0000-0000-000000000000', // placeholder entity
        signal.sovereign_company_id,
        signal.lifecycle_phase,
        channel
      );

      // Run pipeline
      const pipelineResult = await runPipeline(signal, adapter, {
        capacity: capacityCtx,
        suppression: suppressionCtx,
        freshness: freshnessCtx,
      });

      result.processed++;

      if (pipelineResult.success) {
        result.succeeded++;
        await markSignalProcessed(raw.id as string, 'COMPLETED');
      } else {
        result.failed++;
        result.errors.push({
          signal_set_hash: signal.signal_set_hash,
          reason: pipelineResult.failure_reason ?? 'Unknown pipeline failure',
        });
        await markSignalProcessed(raw.id as string, 'FAILED');
      }
    } catch (err) {
      result.failed++;
      result.errors.push({
        signal_set_hash: (raw.signal_set_hash as string) ?? 'UNKNOWN',
        reason: err instanceof Error ? err.message : 'Unhandled exception',
      });
      await markSignalProcessed(raw.id as string, 'FAILED');
    }
  }

  console.log(`[LCS Cron] Batch complete: ${result.succeeded}/${result.total_signals} succeeded, ${result.failed} failed, ${result.skipped} skipped`);
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Internal Helper
// ═══════════════════════════════════════════════════════════════

async function markSignalProcessed(id: string, status: string): Promise<void> {
  await supabase
    .from('signal_queue')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .update({ status, processed_at: new Date().toISOString() })
    .eq('id', id);
}
