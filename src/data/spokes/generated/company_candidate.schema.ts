// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Canonical intake staging table for company candidates before identity minting
 * Table: company_candidate
 */
export const CompanyCandidateSchema = z.object({
  candidate_id: z.string().uuid(),
  source_system: z.string(),
  source_record_id: z.string(),
  state_code: z.string(),
  raw_payload: z.record(z.unknown()),
  ingestion_run_id: z.string(),
  created_at: z.string().datetime(),
  verification_status: z.string(),
  verification_error: z.string().nullable().optional(),
  verified_at: z.string().datetime().nullable().optional(),
  company_unique_id: z.string().uuid().nullable().optional(),
});

export type CompanyCandidate = z.infer<typeof CompanyCandidateSchema>;
