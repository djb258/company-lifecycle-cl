// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Name variants and aliases for companies, sidecar to spine identity table
 * Table: company_names
 */
export const CompanyNamesSchema = z.object({
  name_id: z.string().uuid(),
  company_unique_id: z.string().uuid(),
  name_value: z.string(),
  name_type: z.string(),
  is_primary: z.boolean().nullable().optional(),
  language: z.string().nullable().optional(),
  verified: z.boolean().nullable().optional(),
  verification_date: z.string().datetime().nullable().optional(),
  verification_source: z.string().nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
  created_by: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type CompanyNames = z.infer<typeof CompanyNamesSchema>;
