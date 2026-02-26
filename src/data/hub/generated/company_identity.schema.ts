// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Sovereign identity registry — canonical source of truth for company identity minting and lifecycle tracking
 * Table: company_identity
 */
export const CompanyIdentitySchema = z.object({
  company_unique_id: z.string().uuid(),
  company_name: z.string(),
  company_domain: z.string().nullable().optional(),
  linkedin_company_url: z.string().nullable().optional(),
  source_system: z.string(),
  created_at: z.string().datetime(),
  canonical_name: z.string().nullable().optional(),
  state_verified: z.string().nullable().optional(),
  employee_count_band: z.string().nullable().optional(),
  company_fingerprint: z.string().nullable().optional(),
  lifecycle_run_id: z.string().nullable().optional(),
  identity_pass: z.number().int().nullable().optional(),
  identity_status: z.string().nullable().optional(),
  last_pass_at: z.string().datetime().nullable().optional(),
  existence_verified: z.boolean().nullable().optional(),
  name_match_score: z.number().int().nullable().optional(),
  state_match_result: z.string().nullable().optional(),
  state_code: z.string().nullable().optional(),
  outreach_id: z.string().uuid().nullable().optional(),
  sales_process_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  lcs_id: z.string().uuid().nullable().optional(),
  outreach_attached_at: z.string().datetime().nullable().optional(),
  sales_opened_at: z.string().datetime().nullable().optional(),
  client_promoted_at: z.string().datetime().nullable().optional(),
  lcs_attached_at: z.string().datetime().nullable().optional(),
});

export type CompanyIdentity = z.infer<typeof CompanyIdentitySchema>;
