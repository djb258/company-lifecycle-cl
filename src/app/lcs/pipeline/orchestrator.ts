import type { SignalInput, PipelineState, PipelineResult, StepResult } from './types';
import type { LcsAdapter } from '../adapters/types';
import type { LcsEventInsert, LcsErr0Insert } from '@/data/lcs';
import {
  checkCapacity, checkSuppression, checkFreshness,
  type CapacityGateContext, type SuppressionContext, type FreshnessGateContext
} from '@/sys/lcs/gates';
import { logCetEvent } from '../cet-logger';
import { logErr0, getNextStrikeNumber, getOrbtAction, checkAltChannelEligible } from '../err0-logger';
import {
  signalIntake, collectIntelligence, matchFrame,
  mintIds, resolveAudience, callAdapter, logDelivery
} from './steps';

/**
 * LCS Pipeline Orchestrator — runs the 9-step IMO pipeline.
 *
 * The orchestrator is the HUB of the bicycle wheel.
 * Spokes deliver signals IN, the hub processes through 9 steps, spokes deliver messages OUT.
 *
 * Gate integration points:
 *   - CAPACITY gate: after Step 1, before Step 2
 *   - FRESHNESS gate: after Step 2, before Step 3
 *   - SUPPRESSION gate: after Step 4, before Step 5 (needs intelligence for recipient lookup)
 *
 * What triggers this? An ingress spoke calls runPipeline() with a SignalInput.
 * How do we get it? The spoke pushes the signal; the orchestrator owns the rest.
 *
 * @param signal — Raw signal from an ingress spoke
 * @param adapter — The delivery adapter to use (injected, not resolved internally)
 * @param gateContexts — Pre-fetched context for all three gates
 */
