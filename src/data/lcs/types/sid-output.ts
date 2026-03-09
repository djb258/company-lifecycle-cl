import type { ConstructionStatus } from './enums';

/**
 * SidOutputRow — READ table for composed message content.
 * Source: lcs.sid_output
 * Joined to mid_sequence_state on communication_id to hydrate
 * recipient info and message body before adapter call.
 */
export interface SidOutputRow {
  communication_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
  subject_line: string | null;
  body_plain: string | null;
  body_html: string | null;
  sender_identity: string | null;
}

/**
 * LCS SID Message Construction Output — lcs.sid_output
 * Classification: STAGING (APPEND-ONLY)
 * Sub-hub: SH-LCS-PIPELINE
 *
 * Captures constructed message content, template resolution,
 * and recipient details per communication. Downstream of CID, upstream of MID.
 */
export interface LcsSidOutputRow {
  sid_id: string;                  // UUID PK, auto-generated
  communication_id: string;        // by value ref to lcs.cid
  frame_id: string;                // by value ref to frame_registry
  template_id: string | null;      // resolved template identifier
  subject_line: string | null;
  body_plain: string | null;
  body_html: string | null;
  sender_identity: string | null;
  sender_email: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  construction_status: ConstructionStatus;
  construction_reason: string | null;
  created_at: string;              // ISO 8601 timestamptz
}

/**
 * Insert type — what you provide to INSERT into lcs.sid_output.
 * sid_id and created_at are optional (auto-generated).
 */
export type LcsSidOutputInsert = Omit<LcsSidOutputRow, 'sid_id' | 'created_at'> & {
  sid_id?: string;
  created_at?: string;
};
