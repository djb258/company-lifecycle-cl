import type { PhaseCode, Channel } from './types/enums';

// ═══════════════════════════════════════════════════════════════
// ID Format Constants — match SQL CHECK constraints exactly
// ═══════════════════════════════════════════════════════════════

/** Regex for communication_id — matches SQL CHECK constraint */
export const COMMUNICATION_ID_REGEX = /^LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}$/;

/** Regex for message_run_id — matches SQL CHECK constraint */
export const MESSAGE_RUN_ID_REGEX = /^RUN-LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}-(MG|HR|SH)-\d{3}$/;

// ═══════════════════════════════════════════════════════════════
// ID Branded Types
// ═══════════════════════════════════════════════════════════════

/** Branded type for communication_id */
export type CommunicationId = string & { readonly __brand: 'CommunicationId' };

/** Branded type for message_run_id */
export type MessageRunId = string & { readonly __brand: 'MessageRunId' };

// ═══════════════════════════════════════════════════════════════
// Phase Code Mapping
// ═══════════════════════════════════════════════════════════════

export const PHASE_CODE_MAP: Record<'OUTREACH' | 'SALES' | 'CLIENT', PhaseCode> = {
  OUTREACH: 'OUT',
  SALES: 'SAL',
  CLIENT: 'CLI',
} as const;

// ═══════════════════════════════════════════════════════════════
// Validation Functions (read-only — no minting)
// ═══════════════════════════════════════════════════════════════

/** Validate a communication_id string matches the required format */
export function isValidCommunicationId(id: string): id is CommunicationId {
  return COMMUNICATION_ID_REGEX.test(id);
}

/** Validate a message_run_id string matches the required format */
export function isValidMessageRunId(id: string): id is MessageRunId {
  return MESSAGE_RUN_ID_REGEX.test(id);
}

/**
 * Parse a communication_id into its components.
 * Returns null if format is invalid.
 */
export function parseCommunicationId(id: string): {
  phase: PhaseCode;
  date: string;      // YYYYMMDD
  ulid: string;
} | null {
  const match = id.match(/^LCS-(OUT|SAL|CLI)-(\d{8})-([A-Z0-9]{10,})$/);
  if (!match) return null;
  return {
    phase: match[1] as PhaseCode,
    date: match[2],
    ulid: match[3],
  };
}

/**
 * Parse a message_run_id into its components.
 * Returns null if format is invalid.
 */
export function parseMessageRunId(id: string): {
  communicationId: string;   // the full LCS-{PHASE}-{DATE}-{ULID} portion
  channel: Channel;
  attempt: number;
} | null {
  const match = id.match(/^RUN-(LCS-(?:OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,})-(MG|HR|SH)-(\d{3})$/);
  if (!match) return null;
  return {
    communicationId: match[1],
    channel: match[2] as Channel,
    attempt: parseInt(match[3], 10),
  };
}
