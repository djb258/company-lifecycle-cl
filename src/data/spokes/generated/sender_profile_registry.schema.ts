// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * SUPPORTING — sender identity configs per stage/persona/channel, defines from/reply-to/provider settings for transport adapters
 * Table: sender_profile_registry
 */
export const SenderProfileRegistrySchema = z.object({
  sender_profile_id: z.string().uuid(),
  stage: z.string(),
  channel: z.string(),
  provider: z.string(),
  from_address: z.string().nullable().optional(),
  reply_to_address: z.string().nullable().optional(),
  display_name: z.string().nullable().optional(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type SenderProfileRegistry = z.infer<typeof SenderProfileRegistrySchema>;
