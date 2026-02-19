import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type { LcsErr0Insert, OrbtAction } from '@/data/lcs';

/**
 * ERR0 Logger — append-only writes to lcs.err0 with ORBT 3-strike protocol.
 *
 * ORBT Protocol:
 *   Strike 1 → AUTO_RETRY (same channel, immediate retry)
 *   Strike 2 → ALT_CHANNEL (try alternate channel if eligible)
 *   Strike 3 → HUMAN_ESCALATION (flag for manual review)
 */

/**
 * Determine the ORBT action for a given strike number.
 */
export function getOrbtAction(strikeNumber: number): OrbtAction {
  switch (strikeNumber) {
    case 1: return 'AUTO_RETRY';
    case 2: return 'ALT_CHANNEL';
    case 3: return 'HUMAN_ESCALATION';
    default: return 'HUMAN_ESCALATION';
  }
}

/**
 * Count existing ORBT strikes for a communication_id.
 * Returns the NEXT strike number (1 if no prior strikes).
 */
export async function getNextStrikeNumber(communicationId: string): Promise<number> {
  try {
    const { data, error } = await lcsClient
      .from('err0')
      .select('orbt_strike_number')
      .eq('communication_id', communicationId)
      .not('orbt_strike_number', 'is', null)
      .order('orbt_strike_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 1;
    }

    return Math.min((data[0].orbt_strike_number as number) + 1, 3);
  } catch {
    return 1;
  }
}

/**
 * Check if an alternate channel is eligible for ORBT Strike 2.
 */
export function checkAltChannelEligible(currentChannel: string): {
  eligible: boolean;
  reason: string;
} {
  if (currentChannel === 'MG') {
    return { eligible: true, reason: 'Mailgun failed — HeyReach (LinkedIn) available as alternate' };
  }
  if (currentChannel === 'HR') {
    return { eligible: true, reason: 'HeyReach failed — Mailgun (email) available as alternate' };
  }
  return { eligible: false, reason: 'Sales Handoff has no alternate channel' };
}

/**
 * Log an error to lcs.err0.
 */
export async function logErr0(error: LcsErr0Insert): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: dbError } = await lcsClient
      .from('err0')
      .insert(error as Record<string, unknown>);

    if (dbError) {
      console.error('[ERR0 Logger] Insert failed:', dbError.message);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ERR0 Logger] Exception:', message);
    return { success: false, error: message };
  }
}
