# Run Log: Manual Outreach Batch Minting

## Run Metadata

| Field | Value |
|-------|-------|
| **Run Date** | 2026-02-07 |
| **Batch ID** | BATCH-OUTREACH-2026-02-07 |
| **Orchestration ID** | 9002c98b-3051-44f0-aeec-351b3e5a9be9 |
| **Operator** | Claude Code (Automated) |
| **Source System** | `MANUAL_OUTREACH_2026` |
| **Pipeline** | `pipeline/orchestrator.js` → `pipeline/lifecycle_worker.js` |

---

## Source Data

| Metric | Count |
|--------|-------|
| Companies Submitted | 21 |
| Companies Newly Minted | 19 |
| Companies Linked to Existing | 2 |
| Verification Failures | 0 |

### State Distribution

| State | Count | Companies |
|-------|-------|-----------|
| MO | 7 | Blue Cross Blue Shield of KC, Edward Jones, Graybar Electric, Hallmark Cards, JE Dunn Construction, MFA Incorporated, Shelter Insurance |
| IA | 3 | Berkshire Hathaway Energy, Farm Bureau Financial Group, Hy-Vee Inc |
| WI | 2 | ABC Supply Co, CUNA Mutual Group |
| KS | 2 | Koch Industries, Sprint (legacy) |
| TX | 1 | Acme Brick Company |
| ND | 1 | Basin Electric Power Cooperative |
| NC | 1 | Butterball LLC (linked to existing) |
| IL | 1 | Dot Foods Inc |
| VA | 1 | Estes Express Lines (linked to existing) |
| NE | 1 | Mutual of Omaha |
| OK | 1 | QuikTrip Corporation |

---

## Execution

### Phase 1: Candidate Staging

21 records inserted into `cl.company_candidate` with:
- `source_system` = `MANUAL_OUTREACH_2026`
- `source_record_id` = `OUTREACH-001` through `OUTREACH-021`
- `ingestion_run_id` = `BATCH-OUTREACH-2026-02-07`
- `verification_status` = `PENDING`

### Phase 2: Schema Fix (state_code migration)

The orchestrator's first run failed for 19 of 21 companies with:
```
column "state_code" of relation "company_identity" does not exist
```

**Root cause:** Migration `003_company_candidate_intake.sql` had not been applied to production. The migration adds `state_code CHAR(2)` to `cl.company_identity`.

**Fix applied:**
```sql
ALTER TABLE cl.company_identity ADD COLUMN IF NOT EXISTS state_code CHAR(2) NULL;
ALTER TABLE cl.company_identity ADD CONSTRAINT identity_valid_state_code CHECK (state_code IS NULL OR state_code ~ '^[A-Z]{2}$');
CREATE INDEX IF NOT EXISTS idx_identity_state_code ON cl.company_identity (state_code);
```

19 candidates reset from VERIFIED → PENDING for re-processing.

**Note:** 2 companies (Butterball LLC, Estes Express Lines) succeeded on the first run because they matched existing identities by domain — no INSERT into `company_identity` was needed.

### Phase 3: Orchestration (successful)

Orchestrator processed 9 states in deterministic order: IA, IL, KS, MO, ND, NE, OK, TX, WI.

| State | Processed | Verified | Failed | Minted |
|-------|-----------|----------|--------|--------|
| IA | 3 | 3 | 0 | 3 |
| IL | 1 | 1 | 0 | 1 |
| KS | 2 | 2 | 0 | 2 |
| MO | 7 | 7 | 0 | 7 |
| ND | 1 | 1 | 0 | 1 |
| NE | 1 | 1 | 0 | 1 |
| OK | 1 | 1 | 0 | 1 |
| TX | 1 | 1 | 0 | 1 |
| WI | 2 | 2 | 0 | 2 |
| **Total** | **19** | **19** | **0** | **19** |

Duration: 4,340ms

---

## Minted Sovereign IDs

| # | Company | Domain | Sovereign ID | State |
|---|---------|--------|-------------|-------|
| 1 | ABC Supply Co | abcsupply.com | `6754c221-f94c-4770-bf9e-6c2c4f551d2f` | WI |
| 2 | Acme Brick Company | acmebrick.com | `b9b2d5f9-924b-455e-8890-188b65fe7702` | TX |
| 3 | Basin Electric Power Cooperative | basinelectric.com | `11d607f5-0234-4a22-9628-07d63a5dbe61` | ND |
| 4 | Berkshire Hathaway Energy | brkenergy.com | `42e49a00-aaa2-4d70-98d0-a30886bfd8a0` | IA |
| 5 | Blue Cross Blue Shield of KC | bluekc.com | `c452659e-4b2a-4750-b5b9-e73018eacbb5` | MO |
| 6 | Butterball LLC | butterball.com | `9de5ad1b-50cb-404e-b3f7-9bce58152a1d` | * |
| 7 | CUNA Mutual Group | cunamutual.com | `de217dc5-93a5-4f37-a157-48a7db7e7382` | WI |
| 8 | Dot Foods Inc | dotfoods.com | `874a7b31-05a0-41dc-a530-2fdf13886f0e` | IL |
| 9 | Edward Jones | edwardjones.com | `18458e68-517c-46a2-b404-6f4b8e5e420c` | MO |
| 10 | Estes Express Lines | estes-express.com | `3874e04d-6bba-4e08-9e53-2cc082b8c139` | * |
| 11 | Farm Bureau Financial Group | fbfs.com | `088c20cf-ad35-4698-836f-68bf3467d6c0` | IA |
| 12 | Graybar Electric | graybar.com | `66e49db9-cb6f-4e60-89ac-b7d85ea32211` | MO |
| 13 | Hallmark Cards | hallmark.com | `07b67331-8414-4d44-87da-722562941bc9` | MO |
| 14 | Hy-Vee Inc | hy-vee.com | `6eb8d517-2e0a-4e92-872f-84a2f03adfb8` | IA |
| 15 | JE Dunn Construction | jedunn.com | `4b64a0b2-ec2c-49c0-8c0c-910cd7acbc0c` | MO |
| 16 | Koch Industries | kochind.com | `9a74718c-c4d1-460f-bc21-3f9490fdf2ff` | KS |
| 17 | MFA Incorporated | mfa-inc.com | `d0aa2f07-e898-4687-8749-ddc9c29e578a` | MO |
| 18 | Mutual of Omaha | mutualofomaha.com | `a1d4fd96-885d-416f-8aed-39c162e4965f` | NE |
| 19 | QuikTrip Corporation | quiktrip.com | `43f3db4f-e2cc-4280-9ce5-cb83468c8b5a` | OK |
| 20 | Shelter Insurance | shelterinsurance.com | `0f678c98-c21e-4fc8-af68-68584522c05a` | MO |
| 21 | Sprint (legacy) | sprint.com | `cbf906ae-37b3-41d3-a4ce-981f8fe7c23b` | KS |

\* = Linked to existing identity from `hunter_dol_enrichment` (2026-02-04), no new mint.

---

## Post-Run State

| Metric | Before | After |
|--------|--------|-------|
| Active Companies | 106,065 | 106,086 (+21) |
| States with Data | 9 | 18 (+9 new) |
| Source Systems | 3 | 4 (+MANUAL_OUTREACH_2026) |

### New States Added
IA, IL, KS, MO, ND, NE, OK, TX, WI

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-02-07 |
| Status | COMPLETE |
| Authority | HUB-CL-001 |
