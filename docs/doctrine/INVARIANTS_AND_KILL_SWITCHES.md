# CL Invariants & Kill Switches

**Hard Constraints and Emergency Controls — Doctrine Locked**

---

## Preamble

This document defines the **invariants** (rules that must always hold) and **kill switches** (emergency controls) for Company Lifecycle (CL).

These are **non-negotiable**. They cannot be bypassed by configuration, feature flags, or business requests.

Violation of any invariant is a **system failure**, not a bug to be worked around.

---

## Part 1: Invariants

Invariants are conditions that **must always be true**. If an invariant is violated, the system is in an invalid state.

---

### 1. Identity Invariants

#### INV-ID-001: Unique Identity

> **Every `company_unique_id` must be globally unique across all time.**

- No two records may share the same `company_unique_id`
- This includes retired records
- This includes merged (absorbed) records
- Uniqueness is enforced at the root level

**If violated:** System is in corrupt state. All operations must halt.

---

#### INV-ID-002: Immutable Identity

> **Once a `company_unique_id` is minted, it cannot be changed.**

- The identifier is permanent
- No "correction" or "update" is permitted
- If identity was minted incorrectly, use MERGE or RETIRE

**If violated:** Audit trail is compromised. All downstream references are invalidated.

---

#### INV-ID-003: Non-Reusable Identity

> **A `company_unique_id` that has been retired or absorbed cannot be reused.**

- Retired IDs remain reserved forever
- Absorbed IDs (from merges) remain reserved forever
- New companies must receive new identifiers

**If violated:** Identity collisions will corrupt historical data.

---

#### INV-ID-004: Single Mint Authority

> **Only CL may mint a `company_unique_id`.**

- No child hub may create identities
- No downstream system may create identities
- No external integration may create identities
- No automation may create identities without CL processing

**If violated:** Identity sovereignty is compromised. Multiple sources of truth will emerge.

---

### 2. Lifecycle State Invariants

#### INV-LC-001: Single State

> **A company can only be in exactly one lifecycle state at any time.**

- States are mutually exclusive
- OUTREACH, SALES, CLIENT, RETIRED cannot overlap
- There is no "transitioning" intermediate state

**If violated:** Business logic downstream will receive contradictory signals.

---

#### INV-LC-002: Forward Progression

> **Lifecycle state can only move forward, never backward.**

Valid transitions:
```
OUTREACH → SALES → CLIENT → RETIRED
```

Invalid transitions:
```
SALES → OUTREACH (prohibited)
CLIENT → SALES (prohibited)
CLIENT → OUTREACH (prohibited)
RETIRED → any state (prohibited)
```

**If violated:** Audit trail becomes meaningless. Promotion gates are bypassed.

---

#### INV-LC-003: Event-Driven Transitions

> **Lifecycle state cannot change without a verified triggering event.**

- No time-based promotion
- No inference-based promotion
- No UI-driven direct state mutation
- Every transition requires: event_type, source, timestamp, actor

**If violated:** State changes cannot be audited or explained.

---

#### INV-LC-004: CL-Only Mutation

> **Only CL may modify lifecycle state.**

- Sub-hubs may emit events
- Sub-hubs may NOT modify state
- Downstream systems may read state
- Downstream systems may NOT modify state

**If violated:** Multiple systems will claim promotion authority. Conflicts guaranteed.

---

### 3. Sub-Hub Invariants

#### INV-SH-001: CL Activation Required

> **Sub-hubs cannot self-activate. Only CL may activate a sub-hub.**

- Outreach activated when company minted
- Sales activated when promoted to SALES
- Client activated when promoted to CLIENT

**If violated:** Sub-hubs will exist without CL records. Identity drift begins.

---

#### INV-SH-002: Company Anchor Required

> **A sub-hub cannot exist without a valid `company_unique_id` in CL.**

- Sub-hub creation requires CL record to exist
- Sub-hub creation requires CL-minted sub-hub UID
- Orphan sub-hubs are invalid

**If violated:** Work will occur on companies that don't exist in the authoritative system.

---

#### INV-SH-003: No Cross-Promotion

> **A sub-hub cannot promote lifecycle state or activate other sub-hubs.**

- Outreach cannot promote to SALES
- Sales cannot activate Client
- Sub-hubs emit facts, CL declares truth

