// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Archived errors preserving forensic history without cluttering active error table
 * Table: cl_errors_archive
 */
export const ClErrorsArchiveSchema = z.object({
  error_id: z.string().uuid(),
  company_unique_id: z.string().uuid().nullable().optional(),
  lifecycle_run_id: z.string(),
  pass_name: z.string(),
  failure_reason_code: z.string(),
  inputs_snapshot: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().optional(),
  retry_count: z.number().int().nullable().optional(),
  retry_ceiling: z.number().int().nullable().optional(),
  retry_after: z.string().datetime().nullable().optional(),
  tool_used: z.string().nullable().optional(),
  tool_tier: z.number().int().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  archived_at: z.string().datetime(),
  archive_reason: z.string().nullable().optional(),
});

export type ClErrorsArchive = z.infer<typeof ClErrorsArchiveSchema>;
