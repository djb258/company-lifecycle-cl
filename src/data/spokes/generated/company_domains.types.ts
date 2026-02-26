// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * Domain records and DNS metadata for companies, sidecar to spine identity table
 * Table: company_domains
 */
export interface CompanyDomainsRow {
  /** Unique domain record identifier, auto-generated primary key */
  domain_id: string;
  /** FK to cl.company_identity spine table, links domain to company */
  company_unique_id: string;
  /** Domain name string (no protocol, lowercase), e.g. example.com */
  domain: string;
  /** Type classification: primary, secondary, redirect, parked */
  domain_type?: string | null;
  /** Whether this is the primary domain for the company, default false */
  is_primary?: boolean | null;
  /** Whether domain ownership/existence has been verified, default false */
  verified?: boolean | null;
  /** Timestamp when domain verification was completed */
  verification_date?: string | null;
  /** Method of verification: DNS lookup, MX check, HTTP probe */
  verification_method?: string | null;
  /** Current domain status: active, expired, parked, redirect */
  domain_status?: string | null;
  /** Timestamp of last domain status check */
  status_check_date?: string | null;
  /** Target domain if this domain redirects to another */
  redirect_to_domain?: string | null;
  /** DNS nameservers array for this domain */
  nameservers?: string | null;
  /** MX records array for this domain's email routing */
  mx_records?: string | null;
  /** TXT records array for this domain (SPF, DKIM, etc.) */
  txt_records?: string | null;
  /** Full DNS analysis payload as JSON (provider, CDN, etc.) */
  dns_analysis?: Record<string, unknown> | null;
  /** Whether the domain has a valid SSL/TLS certificate */
  ssl_certificate_valid?: boolean | null;
  /** Certificate issuer name (e.g. Let's Encrypt, DigiCert) */
  ssl_issuer?: string | null;
  /** SSL certificate expiration date */
  ssl_expiry_date?: string | null;
  /** WHOIS registration data as JSON (registrar, dates, contacts) */
  whois_data?: Record<string, unknown> | null;
  /** Security analysis flags as JSON (blacklist, phishing, malware) */
  security_flags?: Record<string, unknown> | null;
  /** Timestamp when domain record was created, auto-set */
  created_at?: string | null;
  /** Timestamp when domain record was last updated, auto-set */
  updated_at?: string | null;
  /** Identity of the agent or user who created this domain record */
  created_by?: string | null;
  /** Additional metadata for the domain record as JSON */
  metadata?: Record<string, unknown> | null;
}