**If violated:** Promotion authority is fragmented. Audit becomes impossible.

---

### 4. Audit Invariants

#### INV-AU-001: Append-Only History

> **Lifecycle history records can only be added, never modified or deleted.**

- No UPDATE on history records
- No DELETE on history records
- History is immutable once written

**If violated:** Audit trail is compromised. Compliance failures guaranteed.

---

#### INV-AU-002: Complete History

> **Every state transition must create a corresponding history record.**

- No silent state changes
- Atomic: state change + history record in same transaction
- If history write fails, state change must rollback

**If violated:** Gaps in audit trail. Cannot explain how state changed.

---

#### INV-AU-003: Traceable Actions

> **Every action must record who/what performed it and when.**

Required for all operations:
- `actor` (system or human identifier)
- `timestamp` (when action occurred)
- `source` (what triggered the action)

**If violated:** Cannot attribute actions. Cannot investigate issues.

---

### 5. Merge Invariants

#### INV-MG-001: Single Survivor

> **Every merge has exactly one survivor and one or more absorbed identities.**

- Survivor retains `company_unique_id`
- Absorbed becomes alias of survivor
- No "partial merge" or "shared merge"

**If violated:** Identity becomes ambiguous. Which ID is authoritative?

---

#### INV-MG-002: Absorbed Identity Preservation

> **Absorbed identities are aliased, not deleted.**

- Absorbed `company_unique_id` maps to survivor
- Historical references remain valid (via alias lookup)
- Absorbed ID cannot be reused

**If violated:** Historical data becomes orphaned. Broken references.

---

#### INV-MG-003: Child Record Re-pointing

> **All child records of absorbed identity must re-point to survivor.**

- Sub-hub records update to survivor ID
- External mappings update to survivor ID
- Downstream systems notified of change

**If violated:** Split-brain data. Some records point to absorbed, some to survivor.

---

### 6. External Mapping Invariants

#### INV-EX-001: Alias Only

> **External identifiers are aliases, never primary identity.**

- `company_unique_id` is always authoritative
- External IDs are for lookup/matching only
- External systems cannot override CL decisions

**If violated:** External systems become de facto sources of truth.

---

#### INV-EX-002: One-to-One Per Source

> **An external ID from a given source can map to at most one company.**

- `(source_system, external_id)` is unique
- Multiple external IDs can map to same company
- Same external ID cannot map to multiple companies

**If violated:** Ambiguous mappings. Cannot resolve which company an external ID refers to.

---

---

## Part 2: Kill Switches

Kill switches are **emergency controls** that halt operations when invariants are at risk.

---

### KS-001: Duplicate Identity Detection

**Trigger:** Attempt to mint `company_unique_id` that already exists.

**Action:**
1. BLOCK the mint operation
2. LOG the attempted duplication
3. ALERT operations team
4. RETURN error to caller

**Resolution:** Investigate source of duplicate. May require merge.

---

### KS-002: Invalid Transition Detection

**Trigger:** Attempt to transition lifecycle state in prohibited direction.

**Action:**
1. BLOCK the transition
2. LOG the invalid attempt
3. PRESERVE current state
4. RETURN error with explanation

**Resolution:** Review business process. May indicate integration bug.

---

### KS-003: Orphan Sub-Hub Detection

**Trigger:** Sub-hub record references `company_unique_id` that doesn't exist in CL.

**Action:**
1. QUARANTINE the sub-hub record
2. LOG the orphan detection
3. ALERT operations team
4. PREVENT further operations on orphan

**Resolution:** Either create missing CL record (rare) or delete orphan sub-hub.

---

### KS-004: History Mutation Attempt

**Trigger:** Attempt to UPDATE or DELETE lifecycle history record.

**Action:**
1. BLOCK the operation
2. LOG the attempt with full context
3. ALERT security team
4. PRESERVE all records unchanged

**Resolution:** Investigate who/what attempted mutation. May indicate breach.

---

### KS-005: External System Override Attempt

**Trigger:** External system attempts to directly modify `company_unique_id` or `cl_stage`.

**Action:**
1. REJECT the modification
2. LOG the attempt
3. CONTINUE using CL values
4. NOTIFY integration team

**Resolution:** Review integration design. External systems should not have write access.

---

### KS-006: Promotion Without Event

