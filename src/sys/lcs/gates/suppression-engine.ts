import type { GateResult, SuppressionContext } from './types';

/**
 * Suppression Engine — enforces the 4-state suppression machine.
 *
 * State machine: ACTIVE → COOLED → PARKED → SUPPRESSED
 *   - ACTIVE: eligible for contact
 *   - COOLED: recently contacted, waiting for cooldown interval
 *   - PARKED: temporarily removed from outreach (manual or auto)
 *   - SUPPRESSED: permanently removed (never_contact, unsubscribe, hard bounce, complaint)
 *
 * Check order (fail-fast):
 *   1. Hard suppression flags (never_contact, unsubscribed, hard_bounced, complained)
 *   2. Suppression state machine (SUPPRESSED → PARKED → COOLED → ACTIVE)
 *   3. Per-recipient frequency cap (min days between contacts)
 *   4. Company-level weekly throttle
 *
 * IMO Position: Gate sits AFTER Step 1 (signal received) but BEFORE Step 3 (frame matching).
 *   Suppressed recipients never reach frame matching.
 *
 * What triggers this? Every signal that passed capacity gate.
 * How do we get it? App pipeline queries CET matviews for last contact + company sends.
 */
export function checkSuppression(ctx: SuppressionContext): GateResult {
  const GATE = 'SUPPRESSION';

  // ───────────────────────────────────────────────────────
  // 1. Hard suppression flags — permanent blocks
  // ───────────────────────────────────────────────────────

  if (ctx.never_contact) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient flagged never_contact — permanent suppression',
      blocked_event_type: 'COMPOSITION_BLOCKED',
    };
  }

  if (ctx.unsubscribed) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient unsubscribed — CAN-SPAM compliance',
      blocked_event_type: 'COMPOSITION_BLOCKED',
    };
  }

  if (ctx.hard_bounced) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient hard bounced — email permanently undeliverable',
      blocked_event_type: 'COMPOSITION_BLOCKED',
    };
  }

  if (ctx.complained) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient filed spam complaint — permanent suppression',
      blocked_event_type: 'COMPOSITION_BLOCKED',
    };
  }

  // ───────────────────────────────────────────────────────
  // 2. Suppression state machine
  // ───────────────────────────────────────────────────────

  if (ctx.suppression_state === 'SUPPRESSED') {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient in SUPPRESSED state',
      blocked_event_type: 'COMPOSITION_BLOCKED',
    };
  }

  if (ctx.suppression_state === 'PARKED') {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient in PARKED state — temporarily removed from outreach',
      blocked_event_type: 'COMPOSITION_BLOCKED',
    };
  }

  if (ctx.suppression_state === 'COOLED') {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: 'Recipient in COOLED state — waiting for cooldown interval',
      blocked_event_type: 'RECIPIENT_THROTTLED',
    };
  }

  // ───────────────────────────────────────────────────────
  // 3. Per-recipient frequency cap
  // ───────────────────────────────────────────────────────

  if (ctx.last_contact_at !== null) {
    const lastContact = new Date(ctx.last_contact_at);
    const now = new Date();
    const daysSinceContact = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceContact < ctx.min_contact_interval_days) {
      return {
        gate: GATE,
        verdict: 'BLOCK',
        reason: `Recipient contacted ${daysSinceContact.toFixed(1)} days ago — minimum interval is ${ctx.min_contact_interval_days} days`,
        blocked_event_type: 'RECIPIENT_THROTTLED',
      };
    }
  }

  // ───────────────────────────────────────────────────────
  // 4. Company-level weekly throttle
  // ───────────────────────────────────────────────────────

  if (ctx.company_sends_this_week >= ctx.company_weekly_cap) {
    return {
      gate: GATE,
      verdict: 'BLOCK',
      reason: `Company weekly cap reached: ${ctx.company_sends_this_week}/${ctx.company_weekly_cap}`,
      blocked_event_type: 'COMPANY_THROTTLED',
    };
  }

  // All checks passed — recipient is ACTIVE and eligible
  return {
    gate: GATE,
    verdict: 'PASS',
    reason: 'Recipient active, within frequency limits, company under cap',
  };
}