export async function runPipeline(
  signal: SignalInput,
  adapter: LcsAdapter,
  gateContexts: {
    capacity: CapacityGateContext;
    suppression: SuppressionContext;
    freshness: Omit<FreshnessGateContext, 'frame_required_fields' | 'frame_fallback_id'>;
  }
): Promise<PipelineResult> {
  // Initialize pipeline state
  const state: PipelineState = {
    signal,
    agent_number: signal.agent_number ?? 'UNASSIGNED',
    lane: signal.preferred_lane ?? 'MAIN',
    intelligence: null,
    intelligence_tier: null,
    frame_id: null,
    frame_type: null,
    frame_required_fields: [],
    frame_fallback_id: null,
    communication_id: null,
    entity_type: null,
    entity_id: null,
    recipient_email: null,
    recipient_linkedin_url: null,
    sender_identity: null,
    sender_email: null,
    sender_domain: null,
    message_run_id: null,
    channel: null,
    adapter_type: null,
    adapter_response: null,
    delivery_status: null,
    gate_results: [],
    failed: false,
    failure_step: null,
    failure_reason: null,
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Signal Intake
  // ═══════════════════════════════════════════════════════════
  const step1 = await signalIntake(state);
  await logStep(step1, state);
  if (!step1.success) return buildResult(state, 1);

  // ═══════════════════════════════════════════════════════════
  // GATE: Capacity Check (between Step 1 and Step 2)
  // ═══════════════════════════════════════════════════════════
  const capacityResult = checkCapacity(gateContexts.capacity);
  state.gate_results.push(capacityResult);
  if (capacityResult.verdict === 'BLOCK') {
    state.failed = true;
    state.failure_reason = capacityResult.reason;
    await logGateBlock(state, capacityResult);
    return buildResult(state, 1);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Collect Intelligence
  // ═══════════════════════════════════════════════════════════
  const step2 = await collectIntelligence(state);
  await logStep(step2, state);
  if (!step2.success) return buildResult(state, 2);

  // ═══════════════════════════════════════════════════════════
  // GATE: Freshness Check (between Step 2 and Step 3)
  // Needs frame_required_fields — but frame isn't matched yet.
  // Pass empty required_fields for initial check; re-check after Step 3 if DOWNGRADE.
  // ═══════════════════════════════════════════════════════════
  const freshnessCtx: FreshnessGateContext = {
    ...gateContexts.freshness,
    frame_required_fields: [],  // not yet known
    frame_fallback_id: null,
  };
  const freshnessResult = checkFreshness(freshnessCtx);
  state.gate_results.push(freshnessResult);
  if (freshnessResult.verdict === 'BLOCK') {
    state.failed = true;
    state.failure_reason = freshnessResult.reason;
    await logGateBlock(state, freshnessResult);
    return buildResult(state, 2);
  }
  if (freshnessResult.verdict === 'DOWNGRADE' && freshnessResult.downgraded_tier) {
    state.intelligence_tier = freshnessResult.downgraded_tier;
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: Match Frame
  // ═══════════════════════════════════════════════════════════
  const step3 = await matchFrame(state);
  await logStep(step3, state);
  if (!step3.success) return buildResult(state, 3);

  // Post-frame freshness re-check (now we have required_fields)
  if (freshnessResult.verdict === 'DOWNGRADE') {
    const recheck: FreshnessGateContext = {
      ...gateContexts.freshness,
      current_tier: state.intelligence_tier!,
      frame_required_fields: state.frame_required_fields,
      frame_fallback_id: state.frame_fallback_id,
    };
    const recheckResult = checkFreshness(recheck);
    if (recheckResult.verdict === 'BLOCK') {
      state.gate_results.push(recheckResult);
      state.failed = true;
      state.failure_reason = recheckResult.reason;
      await logGateBlock(state, recheckResult);
      return buildResult(state, 3);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Mint IDs (communication_id)
  // ═══════════════════════════════════════════════════════════
  const step4 = await mintIds(state);
  await logStep(step4, state);
  if (!step4.success) return buildResult(state, 4);

  // ═══════════════════════════════════════════════════════════
  // GATE: Suppression Check (between Step 4 and Step 5)
  // ═══════════════════════════════════════════════════════════
  const suppressionResult = checkSuppression(gateContexts.suppression);
  state.gate_results.push(suppressionResult);
  if (suppressionResult.verdict === 'BLOCK') {
    state.failed = true;
    state.failure_reason = suppressionResult.reason;
    await logGateBlock(state, suppressionResult);
    return buildResult(state, 4);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Resolve Audience
  // ═══════════════════════════════════════════════════════════
  const step5 = await resolveAudience(state);
  await logStep(step5, state);
  if (!step5.success) return buildResult(state, 5);

  // ═══════════════════════════════════════════════════════════
  // STEP 6: Call Adapter (mints message_run_id + sends)
  // ═══════════════════════════════════════════════════════════
  const step6 = await callAdapter(state, adapter);
  await logStep(step6, state);
  if (!step6.success) {
    await handleError(state);
    return buildResult(state, 6);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 7: Log Delivery Result
  // ═══════════════════════════════════════════════════════════
  const step7 = await logDelivery(state);
  await logStep(step7, state);

  // If delivery failed, trigger ORBT error handling
  if (state.adapter_response && !state.adapter_response.success) {
    await handleError(state);
  }

  return buildResult(state, 7);
}

// ═══════════════════════════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════════════════════════

/** Log a step's CET event */
async function logStep(result: StepResult, state: PipelineState): Promise<void> {
  const event: LcsEventInsert = {
    communication_id: state.communication_id ?? `PENDING-STEP-${result.step_number}`,
    message_run_id: state.message_run_id ?? `PENDING-STEP-${result.step_number}`,
    sovereign_company_id: state.signal.sovereign_company_id,
    entity_type: state.entity_type ?? 'slot',
    entity_id: state.entity_id ?? '00000000-0000-0000-0000-000000000000',
    signal_set_hash: state.signal.signal_set_hash,
    frame_id: state.frame_id ?? 'UNRESOLVED',
    adapter_type: state.adapter_type ?? 'UNRESOLVED',
    channel: state.channel ?? 'MG',
    delivery_status: state.delivery_status ?? 'PENDING',
    lifecycle_phase: state.signal.lifecycle_phase,
    event_type: result.event_type,
    lane: state.lane,
    agent_number: state.agent_number,
    step_number: result.step_number,
    step_name: result.step_name,
    payload: result.payload ?? null,
    adapter_response: state.adapter_response?.raw_response ?? null,
    intelligence_tier: state.intelligence_tier ?? null,
    sender_identity: state.sender_identity ?? null,
  };

  await logCetEvent(event);
}

/** Log a gate BLOCK as a CET event */
async function logGateBlock(state: PipelineState, gate: { blocked_event_type?: string; reason: string }): Promise<void> {
  const event: LcsEventInsert = {
    communication_id: state.communication_id ?? 'GATE-BLOCKED',
    message_run_id: state.message_run_id ?? 'GATE-BLOCKED',
    sovereign_company_id: state.signal.sovereign_company_id,
    entity_type: state.entity_type ?? 'slot',
    entity_id: state.entity_id ?? '00000000-0000-0000-0000-000000000000',
    signal_set_hash: state.signal.signal_set_hash,
    frame_id: state.frame_id ?? 'UNRESOLVED',
    adapter_type: state.adapter_type ?? 'UNRESOLVED',
    channel: state.channel ?? 'MG',
    delivery_status: 'FAILED',
    lifecycle_phase: state.signal.lifecycle_phase,
    event_type: (gate.blocked_event_type ?? 'SIGNAL_DROPPED') as LcsEventInsert['event_type'],
    lane: state.lane,
    agent_number: state.agent_number,
    step_number: 0,
    step_name: 'Gate Block',
    payload: { gate_reason: gate.reason },
    adapter_response: null,
    intelligence_tier: state.intelligence_tier ?? null,
    sender_identity: state.sender_identity ?? null,
  };

  await logCetEvent(event);
}

/** Handle pipeline errors with ORBT protocol */
async function handleError(state: PipelineState): Promise<void> {
  const commId = state.communication_id;
  const strikeNumber = commId ? await getNextStrikeNumber(commId) : 1;
  const orbtAction = getOrbtAction(strikeNumber);
  const altChannel = state.channel ? checkAltChannelEligible(state.channel) : { eligible: false, reason: 'No channel' };

  const err: LcsErr0Insert = {
    message_run_id: state.message_run_id ?? 'UNKNOWN',
    communication_id: commId ?? null,
    sovereign_company_id: state.signal.sovereign_company_id,
    failure_type: 'ADAPTER_ERROR',
    failure_message: state.failure_reason ?? state.adapter_response?.error_message ?? 'Unknown failure',
    lifecycle_phase: state.signal.lifecycle_phase,
    adapter_type: state.adapter_type ?? null,
    orbt_strike_number: strikeNumber,
    orbt_action_taken: orbtAction,
    orbt_alt_channel_eligible: altChannel.eligible,
    orbt_alt_channel_reason: altChannel.reason,
  };

  await logErr0(err);
}

/** Build the final pipeline result */
function buildResult(state: PipelineState, stepsCompleted: number): PipelineResult {
  return {
    success: !state.failed,
    communication_id: state.communication_id,
    message_run_id: state.message_run_id,
    delivery_status: state.delivery_status,
    steps_completed: stepsCompleted,
    gate_results: state.gate_results,
    failure_reason: state.failure_reason,
  };
}
