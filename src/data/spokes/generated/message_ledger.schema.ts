// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * CTB CANONICAL — womb-to-tomb message ledger, one record per send attempt (MID), source of truth for everything ever sent across all stages
 * Table: message_ledger
 */
export const MessageLedgerSchema = z.object({
  mid: z.string().uuid(),
  sovereign_id: z.string().uuid(),
  lcs_id: z.string().uuid(),
  source_stage: z.string(),
  source_cid_table: z.string(),
  cid: z.string(),
  channel: z.string(),
  provider: z.string(),
  sender_profile_id: z.string().uuid(),
  payload_hash: z.string(),
  status: z.string(),
  provider_message_id: z.string().nullable().optional(),
  attempt_number: z.number().int(),
  ready_at: z.string().datetime().nullable().optional(),
  sent_at: z.string().datetime().nullable().optional(),
  last_error_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type MessageLedger = z.infer<typeof MessageLedgerSchema>;
