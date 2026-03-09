# Worker Briefing — wp-20260306-field-monitor-marketing-db-migration

## Status: DB_COMPLETE

## What Was Done

Applied field_monitor schema to the **marketing Neon DB** (ep-ancient-waterfall-a42vy0du) and ran both seed scripts.

### Execution Steps

| # | Step | Result |
|---|------|--------|
| 1 | Apply 001_initial_schema.sql | **PASS** (after CTB registration) |
| 2 | Verify 5 tables | **PASS** — all 5 present |
| 3 | Verify 4 triggers | **PASS** — all 4 present |
| 4 | Verify vendor.blog exists | **PASS** |
| 5 | Verify people_master.linkedin_url exists | **PASS** |
| 6a | Run seed_linkedin_urls.sql | **PASS** — 100 URLs + 100 field_states |
| 6b | Run seed_blog_urls.sql (adapted) | **PASS** — 99 URLs + 99 field_states |

### CTB_DDL_GATE Discovery

Marketing DB has `enforce_table_registration()` trigger that blocks CREATE TABLE unless the table is first registered in `ctb.table_registry`. Registered all 5 tables before migration:

| Table | leaf_type |
|-------|-----------|
| url_registry | REGISTRY |
| field_state | CANONICAL |
| check_log | CANONICAL |
| error_log | SUPPORTING |
| rate_state | SYSTEM |

### Blog Seed Adaptation

The original `seed_blog_urls.sql` references `vb.path` which doesn't exist on marketing DB's `vendor.blog` (it has `source_url` instead, plus 29 columns vs the 9-column DDL on CL). Adapted seed uses `domain + '/'` as path, filtered by `domain_reachable = true`.

### Final State

| Metric | Value |
|--------|-------|
| url_registry rows | 199 (100 LinkedIn + 99 blog) |
| field_state rows | 199 (100 title + 99 content_hash) |
| LinkedIn check interval | Daily (1440 min) |
| Blog check interval | Hourly (60 min) |

### Unblocks

- `wp-20260306-field-monitor-production-deploy` — production workers can now connect to marketing DB

## Risk: MED
