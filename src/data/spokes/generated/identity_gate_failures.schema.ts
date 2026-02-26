// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Records that reached downstream but failed the identity gate eligibility check
 * Table: identity_gate_failures
 */
export const IdentityGateFailuresSchema = z.object({
  failure_id: z.string().uuid(),
  company_unique_id: z.string().uuid(),
  run_id: z.string(),
  stage: z.string(),
  error_code: z.string(),
  eligibility_reason: z.string().nullable().optional(),
  identity_pass: z.number().int().nullable().optional(),
  identity_status: z.string().nullable().optional(),
  existence_verified: z.boolean().nullable().optional(),
  created_at: z.string().datetime(),
});

export type IdentityGateFailures = z.infer<typeof IdentityGateFailuresSchema>;
