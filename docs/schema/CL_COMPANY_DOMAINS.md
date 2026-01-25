# cl.company_domains — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-01-25

---

## 1. Table Overview

| Field | Value |
|-------|-------|
| **Schema** | cl |
| **Table** | company_domains |
| **Type** | Core |
| **Total Columns** | 24 |

The `cl.company_domains` table stores domain information for companies including DNS records, SSL certificates, WHOIS data, and verification status.

---

## 2. Column Dictionary

### Identity Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `domain_id` | uuid | NO | gen_random_uuid() | Primary key |
| `company_unique_id` | uuid | NO | - | FK to company_identity |
| `domain` | text | NO | - | The domain (e.g., example.com) |
| `domain_type` | text | YES | 'primary' | primary, secondary, redirect |
| `is_primary` | boolean | YES | false | Is this the primary domain? |

### Verification Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `verified` | boolean | YES | false | Domain ownership verified |
| `verification_date` | timestamptz | YES | - | When verified |
| `verification_method` | text | YES | - | Method used (DNS, HTTP, etc.) |
| `domain_status` | text | YES | 'active' | active, parked, inactive, error |
| `status_check_date` | timestamptz | YES | - | Last status check |
| `redirect_to_domain` | text | YES | - | If redirecting, where to |

### DNS Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `nameservers` | text[] | YES | - | NS records |
| `mx_records` | text[] | YES | - | MX records |
| `txt_records` | text[] | YES | - | TXT records |
| `dns_analysis` | jsonb | YES | - | Full DNS analysis |

### SSL Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `ssl_certificate_valid` | boolean | YES | - | Is SSL cert valid? |
| `ssl_issuer` | text | YES | - | Certificate issuer |
| `ssl_expiry_date` | timestamptz | YES | - | Certificate expiry |

### Metadata Columns

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `whois_data` | jsonb | YES | - | WHOIS lookup data |
| `security_flags` | jsonb | YES | - | Security assessment |
| `created_at` | timestamptz | YES | now() | Record creation |
| `updated_at` | timestamptz | YES | now() | Last update |
| `created_by` | text | YES | - | Creator |
| `metadata` | jsonb | YES | - | Additional metadata |

---

## 3. Constraints

### Primary Key
- `domain_id`

### Unique Constraints
- `(company_unique_id, domain)` - One entry per domain per company

### Foreign Keys
| Column | References |
|--------|------------|
| `company_unique_id` | `cl.company_identity(company_unique_id)` |

---

## 4. Relationships

```
cl.company_identity (1) ←──── (N) cl.company_domains
```

Each company can have multiple domains (primary site, regional sites, acquired domains, etc.).

---

## 5. Usage Patterns

### Get primary domain for a company
```sql
SELECT domain
FROM cl.company_domains
WHERE company_unique_id = $1
  AND is_primary = true;
```

### Get all active domains
```sql
SELECT domain, domain_type, ssl_certificate_valid
FROM cl.company_domains
WHERE company_unique_id = $1
  AND domain_status = 'active'
ORDER BY is_primary DESC;
```

### Find companies with expiring SSL
```sql
SELECT cd.domain, ci.company_name, cd.ssl_expiry_date
FROM cl.company_domains cd
JOIN cl.company_identity ci USING (company_unique_id)
WHERE cd.ssl_expiry_date < now() + interval '30 days'
  AND cd.ssl_certificate_valid = true
ORDER BY cd.ssl_expiry_date;
```

---

## 6. Archive Table

`cl.company_domains_archive` mirrors this structure with additional:
- `archived_at` (timestamptz)
- `archived_reason` (text)

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Status | Active |