**Trigger:** Attempt to change lifecycle state without verified triggering event.

**Action:**
1. BLOCK the promotion
2. LOG the missing event
3. PRESERVE current state
4. RETURN error requiring event

**Resolution:** Caller must provide valid event to trigger promotion.

---

### KS-007: Unauthorized Mint Attempt

**Trigger:** System other than CL attempts to create `company_unique_id`.

**Action:**
1. REJECT the creation
2. LOG the unauthorized attempt
3. ALERT security team
4. RETURN error indicating only CL may mint

**Resolution:** Review integration design. Route through proper CL intake.

---

### KS-008: Retired Identity Reactivation

**Trigger:** Attempt to change RETIRED company back to active state.

**Action:**
1. BLOCK the reactivation
2. LOG the attempt
3. PRESERVE RETIRED state
4. RETURN error explaining retirement is permanent

**Resolution:** If company should be active, create NEW identity and document relationship.

---

### KS-009: Merge Without Authorization

**Trigger:** Attempt to execute merge without proper authority/approval.

**Action:**
1. BLOCK the merge
2. LOG the unauthorized attempt
3. PRESERVE both records unchanged
4. REQUIRE explicit authorization

**Resolution:** Obtain proper approval through governance process.

---

### KS-010: Mass Operation Safety

**Trigger:** Bulk operation affecting more than threshold number of records.

**Action:**
1. PAUSE the operation
2. REQUIRE explicit confirmation
3. LOG the scope of operation
4. PROCEED only with authorization

**Threshold:** Configurable, default 100 records.

**Resolution:** Confirm intent. May require phased rollout.

---

---

## Part 3: Guarantees

These are guarantees CL provides to all consumers, **regardless of downstream behavior**.

---

### G-001: Identity Guarantee

> **If a `company_unique_id` exists, it is globally unique and will remain stable forever.**

Consumers can rely on:
- ID will not change
- ID will not be reused
- ID will not be deleted (only retired)

---

### G-002: State Guarantee

> **The `cl_stage` returned by CL is the single source of truth for lifecycle position.**

Consumers can rely on:
- State is authoritative
- State was set by verified event
- State transition history is available

---

### G-003: Audit Guarantee

> **Every state change in CL has a complete, immutable audit record.**

Consumers can rely on:
- History cannot be altered
- Every transition is traceable
- Actor and timestamp always available

---

### G-004: Resolution Guarantee

> **Any external ID can be resolved to at most one `company_unique_id`.**

Consumers can rely on:
- Lookup is deterministic
- No ambiguous mappings
- Deprecated mappings are documented

---

### G-005: Downstream Notification Guarantee

> **CL will notify downstream systems of significant state changes.**

Consumers can rely on:
- Retirement notifications sent
- Merge notifications sent
- Sub-hub activation signals sent

---

---

## Part 4: Violation Response Protocol

When an invariant is violated, the following protocol applies:

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| **CRITICAL** | Identity invariant violated | Immediate halt |
| **HIGH** | Lifecycle state invariant violated | Within 1 hour |
| **MEDIUM** | Audit invariant violated | Within 4 hours |
| **LOW** | External mapping invariant violated | Within 24 hours |

### Response Steps

1. **DETECT** — Identify the violation
2. **HALT** — Stop related operations if CRITICAL
3. **LOG** — Record full context of violation
4. **ALERT** — Notify appropriate team
5. **INVESTIGATE** — Determine root cause
6. **REMEDIATE** — Fix the violation
7. **VERIFY** — Confirm invariants are restored
8. **POSTMORTEM** — Document learnings

---

## Part 5: Emergency Contacts

| Role | Responsibility |
|------|----------------|
| **CL Hub Owner** | Ultimate authority on CL decisions |
| **Operations Team** | Day-to-day monitoring and response |
| **Security Team** | Breach investigation and response |
| **Integration Team** | External system issues |

---

## Final Declaration

> **These invariants and kill switches are non-negotiable.**
>
> **They exist to protect the integrity of company identity across the entire ecosystem.**
>
> **No business requirement, no deadline, no executive request justifies bypassing them.**
>
> **If an invariant cannot be satisfied, the operation does not proceed.**

---

**Doctrine Version:** 1.0
**Status:** Locked
**Last Updated:** 2025-12-26
