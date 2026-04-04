import { runPipeline } from '@/app/lcs';
import type { SignalInput } from '@/app/lcs';
import { resolveAdapter } from '@/app/lcs/adapters';
import type { Channel } from '@/data/lcs';
import {
  assembleCapacityContext,
  assembleSuppressionContext,
  assembleFreshnessContext
} from './context-assembler';
import { lcsClient } from '@/data/integrations/supabase/lcs-client';

/**
 * LCS Cron Runner — scheduled pipeline executor.
 */

interface CronResult {
  total_signals: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ signal_set_hash: string; reason: string }>;
}

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

  const { data: pendingSignals, error: fetchError } = await lcsClient
    .from('signal_queue')
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

  for (const raw of pendingSignals) {
    try {
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

      const channel: Channel = signal.preferred_channel ?? defaultChannel;

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

      const agentNumber = signal.agent_number ?? 'UNASSIGNED';
      const [capacityCtx, freshnessCtx] = await Promise.all([
        assembleCapacityContext(agentNumber, channel),
        assembleFreshnessContext(signal.sovereign_company_id),
      ]);

      const suppressionCtx = await assembleSuppressionContext(
        '00000000-0000-0000-0000-000000000000',
        signal.sovereign_company_id,
        signal.lifecycle_phase,
        channel
      );

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

async function markSignalProcessed(id: string, status: string): Promise<void> {
  await lcsClient
    .from('signal_queue')
    .update({ status, processed_at: new Date().toISOString() })
    .eq('id', id);
}
