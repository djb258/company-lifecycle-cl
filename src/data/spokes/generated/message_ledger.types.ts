// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * CTB CANONICAL — womb-to-tomb message ledger, one record per send attempt (MID), source of truth for everything ever sent across all stages
 * Table: message_ledger
 */
export interface MessageLedgerRow {
  /** Primary key, message instance ID — one per send attempt */
  mid: string;
  /** FK to cl.company_identity(company_unique_id) */
  sovereign_id: string;
  /** LCS identity, resolves 1:1 from sovereign_id, permanent per company */
  lcs_id: string;
  /** Stage that originated this send: OUTREACH, SALES, or CLIENT */
  source_stage: string;
  /** Fully qualified source CID table name (e.g. outreach.cid_table) */
  source_cid_table: string;
  /** Movement intent identifier from source CID table, logical FK */
  cid: string;
  /** Communication channel: EMAIL or LINKEDIN */
  channel: string;
  /** Transport provider: MAILGUN, HEYREACH, or SMTP */
  provider: string;
  /** FK to lcs.sender_profile_registry, determines from/reply-to/provider config */
  sender_profile_id: string;
  /** Hash of message payload for deduplication and audit */
  payload_hash: string;
  /** Send status FSM: READY, SENT, FAIL, SUPPRESSED, or RETRY */
  status: string;
  /** External message ID returned by transport provider for tracking */
  provider_message_id?: string | null;
  /** Send attempt number, starts at 1, incremented on retry */
  attempt_number: number;
  /** Timestamp when MID entered READY state */
  ready_at?: string | null;
  /** Timestamp when transport confirmed send */
  sent_at?: string | null;
  /** Timestamp of most recent error on this MID */
  last_error_at?: string | null;
  /** Row creation timestamp, auto-set, immutable */
  created_at: string;
  /** Last update timestamp, auto-set on status change */
  updated_at: string;
}
