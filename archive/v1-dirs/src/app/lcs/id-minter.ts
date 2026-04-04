import { ulid } from 'ulid';
import type { LifecyclePhase, Channel } from '@/data/lcs';
import { PHASE_CODE_MAP, isValidCommunicationId, isValidMessageRunId } from '@/data/lcs';
import type { CommunicationId, MessageRunId } from '@/data/lcs';

/**
 * LCS ID Minter — sole authority for minting communication_id and message_run_id.
 *
 * Doctrine: LCS_ID_MODEL.md v2.2.0
 * - communication_id minted at Pipeline Step 4
 * - message_run_id minted at Pipeline Step 6
 * - Both IDs are immutable after creation
 * - Nothing external mints these IDs
 *
 * What triggers this? Pipeline steps 4 and 6.
 * How do we get it? ULID library generates the unique suffix. Phase + date + channel are pipeline state.
 */

/**
 * Mint a communication_id.
 * Format: LCS-{PHASE_CODE}-{YYYYMMDD}-{ULID}
 * Called at Pipeline Step 4.
 */
export function mintCommunicationId(phase: LifecyclePhase): CommunicationId {
  const phaseCode = PHASE_CODE_MAP[phase];
  const dateStr = formatDateYYYYMMDD(new Date());
  const ulidStr = ulid();

  const id = `LCS-${phaseCode}-${dateStr}-${ulidStr}`;

  // Validate our own output (defensive — catches format bugs early)
  if (!isValidCommunicationId(id)) {
    throw new Error(`ID Minter produced invalid communication_id: ${id}`);
  }

  return id as CommunicationId;
}

/**
 * Mint a message_run_id.
 * Format: RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}
 * Called at Pipeline Step 6.
 *
 * @param communicationId - The communication_id this run belongs to
 * @param channel - Delivery channel (MG, HR, SH)
 * @param attempt - Attempt number (1-999), zero-padded to 3 digits
 */
export function mintMessageRunId(
  communicationId: string,
  channel: Channel,
  attempt: number
): MessageRunId {
  const attemptStr = String(attempt).padStart(3, '0');
  const id = `RUN-${communicationId}-${channel}-${attemptStr}`;

  // Validate our own output
  if (!isValidMessageRunId(id)) {
    throw new Error(`ID Minter produced invalid message_run_id: ${id}`);
  }

  return id as MessageRunId;
}

// ═══════════════════════════════════════════════════════════════
// Internal Helper
// ═══════════════════════════════════════════════════════════════

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}
