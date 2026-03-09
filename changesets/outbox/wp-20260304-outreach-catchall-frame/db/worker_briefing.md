# Worker Briefing — wp-20260304-outreach-catchall-frame

## Status: DB_COMPLETE

## What Was Done

Migration 008 inserted catch-all OUTREACH frame `OUT-GENERAL-V1` into `lcs.frame_registry`.

### Frame Configuration

| Field | Value |
|-------|-------|
| frame_id | OUT-GENERAL-V1 |
| frame_name | Outreach General — Catch-All |
| lifecycle_phase | OUTREACH |
| frame_type | POND |
| tier | 5 |
| required_fields | `[]` (empty — no required fields) |
| fallback_frame | NULL |
| channel | MG |
| is_active | true |
| cid_compilation_rule | LITE |
| sid_template_id | TPL-GENERAL-OUTREACH-V1 |
| mid_sequence_type | IMMEDIATE |
| mid_delay_hours | 0 |
| mid_max_attempts | 3 |

### Purpose

Tier 5 companies have minimal intelligence data (no CEO, no DOL records). Without a catch-all frame, these companies cannot match any frame during CID compilation and fall out of the pipeline. OUT-GENERAL-V1 ensures every company, regardless of data quality, has a valid outreach path.

### Constraint Discovery

- `chk_frame_type` constraint only allows: HAMMER, NEWSLETTER, POND, MEETING_FOLLOWUP, EMPLOYEE_COMM, RENEWAL_NOTICE, ONBOARDING
- Work packet specified no frame_type preference; POND selected as the closest match for a generic catch-all frame

## Artifacts

| Artifact | Path |
|----------|------|
| Forward migration | `migrations/008_outreach_catchall_frame.sql` |
| Rollback migration | `migrations/008_outreach_catchall_frame_rollback.sql` |
| DB changeset | `changesets/outbox/wp-20260304-outreach-catchall-frame/db/db_changeset.json` |
| Schema diff | `changesets/outbox/wp-20260304-outreach-catchall-frame/db/schema_diff.json` |

## Validation

```sql
SELECT frame_id, frame_name, tier, is_active FROM lcs.frame_registry WHERE frame_id = 'OUT-GENERAL-V1';
-- Returns: OUT-GENERAL-V1 | Outreach General — Catch-All | 5 | true
```

## Risk: LOW

Single data INSERT into CONFIG table. Fully reversible via rollback migration.
