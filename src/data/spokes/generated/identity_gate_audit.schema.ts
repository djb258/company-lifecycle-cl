// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Audit log for identity gate checks per downstream run with eligibility statistics
 * Table: identity_gate_audit
 */
export const IdentityGateAuditSchema = z.object({
  audit_id: z.string().uuid(),
  run_id: z.string(),
  stage: z.string(),
  total_scanned: z.number().int(),
  eligible_count: z.number().int(),
  blocked_count: z.number().int(),
  sample_blocked_ids: z.string().nullable().optional(),
  blocked_reasons: z.record(z.unknown()).nullable().optional(),
  gate_enforced: z.boolean(),
  created_at: z.string().datetime(),
});

export type IdentityGateAudit = z.infer<typeof IdentityGateAuditSchema>;
