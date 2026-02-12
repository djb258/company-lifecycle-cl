# LCS Migrations

## Migration Files

| File | Description | Depends On |
|---|---|---|
| `001_lcs_schema_v2.2.0.sql` | Full schema: 6 tables, 3 matviews, 1 function | Neon prerequisite tables |
| `002_lcs_seed_registries.sql` | Registry seed data (Prompt 11) | 001 |
| `003_lcs_signal_bridge.sql` | Signal bridge function (Prompt 12) | 001 + 002 |
| `004_lcs_cron_schedule.sql` | pg_cron jobs (Prompt 14) | 001 + 002 + 003 |

## Execution Order

```bash
psql $NEON_CONNECTION_STRING -f migrations/lcs/001_lcs_schema_v2.2.0.sql
psql $NEON_CONNECTION_STRING -f migrations/lcs/002_lcs_seed_registries.sql
psql $NEON_CONNECTION_STRING -f migrations/lcs/003_lcs_signal_bridge.sql
psql $NEON_CONNECTION_STRING -f migrations/lcs/004_lcs_cron_schedule.sql
```

## Prerequisites

These tables must exist in Neon BEFORE running migration 001:

- `cl.company_identity` — spine table (company_unique_id, company_name, final_outcome)
- `people.people_master` — contact records (unique_id, full_name, email, linkedin_url)
- `people.company_slot` — role slots (company_unique_id, slot_type, is_filled, person_unique_id)
- `outreach.outreach` — outreach bridge (outreach_id, sovereign_id)
- `outreach.dol` — DOL filing data (outreach_id, renewal_month, filing_present, carrier)
- `outreach.blog` — blog intelligence (outreach_id, context_summary, source_type)
- `company.company_source_urls` — sitemap data (company_unique_id, source_type)

## Rollback

Nuclear rollback (removes everything):
```sql
DROP SCHEMA lcs CASCADE;
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'lcs-%';
```
