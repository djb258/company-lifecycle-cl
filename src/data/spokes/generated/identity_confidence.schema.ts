// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Confidence scoring envelope for identity attributes across verification dimensions
 * Table: identity_confidence
 */
export const IdentityConfidenceSchema = z.object({
  company_unique_id: z.string().uuid(),
  name_confidence_score: z.number().int().nullable().optional(),
  domain_confidence_score: z.number().int().nullable().optional(),
  linkedin_confidence_score: z.number().int().nullable().optional(),
  state_confidence_score: z.number().int().nullable().optional(),
  overall_confidence_score: z.number().int().nullable().optional(),
  confidence_level: z.string().nullable().optional(),
  name_verification_status: z.string().nullable().optional(),
  domain_verification_status: z.string().nullable().optional(),
  linkedin_verification_status: z.string().nullable().optional(),
  state_verification_status: z.string().nullable().optional(),
  name_evidence: z.record(z.unknown()).nullable().optional(),
  domain_evidence: z.record(z.unknown()).nullable().optional(),
  linkedin_evidence: z.record(z.unknown()).nullable().optional(),
  state_evidence: z.record(z.unknown()).nullable().optional(),
  last_calculated_at: z.string().datetime().nullable().optional(),
  calculation_method: z.string().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
});

export type IdentityConfidence = z.infer<typeof IdentityConfidenceSchema>;
