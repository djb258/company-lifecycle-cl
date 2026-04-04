import type { GateResult, CapacityGateContext } from './types';

/**
 * Capacity Gate — enforces bi-directional capacity limits.
 *
 * Check order (fail-fast):
 *   1. Founder calendar gate (global) — is the founder available?
 *   2. Adapter health gate — is the adapter healthy enough to send?
 *   3. Adapter daily cap — has the adapter hit its daily limit?
 *   4. Agent territory cap — has this agent's territory hit its daily limit?
 *
 * IMO Position: Gate sits BEFORE Pipeline Step 1 (signal intake).
 *   If capacity is blocked, the signal is dropped before entering the pipeline.
 *
 * What triggers this? Every inbound signal runs through capacity check first.
 * How do we get it? App pipeline queries adapter_registry + territory config + calendar status.
 */
export function checkCapacity(ctx: CapacityGateContext): GateResult {
  const GATE = 'CAPACITY';

  // 1. Founder calendar — global kill switch
  if (!ctx.founder_calendar_available) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Founder calendar unavailable — all sends paused',
      blocked_event_type: 'SIGNAL_DROPPED',
    };
  }

  // 2. Adapter health — don't send through paused adapters
  if (ctx.adapter_health_status === 'PAUSED') {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: `Adapter paused — health_status: ${ctx.adapter_health_status}`,
      blocked_event_type: 'SIGNAL_DROPPED',
    };
  }

  // 3. Adapter daily cap
  if (ctx.adapter_daily_cap !== null && ctx.adapter_sent_today >= ctx.adapter_daily_cap) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: `Adapter daily cap reached: ${ctx.adapter_sent_today}/${ctx.adapter_daily_cap}`,
      blocked_event_type: 'SIGNAL_DROPPED',
    };
  }

  // 4. Agent territory daily cap
  if (ctx.agent_sent_today >= ctx.agent_daily_cap) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: `Agent ${ctx.agent_number} territory cap reached: ${ctx.agent_sent_today}/${ctx.agent_daily_cap}`,
      blocked_event_type: 'SIGNAL_DROPPED',
    };
  }

  // All checks passed
  return {
    gate: GATE,
    verdict: 'PASS',
    reason: 'Capacity available',
  };
}
