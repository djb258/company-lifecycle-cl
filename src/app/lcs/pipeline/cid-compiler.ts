import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type {
  LcsCidInsert, CompilationStatus, IntelligenceTier,
  LifecyclePhase, Lane, EntityType, FrameType,
  CidCompilationRule
} from '@/data/lcs';
import { mintCommunicationId } from '../id-minter';
import {
  checkCapacity, checkFreshness,
  type CapacityGateContext, type FreshnessGateContext
} from '@/sys/lcs/gates';

/**
 * CID Compiler — Phase 2 of the CID→SID→MID pipeline.
 *
 * Reads pending signals from signal_queue, collects intelligence,
 * matches a frame, mints a communication_id, and writes to lcs.cid.
 *
 * Data flow:
 *   signal_queue (PENDING) → CID Compiler → lcs.cid (COMPILED|FAILED|BLOCKED)
 *
 * This replaces Steps 1-4 of the legacy monolithic orchestrator.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface SignalQueueRow {
  id: string;
  signal_set_hash: string;
  signal_category: string;
  sovereign_company_id: string;
  lifecycle_phase: LifecyclePhase;
  preferred_channel: string | null;
  preferred_lane: string | null;
  agent_number: string | null;
  signal_data: Record<string, unknown>;
  source_hub: string;
  source_signal_id: string | null;
}

interface CompilationResult {
  communication_id: string | null;
  compilation_status: CompilationStatus;
  compilation_reason: string | null;
  signal_queue_id: string;
}

interface CidCompilerBatchResult {
  total: number;
  compiled: number;
  failed: number;
  blocked: number;
  results: CompilationResult[];
}

// ═══════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════

/**
 * Compile a batch of pending signals into CID rows.
 *
 * @param batchSize - Max signals to process per invocation
 */
