import type { GateResult, FreshnessGateContext, SubHubFreshness } from './types';
import type { IntelligenceTier } from '@/data/lcs';

/**
 * Freshness Gate — enforces data freshness requirements.
 *
 * Rules (from doctrine):
 *   - People sub-hub stale = HARD BLOCK (no contact without fresh contact data)
 *   - DOL sub-hub stale = tier downgrade
 *   - Blog sub-hub stale = tier downgrade
 *   - Sitemap sub-hub stale = tier downgrade
 *   - Multiple stale sub-hubs = cumulative tier downgrade
 *   - If downgraded tier can't satisfy frame required_fields → BLOCK or cascade to fallback_frame
 *
 * IMO Position: Gate sits AFTER Step 2 (intelligence collected) but BEFORE Step 3 (frame matching).
 *   Stale data either blocks the pipeline or downgrades the available intelligence tier.
 *
 * What triggers this? Every signal that passed suppression check, after intelligence is collected.
 * How do we get it? App pipeline reads data_fetched_at from intelligence snapshot + signal registry.
 */
export function checkFreshness(ctx: FreshnessGateContext): GateResult {
  const GATE = 'FRESHNESS';

  // ───────────────────────────────────────────────────────
  // 1. Check each sub-hub for staleness
  // ───────────────────────────────────────────────────────

  const staleSubHubs: string[] = [];
  let peopleStale = false;

  for (const sh of ctx.sub_hub_freshness) {
    if (isStale(sh)) {
      staleSubHubs.push(sh.sub_hub);
      if (sh.sub_hub === 'PEOPLE') {
        peopleStale = true;
      }
    }
  }

  // ───────────────────────────────────────────────────────
  // 2. People stale = HARD BLOCK (non-negotiable)
  // ───────────────────────────────────────────────────────

  if (peopleStale) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'People sub-hub data is stale — hard block, no contact without fresh contact data',
      blocked_event_type: 'DATA_STALE',
    };
  }

  // ───────────────────────────────────────────────────────
  // 3. No stale sub-hubs = PASS at current tier
  // ───────────────────────────────────────────────────────

  if (staleSubHubs.length === 0) {
    return {
      gate: GATE,
      verdict: 'PASS',
      reason: 'All sub-hub data is fresh',
    };
  }

  // ───────────────────────────────────────────────────────
  // 4. Other sub-hubs stale = tier downgrade
  //    Each stale non-People sub-hub downgrades tier by 1
  //    (capped at tier 5)
  // ───────────────────────────────────────────────────────

  const downgradeAmount = staleSubHubs.length;  // People already excluded above
  const newTier = Math.min(ctx.current_tier + downgradeAmount, 5) as IntelligenceTier;

  // If tier didn't actually change (already at 5), just pass
  if (newTier === ctx.current_tier) {
    return {
      gate: GATE,
      verdict: 'PASS',
      reason: `Sub-hubs stale (${staleSubHubs.join(', ')}) but already at tier ${ctx.current_tier} — no further downgrade`,
    };
  }

  // ───────────────────────────────────────────────────────
  // 5. Check if downgraded tier can still satisfy frame requirements
  //    If frame has required_fields that need higher-tier data, and no fallback exists → BLOCK
  // ───────────────────────────────────────────────────────

  // If the frame has no required fields, downgrade is safe
  if (ctx.frame_required_fields.length === 0) {
    return {
      gate: GATE,
      verdict: 'DOWNGRADE',
      reason: `Stale sub-hubs: ${staleSubHubs.join(', ')}. Tier downgraded ${ctx.current_tier} → ${newTier}. Frame has no required fields — safe to proceed.`,
      downgraded_tier: newTier,
    };
  }

  // If a fallback frame exists, the app layer can cascade to it
  if (ctx.frame_fallback_id !== null) {
    return {
      gate: GATE,
      verdict: 'DOWNGRADE',
      reason: `Stale sub-hubs: ${staleSubHubs.join(', ')}. Tier downgraded ${ctx.current_tier} → ${newTier}. Fallback frame available: ${ctx.frame_fallback_id}`,
      downgraded_tier: newTier,
    };
  }

  // No fallback + required fields + downgraded tier = the frame can't be satisfied
  // This is a BLOCK because we can't send a partially populated message
  return {
    gate: GATE,
    verdict: 'BLOCK',
    reason: `Stale sub-hubs: ${staleSubHubs.join(', ')}. Tier downgraded ${ctx.current_tier} → ${newTier}. Frame requires fields (${ctx.frame_required_fields.join(', ')}) with no fallback — cannot proceed.`,
    blocked_event_type: 'FRAME_INELIGIBLE',
  };
}

// ═══════════════════════════════════════════════════════════════
// Internal Helper
// ═══════════════════════════════════════════════════════════════

/** Check if a sub-hub's data has exceeded its freshness window */
function isStale(sh: SubHubFreshness): boolean {
  // Never fetched = stale
  if (sh.data_fetched_at === null) return true;

  const fetchedAt = new Date(sh.data_fetched_at);
  const now = new Date();
  const daysSinceFetch = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceFetch > sh.freshness_window_days;
}
