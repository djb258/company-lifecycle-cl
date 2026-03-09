# Worker Briefing — Signal Queue Source Hub Constraint Repair

**DB Changeset**: db-cs-20260304-sq-source-hub-001 (VALID, LOW risk)
**Work Packet**: wp-20260304-signal-queue-source-hub-check-repair
**Change Type**: fix

---

## DB Lane Status: COMPLETE — APPLIED

| Item | Status |
|------|--------|
| Migration 007 applied | COMPLETE |
| Constraint verified | PASS — 6 values accepted |
| OUTREACH insert tested | PASS |
| SYSTEM insert tested | PASS |
| Test rows cleaned up | PASS |

### What Changed

`lcs.signal_queue.chk_sq_source_hub` CHECK constraint updated:
- **Before**: `PEOPLE, DOL, BLOG, MANUAL`
- **After**: `PEOPLE, DOL, BLOG, MANUAL, OUTREACH, SYSTEM`

### Why

Smoke test (wp-20260304-va-green-cid-sid-mid-smoke-test) discovered that signals from the outreach hub could not be bridged into signal_queue because `source_hub = 'outreach'` violated the constraint.

### Pre-Deploy Blockers: NONE

No standard lane code. DB-only fix. Ready for Auditor.

### Artifacts

| Artifact | Path |
|----------|------|
| Work Packet | `work_packets/inbox/wp-20260304-signal-queue-source-hub-check-repair.json` |
| DB_CHANGESET | `changesets/outbox/wp-20260304-signal-queue-source-hub-check-repair/db/db_changeset.json` |
| Schema Diff | `changesets/outbox/wp-20260304-signal-queue-source-hub-check-repair/db/schema_diff.json` |
| Forward Migration | `migrations/007_signal_queue_source_hub_repair.sql` |
| Rollback Migration | `migrations/007_signal_queue_source_hub_repair_rollback.sql` |
| Completion Signal | `work_packets/outbox/wp-20260304-signal-queue-source-hub-check-repair.json` |
