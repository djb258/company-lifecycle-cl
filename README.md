# Company Lifecycle (CL) — Sovereign Identity & Promotion Authority

**Hub ID:** `HUB-CL-001`
**Status:** Doctrine Locked
**Owner:** Supreme Headquarters (SHQ)

---

## Constitutional Declaration

The **Company Lifecycle (CL)** hub is the **constitutional root** for company identity across the entire organizational ecosystem.

CL is the **parent hub**. All other systems are **child sub-hubs or downstream consumers**.

There is **exactly one sovereign Company Unique ID (`company_unique_id`)**, and it is **owned, minted, governed, and retired exclusively by CL**.

---

## Ecosystem Scope

CL governs company identity for:

| System | Relationship to CL |
|--------|-------------------|
| **Shenandoah Valley Group** | Child consumer |
| **Weewee.me** | Child consumer |
| **Outreach Hub** | Child sub-hub (activated by CL) |
| **Sales Hub** | Child sub-hub (activated by CL) |
| **Client Hub** | Child sub-hub (activated by CL) |
| **All future systems** | Must attach via `company_unique_id` |

No system may create, infer, or substitute company identity outside of CL.

---

## Identity Ownership

CL is the **only authority** permitted to:

- **Mint** a `company_unique_id`
- **Merge** company identities
- **Retire** company identities

The `company_unique_id` is **immutable** once issued.

No child hub, downstream system, external integration, or automation may fabricate, replace, or reinterpret company identity.

---

## Promotion Authority

All lifecycle movement is governed exclusively by CL.

```
┌─────────────┐     Meeting Set     ┌─────────────┐    Agreement Signed    ┌─────────────┐
│   OUTREACH  │ ──────────────────► │    SALES    │ ─────────────────────► │   CLIENT    │
└─────────────┘                     └─────────────┘                        └─────────────┘
       │                                   │                                      │
       └───────────────────────────────────┴──────────────────────────────────────┘
                                           │
                              All stages governed by CL
                              Child hubs activated ONLY after
                              CL promotion gates are satisfied
```

- Promotions occur **only** through explicit CL state transitions
- Child hubs are activated **only after** CL promotion gates are satisfied
- No system may bypass, shortcut, or circumvent CL promotion logic

---

## What CL Owns (Exhaustive)

| Attribute | Description |
|-----------|-------------|
| `company_unique_id` | Sovereign, immutable identifier |
| `legal_name` | Canonical company name |
| `cl_stage` | Current lifecycle truth |
| `outreach_uid` | Pointer to active Outreach sub-hub |
| `sales_uid` | Pointer to active Sales sub-hub |
| `client_uid` | Pointer to active Client sub-hub |
| `created_at` | Identity mint timestamp |
| `promoted_at` | Last promotion timestamp |
| `retired_at` | Retirement timestamp (if applicable) |
| `audit_trail` | Immutable history of all transitions |

**If a field is not listed above, it does not belong in CL.**

---

## Explicit Non-Goals

CL is **NOT**:

| CL Does NOT | Belongs To |
|-------------|------------|
| Execute outreach sequences | Outreach Hub |
| Manage sales pipelines | Sales Hub |
| Track client relationships | Client Hub |
| Store people or contacts | People Intelligence Hub |
| Perform data enrichment | Enrichment systems |
| Provide user interfaces | Application layer |
| Run workflows or automations | Execution systems |
| Store meetings, tasks, or documents | Child hubs |

CL is an **authority hub**, not a workflow engine, CRM, or execution surface.

---

## External System Integration

External systems (Clay, scrapers, imports, third-party data) provide **candidate company identities**.

CL:
- Evaluates external identifiers
- Links, accepts, or rejects them
- Maintains external IDs as **aliases only**
- Remains the **final authority** on identity

External identifiers are **never** primary identity. They are mappings to the sovereign `company_unique_id`.

---

## Auditability Guarantee

- All lifecycle transitions are recorded
- History is **append-only**
- Silent mutation of state is **prohibited**
- Identity merges and retirements are **traceable**
- Every promotion includes: actor, timestamp, trigger event, prior state, new state

---

## Doctrine Documents

| Document | Purpose |
|----------|---------|
| [CL_DOCTRINE.md](docs/doctrine/CL_DOCTRINE.md) | Complete conceptual model |
| [CONCEPTUAL_SCHEMA.md](docs/doctrine/CONCEPTUAL_SCHEMA.md) | Schema invariants (no SQL) |
| [INVARIANTS_AND_KILL_SWITCHES.md](docs/doctrine/INVARIANTS_AND_KILL_SWITCHES.md) | Hard constraints and emergency controls |
| [ADR-001](docs/adr/ADR-001-lifecycle-state-machine.md) | Lifecycle state machine decision |

---

## Final Rule

> **CL is the sovereign authority for company identity and lifecycle truth.**
> **All other hubs serve CL. CL serves no other hub.**
> **This doctrine is frozen.**

---

**Repository:** `company-lifecycle-cl`
**Doctrine Version:** 1.0
**Last Updated:** 2025-12-26
