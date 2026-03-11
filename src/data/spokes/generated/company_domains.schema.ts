// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

import { z } from 'zod';

/**
 * Domain records and DNS metadata for companies, sidecar to spine identity table
 * Table: company_domains
 */
export const CompanyDomainsSchema = z.object({
  domain_id: z.string().uuid(),
  company_unique_id: z.string().uuid(),
  domain: z.string(),
  domain_type: z.string().nullable().optional(),
  is_primary: z.boolean().nullable().optional(),
  verified: z.boolean().nullable().optional(),
  verification_date: z.string().datetime().nullable().optional(),
  verification_method: z.string().nullable().optional(),
  domain_status: z.string().nullable().optional(),
  status_check_date: z.string().datetime().nullable().optional(),
  redirect_to_domain: z.string().nullable().optional(),
  nameservers: z.string().nullable().optional(),
  mx_records: z.string().nullable().optional(),
  txt_records: z.string().nullable().optional(),
  dns_analysis: z.record(z.unknown()).nullable().optional(),
  ssl_certificate_valid: z.boolean().nullable().optional(),
  ssl_issuer: z.string().nullable().optional(),
  ssl_expiry_date: z.string().datetime().nullable().optional(),
  whois_data: z.record(z.unknown()).nullable().optional(),
  security_flags: z.record(z.unknown()).nullable().optional(),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
  created_by: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type CompanyDomains = z.infer<typeof CompanyDomainsSchema>;
