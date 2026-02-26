// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Domain sharing relationships between parent and child companies in hierarchies
 * Table: domain_hierarchy
 */
export const DomainHierarchySchema = z.object({
  hierarchy_id: z.string().uuid(),
  domain: z.string(),
  parent_company_id: z.string().uuid().nullable().optional(),
  child_company_id: z.string().uuid().nullable().optional(),
  relationship_type: z.string(),
  confidence_score: z.number().int().nullable().optional(),
  resolution_method: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  resolved_at: z.string().datetime().nullable().optional(),
  resolved_by: z.string().nullable().optional(),
});

export type DomainHierarchy = z.infer<typeof DomainHierarchySchema>;
