// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Join surface mapping source system records to sovereign company identities
 * Table: company_identity_bridge
 */
export const CompanyIdentityBridgeSchema = z.object({
  bridge_id: z.string().uuid(),
  company_sov_id: z.string().uuid(),
  source_company_id: z.string().uuid(),
  source_system: z.string(),
  match_confidence_score: z.number().int().nullable().optional(),
  match_method: z.string().nullable().optional(),
  match_evidence: z.record(z.unknown()).nullable().optional(),
  bridge_status: z.string().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
  created_by: z.string().nullable().optional(),
  validated_at: z.string().datetime().nullable().optional(),
  validated_by: z.string().nullable().optional(),
});

export type CompanyIdentityBridge = z.infer<typeof CompanyIdentityBridgeSchema>;
