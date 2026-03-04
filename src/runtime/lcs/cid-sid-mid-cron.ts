import { runCidCompiler } from '@/app/lcs/pipeline/cid-compiler';
import { runSidWorker } from '@/app/lcs/pipeline/sid-worker';
import { runMidEngine } from '@/app/lcs/pipeline/mid-engine';
import type { Channel } from '@/data/lcs';

/**
 * CID→SID→MID Cron Runner — orchestrates the three-phase pipeline.
 *
 * Runs CID compiler, then SID worker, then MID engine in sequence.
 * Each phase processes a batch of its input and produces output for the next phase.
 *
 * Scheduling (pg_cron or external):
 *   - Business hours: Every 15 minutes, Mon-Fri
 *   - Matches existing lcs-signal-bridge schedule
 *
 * This replaces the legacy cron-runner.ts which called the monolithic orchestrator.
 */

interface PipelineCronResult {
  cid: { total: number; compiled: number; failed: number; blocked: number };
  sid: { total: number; constructed: number; failed: number; blocked: number };
  mid: { total: number; delivered: number; failed: number; blocked: number };
  duration_ms: number;
}

/**
 * Run the full CID→SID→MID pipeline cron cycle.
 *
 * @param batchSize - Max items per phase
 * @param defaultChannel - Default delivery channel
 */
export async function runCidSidMidCron(
  batchSize: number = 50,
  defaultChannel: Channel = 'MG'
): Promise<PipelineCronResult> {
  const start = Date.now();

  console.log('[CID-SID-MID Cron] Starting pipeline cycle...');

  // Phase 1: CID Compiler — signal_queue → lcs.cid
  const cidResult = await runCidCompiler(batchSize);

  // Phase 2: SID Worker — lcs.cid (COMPILED) → lcs.sid_output
  const sidResult = await runSidWorker(batchSize);

  // Phase 3: MID Engine — lcs.sid_output (CONSTRUCTED) → lcs.mid_sequence_state + lcs.event
  const midResult = await runMidEngine(batchSize, defaultChannel);

  const duration = Date.now() - start;

  console.log(
    `[CID-SID-MID Cron] Cycle complete in ${duration}ms: ` +
    `CID=${cidResult.compiled}/${cidResult.total}, ` +
    `SID=${sidResult.constructed}/${sidResult.total}, ` +
    `MID=${midResult.delivered}/${midResult.total}`
  );

  return {
    cid: {
      total: cidResult.total,
      compiled: cidResult.compiled,
      failed: cidResult.failed,
      blocked: cidResult.blocked,
    },
    sid: {
      total: sidResult.total,
      constructed: sidResult.constructed,
      failed: sidResult.failed,
      blocked: sidResult.blocked,
    },
    mid: {
      total: midResult.total,
      delivered: midResult.delivered,
      failed: midResult.failed,
      blocked: midResult.blocked,
    },
    duration_ms: duration,
  };
}