export async function runCidCompiler(batchSize: number = 50): Promise<CidCompilerBatchResult> {
  const result: CidCompilerBatchResult = {
    total: 0,
    compiled: 0,
    failed: 0,
    blocked: 0,
    results: [],
  };

  // Fetch pending signals
  const { data: signals, error: fetchError } = await lcsClient
    .from('signal_queue')
    .select('*')
    .eq('status', 'PENDING')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError || !signals) {
    console.error('[CID Compiler] Failed to fetch pending signals:', fetchError?.message);
    return result;
  }

  result.total = signals.length;

  if (signals.length === 0) {
    console.log('[CID Compiler] No pending signals.');
    return result;
  }

  for (const raw of signals) {
    const signal = raw as unknown as SignalQueueRow;
    const compResult = await compileSingleSignal(signal);
    result.results.push(compResult);

    switch (compResult.compilation_status) {
      case 'COMPILED': result.compiled++; break;
      case 'FAILED': result.failed++; break;
      case 'BLOCKED': result.blocked++; break;
    }

    // Mark signal_queue entry based on compilation outcome
    const queueStatus = compResult.compilation_status === 'COMPILED' ? 'COMPLETED'
      : compResult.compilation_status === 'BLOCKED' ? 'SKIPPED'
      : 'FAILED';
    await markSignalProcessed(signal.id, queueStatus);
  }

  console.log(
    `[CID Compiler] Batch complete: ${result.compiled} compiled, ` +
    `${result.failed} failed, ${result.blocked} blocked out of ${result.total}`
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════
// Single Signal Compilation
// ═══════════════════════════════════════════════════════════════

async function compileSingleSignal(signal: SignalQueueRow): Promise<CompilationResult> {
  const agentNumber = signal.agent_number ?? 'UNASSIGNED';
  const lane: Lane = (signal.preferred_lane as Lane) ?? 'MAIN';

  try {
    // --- Step 1: Validate signal ---
    if (!signal.sovereign_company_id || !signal.signal_set_hash || !signal.lifecycle_phase) {
      return await writeCidRow(signal, null, 'FAILED', 'Missing required signal fields', {
        agentNumber, lane, entityType: 'slot', entityId: null,
        frameId: null, intelligenceTier: null,
      });
    }

    // --- Step 2: Capacity gate ---
    const capacityCtx = await assembleCapacityContext(agentNumber, signal.preferred_channel);
    const capacityResult = checkCapacity(capacityCtx);
    if (capacityResult.verdict === 'BLOCK') {
      return await writeCidRow(signal, null, 'BLOCKED', `Capacity gate: ${capacityResult.reason}`, {
        agentNumber, lane, entityType: 'slot', entityId: null,
        frameId: null, intelligenceTier: null,
      });
    }

    // --- Step 3: Collect intelligence ---
    const { data: intel } = await lcsClient
      .from('v_company_intelligence')
      .select('*')
      .eq('sovereign_company_id', signal.sovereign_company_id)
      .single();

    const intelligenceTier: IntelligenceTier = (intel?.intelligence_tier as IntelligenceTier) ?? 5;

    // --- Step 4: Freshness gate ---
    const freshnessCtx = await assembleFreshnessContext(signal.sovereign_company_id, intelligenceTier);
    const freshnessResult = checkFreshness(freshnessCtx);
    if (freshnessResult.verdict === 'BLOCK') {
      return await writeCidRow(signal, null, 'BLOCKED', `Freshness gate: ${freshnessResult.reason}`, {
        agentNumber, lane, entityType: 'slot', entityId: null,
        frameId: null, intelligenceTier,
      });
    }

    const effectiveTier = freshnessResult.verdict === 'DOWNGRADE' && freshnessResult.downgraded_tier
      ? freshnessResult.downgraded_tier
      : intelligenceTier;

    // --- Step 5: Match frame ---
    const { data: frames } = await lcsClient
      .from('frame_registry')
      .select('*')
      .eq('lifecycle_phase', signal.lifecycle_phase)
      .eq('is_active', true)
      .lte('tier', effectiveTier)
      .order('tier', { ascending: true })
      .limit(1);

    if (!frames || frames.length === 0) {
      return await writeCidRow(signal, null, 'FAILED',
        `No eligible frame for phase=${signal.lifecycle_phase}, tier<=${effectiveTier}`, {
          agentNumber, lane, entityType: 'slot', entityId: null,
          frameId: null, intelligenceTier: effectiveTier,
        });
    }

    const frame = frames[0];
    const frameId = frame.frame_id as string;
    const compilationRule = (frame.cid_compilation_rule as CidCompilationRule) ?? 'STANDARD';

    // --- Step 6: Resolve entity (for CID record) ---
    let entityId: string | null = null;
    let entityType: EntityType = 'slot';

    if (intel) {
      if (intel.ceo_entity_id) {
        entityId = intel.ceo_entity_id as string;
      } else if (intel.cfo_entity_id) {
        entityId = intel.cfo_entity_id as string;
      } else if (intel.hr_entity_id) {
        entityId = intel.hr_entity_id as string;
      }
    }

    // STRICT compilation rule requires entity resolution
    if (compilationRule === 'STRICT' && !entityId) {
      return await writeCidRow(signal, null, 'FAILED',
        'STRICT compilation: no entity resolved from intelligence', {
          agentNumber, lane, entityType, entityId,
          frameId, intelligenceTier: effectiveTier,
        });
    }

    // LITE allows compilation even without entity (fallback UUID)
    if (!entityId) {
      entityId = '00000000-0000-0000-0000-000000000000';
    }

    // --- Step 7: Mint communication_id ---
    const communicationId = mintCommunicationId(signal.lifecycle_phase);

    // --- Step 8: Write CID row ---
    return await writeCidRow(signal, communicationId, 'COMPILED', null, {
      agentNumber, lane, entityType, entityId,
      frameId, intelligenceTier: effectiveTier,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unhandled compilation error';
    console.error(`[CID Compiler] Error compiling signal ${signal.id}:`, reason);

    return await writeCidRow(signal, null, 'FAILED', reason, {
      agentNumber, lane, entityType: 'slot', entityId: null,
      frameId: null, intelligenceTier: null,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// CID Row Writer
// ═══════════════════════════════════════════════════════════════

interface CidContext {
  agentNumber: string;
  lane: Lane;
  entityType: EntityType;
  entityId: string | null;
  frameId: string | null;
  intelligenceTier: IntelligenceTier | null;
}

async function writeCidRow(
  signal: SignalQueueRow,
  communicationId: string | null,
  status: CompilationStatus,
  reason: string | null,
  ctx: CidContext
): Promise<CompilationResult> {
  // For FAILED/BLOCKED without a communication_id, mint a placeholder for the PK
  const cidValue = communicationId ?? mintCommunicationId(signal.lifecycle_phase);

  const row: LcsCidInsert = {
    communication_id: cidValue,
    sovereign_company_id: signal.sovereign_company_id,
    entity_type: ctx.entityType,
    entity_id: ctx.entityId ?? '00000000-0000-0000-0000-000000000000',
    signal_set_hash: signal.signal_set_hash,
    signal_queue_id: signal.id,
    frame_id: ctx.frameId ?? 'UNRESOLVED',
    lifecycle_phase: signal.lifecycle_phase,
    lane: ctx.lane,
    agent_number: ctx.agentNumber,
    intelligence_tier: ctx.intelligenceTier,
    compilation_status: status,
    compilation_reason: reason,
  };

  const { error } = await lcsClient
    .from('cid')
    .insert(row as Record<string, unknown>);

  if (error) {
    console.error('[CID Compiler] Failed to write CID row:', error.message);
  }

  return {
    communication_id: status === 'COMPILED' ? cidValue : null,
    compilation_status: status,
    compilation_reason: reason,
    signal_queue_id: signal.id,
  };
}

// ═══════════════════════════════════════════════════════════════
// Context Assemblers (lightweight, scoped to CID compiler needs)
// ═══════════════════════════════════════════════════════════════

async function assembleCapacityContext(
  agentNumber: string,
  preferredChannel: string | null
): Promise<CapacityGateContext> {
  const channel = preferredChannel ?? 'MG';

  const { data: adapter } = await lcsClient
    .from('adapter_registry')
    .select('daily_cap, sent_today, health_status')
    .eq('adapter_type', channel)
    .single();

  return {
    founder_calendar_clear: true,
    agent_daily_cap: 200,
    agent_sent_today: 0,
    adapter_daily_cap: adapter?.daily_cap as number ?? 150,
    adapter_sent_today: adapter?.sent_today as number ?? 0,
    adapter_health: (adapter?.health_status as string) ?? 'HEALTHY',
  };
}

async function assembleFreshnessContext(
  companyId: string,
  currentTier: IntelligenceTier
): Promise<FreshnessGateContext> {
  return {
    people_data_fetched_at: null,
    dol_data_fetched_at: null,
    blog_data_fetched_at: null,
    freshness_window_days: 30,
    current_tier: currentTier,
    frame_required_fields: [],
    frame_fallback_id: null,
  };
}

async function markSignalProcessed(id: string, status: string): Promise<void> {
  await lcsClient
    .from('signal_queue')
    .update({ status, processed_at: new Date().toISOString() })
    .eq('id', id);
}
