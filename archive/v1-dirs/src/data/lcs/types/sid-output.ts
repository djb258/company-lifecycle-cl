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
