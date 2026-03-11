# Domain Discovery

**Authority**: HUB-CL-001
**Pipeline Scripts**: `discover_domains.js`, `ingest_clay_domains.js`
**Snap-On Reference**: TOOL-001 (MXLookup, Tier 0 FREE)
**Status**: ACTIVE

---

## Doctrine

```
DOMAIN IS ENRICHMENT, NOT VERIFICATION.
SOVEREIGN ID = "THIS COMPANY IS REAL" — NOT "THIS COMPANY HAS A WEBSITE."
DISCOVERY USES TIER 0 (FREE) METHODS FIRST. ALWAYS.
EVERY DISCOVERED DOMAIN MUST PASS MX VALIDATION BEFORE DB WRITE.
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   DOMAIN DISCOVERY                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Tier 0A: DNS Inference + MX Validation (FREE)   │   │
│  │  pipeline/discover_domains.js                     │   │
│  │                                                    │   │
│  │  company_name → normalize → candidate domains     │   │
│  │  → DNS A record → DNS MX record → validate        │   │
│  │  → write to cl.company_identity                   │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ MISSES                        │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Tier 0B: Clay / External Enrichment             │   │
│  │  pipeline/ingest_clay_domains.js                  │   │
│  │                                                    │   │
│  │  Clay CSV → known-bad filter → MX validate        │   │
│  │  → write to cl.company_identity                   │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ REMAINING (~0.1%)             │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Residual: No discoverable domain                 │   │
│  │  (Small businesses, holding cos, personal         │   │
│  │   practices — still have sovereign IDs)           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Tier 0A: DNS Inference + MX Validation

**Script**: `pipeline/discover_domains.js`
**Cost**: $0 (DNS queries are free, Node.js built-in `dns` module)
**Hit Rate**: ~74% (tested on 1,073 companies)
**Speed**: ~100 companies in 13 seconds (10x concurrency)

### How It Works

| Step | Action |
|------|--------|
| 1 | Query `cl.company_identity` for `company_domain IS NULL` |
| 2 | Normalize company name (strip suffixes, titles, punctuation) |
| 3 | Generate candidate domains (`.com`, `.net`, `.org`, state variants, word-based short variants) |
| 4 | DNS A record lookup (does domain resolve to an IP?) — 3s timeout |
| 5 | DNS MX record lookup (does domain accept email?) — 3s timeout |
| 6 | Parked domain detection (sedoparking, parkingcrew, bodis, etc.) |
| 7 | Write validated domain to `cl.company_identity` and `cl.company_candidate.raw_payload` |

### Name Normalization

| Input | Normalized Slug | Candidates |
|-------|----------------|------------|
| `COASTAL CAROLINA DENTISTRY LLC` | `coastalcarolinadentistry` | coastalcarolinadentistry.com, .net, .org, coastalcarolina.com |
| `ALTMAN TRACTOR & EQUIPMENT COMPANY, INC.` | `altmantractorequipment` | altmantractorequipment.com, altmantractor.com (2-word variant) |
| `AIR DOCTOR SERVICES, INC.` | `airdoctor` | airdoctor.com, .net, .org |
| `5 STAR HOME CARE INC` | `5starhomecare` | 5starhomecare.com, starhome.com (2-word variant) |

**Suffix stripping**: LLC, Inc, Corp, Ltd, LP, Company, Services, etc.
**Title stripping**: D.D.S., M.D., D.O., P.A. (with `\b` word boundaries to prevent matching inside words)
**Stopword filtering**: a, an, the, and, or, of, at, in, on, to, for, by

### Domain Validation States

| Status | Meaning | Action |
|--------|---------|--------|
| `VALID` | A record + MX records exist | Write to DB (preferred) |
| `VALID_NO_MX` | A record exists, no MX | Write to DB (fallback, website exists but no email) |
| `UNREACHABLE` | No A record | Skip — domain doesn't exist |
| `PARKED` | A record exists, MX points to parking service | Skip — domain registered but not active |

### CLI Usage

```bash
# All companies missing domains
node pipeline/discover_domains.js

# Dry run (preview, no DB writes)
node pipeline/discover_domains.js --dry-run

# Limit to N companies
node pipeline/discover_domains.js --limit 100

# Only specific source system
node pipeline/discover_domains.js --source DOL

