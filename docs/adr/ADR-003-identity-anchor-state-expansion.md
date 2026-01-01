# ADR: Identity Anchor Doctrine & State Expansion Authorization

## ADR Identity

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-003 |
| **Status** | [x] Accepted |
| **Date** | 2026-01-01 |

---

## Owning Hub

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |

---

## Scope

| Layer | Affected |
|-------|----------|
| I — Ingress | [x] |
| M — Middle | [x] |
| O — Egress | [ ] |

---

## Context

During the NC (North Carolina) pipeline execution, three schema constraint modifications were required to successfully ingest 10,739 companies:

1. **State Expansion**: The `chk_state_valid` constraint originally limited ingestion to 8 states (PA, VA, MD, OH, WV, KY, DE, OK). NC was added to support geographic expansion.

2. **Optional Website**: The `website_url` column was `NOT NULL`, but Gate Zero doctrine allows identity verification via domain OR LinkedIn. Companies with only LinkedIn URLs were being rejected.

3. **Identity Anchor Guard**: A new constraint `chk_identity_anchor` was added to enforce that at least one identity anchor (domain OR LinkedIn) exists, maintaining data integrity while allowing flexibility.

These changes were made at runtime to unblock the pipeline. This ADR formalizes them as doctrine.

---

## Decision

### D1. Identity Anchor Doctrine

**The identity anchor requirement is: domain OR LinkedIn, never both required.**

| Field | Required | Nullable | Role |
|-------|----------|----------|------|
| `website_url` | NO | YES | Primary identity anchor |
| `linkedin_url` | NO | YES | Secondary identity anchor |

**Constraint:** At least one must be present.

```sql
CHECK (website_url IS NOT NULL OR linkedin_url IS NOT NULL)
```

**Rationale:** Many valid companies exist with only a LinkedIn presence (early-stage, B2B service firms) or only a website (no LinkedIn page). Requiring both would reject valid companies.

### D2. State List is Expandable by ADR

**The allowed states list in `chk_state_valid` is not hardcoded forever.**

Current allowed states (as of this ADR):
- PA, VA, MD, OH, WV, KY, DE, OK, **NC**

**Expansion Rules:**
1. New states require an ADR amendment or new ADR
2. State additions must be documented before or immediately after the run
3. No silent expansions — all changes must be traceable

### D3. Constraint Modification Governance

**No production constraints may be modified without:**
1. Prior ADR authorization, OR
2. Immediate post-run ADR formalization (this pattern)

This ADR serves as the formalization for the NC run changes.

---

## Alternatives Considered

| Option | Why Not Chosen |
|--------|----------------|
| Require both domain AND LinkedIn | Rejects valid companies with only one anchor |
| Hardcode all 50 states | Premature; we expand state-by-state based on business need |
| No identity anchor constraint | Allows garbage data with neither domain nor LinkedIn |
| Leave changes undocumented | Violates governance; creates untraceable drift |

---

## Consequences

### Enables

- Multi-state expansion as business scales
- Companies with only LinkedIn or only domain can be ingested
- Clear governance trail for all constraint changes
- Prevents false rejects at Gate Zero

### Prevents

- Silent schema drift without documentation
- Ingestion of companies with no identity anchors
- Ambiguity about required vs optional fields
- Unauthorized constraint modifications

---

## Constraints Modified (Formalized)

| Constraint | Change | Justification |
|------------|--------|---------------|
| `chk_state_valid` | Added `NC` | Geographic expansion to North Carolina |
| `website_url` | `NOT NULL` → nullable | Identity anchor doctrine (domain OR LinkedIn) |
| `chk_identity_anchor` | New constraint | Enforces at least one anchor present |

---

## Guard Rails

| Type | Value |
|------|-------|
| State Expansion | Requires ADR |
| Identity Anchor | Domain OR LinkedIn (not AND) |
| Constraint Changes | Must be documented within 24h |

---

## Rollback

If this decision proves incorrect:

1. Add `NOT NULL` back to `website_url`
2. Remove states from `chk_state_valid`
3. Drop `chk_identity_anchor`
4. Re-run affected pipelines with stricter rules
5. Accept data loss for companies ingested under relaxed rules

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| ADR | docs/adr/ADR-003-identity-anchor-state-expansion.md |
| Pipeline | neon/nc-phases-b-f.js |
| Run ID | RUN-NC-2026-01-01T17-46-16 |
| Linear Issue | CL-003 |

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2026-01-01 |
| Reviewer | | |
