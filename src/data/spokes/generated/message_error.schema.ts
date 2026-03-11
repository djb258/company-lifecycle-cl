// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * CTB ERROR — fail-closed logging for invalid CID-to-MID creation or output failures that cannot be recorded on MID
 * Table: message_error
 */
export const MessageErrorSchema = z.object({
  error_id: z.string().uuid(),
  sovereign_id: z.string().uuid(),
  lcs_id: z.string().uuid().nullable().optional(),
  source_stage: z.string(),
  cid: z.string().nullable().optional(),
  error_code: z.string(),
  payload: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().datetime(),
});

export type MessageError = z.infer<typeof MessageErrorSchema>;