# Verbose (show all DNS attempts)
node pipeline/discover_domains.js --verbose
```

---

## Tier 0B: Clay / External Enrichment Ingest

**Script**: `pipeline/ingest_clay_domains.js`
**Cost**: Depends on Clay pricing (external to this pipeline)
**Hit Rate**: ~65% of remaining (after Tier 0A)

### How It Works

| Step | Action |
|------|--------|
| 1 | Parse Clay CSV export (columns: sovereign_id, company_name, Domain, etc.) |
| 2 | Match to sovereign identity via `sovereign_id` column or `outreach_id` |
| 3 | Reject known-bad domains (80+ static entries + pattern matching) |
| 4 | Skip companies that already have a domain |
| 5 | MX validate the Clay-suggested domain |
| 6 | Write validated domain to `cl.company_identity` and `cl.company_candidate` |

### Known-Bad Domain Categories

| Category | Examples | Why Rejected |
|----------|----------|--------------|
| Directories | mapquest.com, yelp.com, bbb.org, angi.com | Clay returns page that mentions company, not company's own site |
| Government | .gov domains (dot.gov, cms.gov, irs.gov) | Government sites, not companies |
| EIN lookup sites | eindata.com, w9ein.com, bizapedia.com | Business data sites, not companies |
| State registries | sunbiz.org, sos.state.nc.us | State filing sites |
| Legal/case sites | casemine.com, justia.com, findlaw.com | Legal databases |
| News/media | local news sites | News articles about companies |
| Social media | linkedin.com, facebook.com, instagram.com | Social profiles, not company domains |
| Generic email | gmail.com, yahoo.com, outlook.com | Personal email providers |

### CLI Usage

```bash
# Ingest Clay CSV
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv"

# Dry run
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" --dry-run

# Skip MX validation (trust Clay)
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" --skip-mx
```

---

## Full Workflow

```bash
# Step 1: Free DNS inference (catches ~74%)
node pipeline/discover_domains.js

# Step 2: Clay enrichment for remaining (catches ~65% of what's left)
node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv"

# Step 3: Verify results
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT COUNT(*) as total, COUNT(company_domain) as has_domain, COUNT(*) - COUNT(company_domain) as missing FROM cl.company_identity')
  .then(r => { console.log(r.rows[0]); pool.end(); });
"
```

---

## Results (2026-02-18)

| Metric | Value |
|--------|-------|
| Starting missing | 1,073 |
| DNS Discovery (Tier 0A) | 776 domains found |
| Clay Enrichment (Tier 0B) | 193 domains added |
| **Total added** | **969** |
| **Still missing** | **104** (0.1%) |
| **Final coverage** | **99.9%** (104,815 / 104,919) |
| **Total cost** | **$0** (DNS is free) |

---

## Key Lessons

1. **Domain guessing without validation is worthless.** Web search agents returned unverified domains — 1,313 out of 1,591 failed Hunter.IO validation. DNS MX lookup is the validation gate.

2. **Clay returns false positives.** Clay finds pages that MENTION the company and returns that page's domain. Filter with known-bad list + patterns before trusting.

3. **Word-based short variants catch long names.** "ALTMAN TRACTOR & EQUIPMENT COMPANY, INC." → `altmantractor.com` (2-word variant). Full slug would generate `altmantractorequipment.com` which doesn't exist.

4. **Title pattern regex needs word boundaries.** Without `\b`, patterns like `d.o.` match inside "DOCTOR" and `p.a.` matches inside "PAYNE". Use `\b(d\.?o\.?)\b` to prevent.

5. **3-second DNS timeout is essential.** Without timeout, unreachable domains cause DNS queries to hang 30+ seconds. With timeout + 10x concurrency, 1,073 companies process in ~2 minutes.

6. **Snap-On Toolbox doctrine works.** Tier 0 (FREE) first → 74% hit rate at $0. Only go to Tier 1 (Clay, Google Places) for the remaining 26%.

---

## Hard Constraints

- **Do NOT** write a domain to DB without DNS validation (A or MX record)
- **Do NOT** trust Clay/enrichment domains without filtering known-bad domains
- **Do NOT** use domain presence as a verification gate — domain is enrichment, sovereign ID is verification
- **Do NOT** use LLM/web-search-based domain guessing without MX validation follow-up

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-02-18 |
| Last Modified | 2026-02-18 |
| Status | ACTIVE |
| Authority | HUB-CL-001 |
