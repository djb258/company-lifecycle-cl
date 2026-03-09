# OSAM — Operational Semantic Access Map

**Domain**: Company Lifecycle
**Hub**: HUB-CL-001
**Status**: ACTIVE
**Version**: 1.0.0
**Authority**: CONSTITUTIONAL
**Change Protocol**: ADR + HUMAN APPROVAL REQUIRED

---

## Purpose

This is the **authoritative query-routing contract** for the Company Lifecycle hub. It declares where data is queried from, which tables own which concepts, which join paths are allowed, and when an agent must HALT.

### Hierarchical Position

```
CONSTITUTION.md (Transformation Law)
    │
    ▼
PRD (Behavioral Proof — WHAT transformation occurs)
    │
    ▼
OSAM (Semantic Access Map — WHERE to query, HOW to join) ← THIS DOCUMENT
    │
    ▼
ERD (Structural Proof — WHAT tables implement OSAM contracts)
    │
    ▼
PROCESS (Execution Declaration — HOW transformation executes)
```

**OSAM sits ABOVE ERDs and DRIVES them.**
ERDs may only implement relationships that OSAM declares.

---

## Chain of Authority

```
imo-creator (CC-01 Sovereign)
    │
    ▼ owns
    │
HUB-CL-001: Company Lifecycle Hub (CC-02)
    │
    ▼ owns spine
    │
cl.company_identity (Universal Join Key: sovereign_company_id)
    │
    ├──────────────────────────────────────────────────────────────────┐
    ▼                                                                  ▼
SUBHUB-CL-INTAKE (CC-03)                                    SUBHUB-CL-LCS (CC-03)
    │                                                                  │
    ▼                                                                  ▼
[cl.company_candidate]                           [lcs.event, lcs.err0, lcs.signal_registry,
                                                  lcs.frame_registry, lcs.adapter_registry]
```

---

## Universal Join Key Declaration

```yaml
universal_join_key:
  name: "sovereign_company_id"
  type: "UUID"
  source_table: "cl.company_identity"
  description: "The single key that connects all tables in this hub. Minted at verification gate. Immutable once assigned."
```

### Join Key Rules

| Rule | Enforcement |
|------|-------------|
| Single Source | sovereign_company_id is minted ONLY in cl.company_identity via verifyCandidate() |
| Immutable | Once assigned, a sovereign_company_id cannot change |
| Propagated | LCS tables receive the key by value (not FK) — sovereign_company_id is carried on CET rows |
| Required | No LCS event may exist without a sovereign_company_id reference |

---

## Hub Definitions

### Parent Hub

```yaml
parent_hub:
  name: "Company Lifecycle Hub"
  hub_id: "HUB-CL-001"
  cc_layer: CC-02
  spine_table: "cl.company_identity"
  universal_join_key: "sovereign_company_id"
  owns:
    - "SUBHUB-CL-INTAKE"
    - "SUBHUB-CL-LCS"
```

### Spine Table

```yaml
spine_table:
  name: "cl.company_identity"
  purpose: "Authoritative source of company identity — only PASS companies with sovereign_company_id"
  primary_key: "company_unique_id"
  universal_join_key: "company_unique_id (aliased as sovereign_company_id in downstream tables)"
  query_surface: true
  columns:
    - name: "company_unique_id"
      type: "UUID"
      role: "Sovereign identity — universal join key"
    - name: "company_name"
      type: "TEXT"
      role: "Canonical company name"
    - name: "company_domain"
      type: "TEXT"
      role: "Primary domain"
    - name: "verification_status"
      type: "ENUM"
      role: "PENDING | VERIFIED | FAILED"
    - name: "final_outcome"
      type: "ENUM"
      role: "PASS | FAIL"
    - name: "eligibility_status"
      type: "ENUM"
      role: "Lifecycle state: PROSPECT | OUTREACH | SALES | CLIENT"
```

### Sub-Hubs

```yaml
sub_hubs:
  - name: "SUBHUB-CL-INTAKE"
    cc_layer: CC-03
    purpose: "State-agnostic company candidate ingestion and verification"
    joins_to_spine_via: "sovereign_company_id (after verification)"
    tables:
      - "cl.company_candidate"

  - name: "SUBHUB-CL-LCS"
    cc_layer: CC-03
    purpose: "Canonical event ledger and communication orchestration engine"
    joins_to_spine_via: "sovereign_company_id (by value, not FK)"
    tables:
      - "lcs.event"
      - "lcs.err0"
      - "lcs.signal_queue"
      - "lcs.signal_registry"
      - "lcs.frame_registry"
      - "lcs.adapter_registry"
    views:
      - "lcs.v_latest_by_entity"
      - "lcs.v_latest_by_company"
      - "lcs.v_company_intelligence"
```

---

## Query Routing Table

| Question Type | Authoritative Table | Join Path | Notes |
|---------------|---------------------|-----------|-------|
| Who is this company? | `cl.company_identity` | Direct (spine) | Sovereign identity |
| What is this company's lifecycle state? | `cl.company_identity` | Direct (spine) | eligibility_status column |
| Is this company a candidate? | `cl.company_candidate` | Direct | Pre-verification only |
| What communications were sent to this company? | `lcs.event` | `cl.company_identity` → `lcs.event` via sovereign_company_id | CET is append-only |
| What is the latest event for an entity? | `lcs.v_latest_by_entity` | Direct (matview) | Refreshed nightly 2:30 AM |
| What is the latest event for a company? | `lcs.v_latest_by_company` | Direct (matview) | Refreshed nightly 2:30 AM |
| What intelligence do we have on a company? | `lcs.v_company_intelligence` | Direct (matview) | Refreshed nightly 2:00 AM, cross-sub-hub snapshot |
| What errors occurred for a delivery? | `lcs.err0` | `lcs.event` → `lcs.err0` via message_run_id (by value) | ORBT strike tracking |
| What signals are registered? | `lcs.signal_registry` | Direct | Registry config table |
| What frames are available? | `lcs.frame_registry` | Direct | Registry config table |
| What adapters are available? | `lcs.adapter_registry` | Direct | Registry config table |
| What signals are queued for processing? | `lcs.signal_queue` | Direct | Bridged from sub-hub pressure_signals |
| What names does this company have? | `cl.company_names` | `cl.company_identity` → `cl.company_names` via company_unique_id | IDENTITY_LANE |
| What domains does this company have? | `cl.company_domains` | `cl.company_identity` → `cl.company_domains` via company_unique_id | IDENTITY_LANE |

### Routing Rules

| Rule | Description |
|------|-------------|
| One Table Per Question | Each question type has exactly ONE authoritative table |
| Explicit Paths Only | Only declared join paths may be used |
| No Discovery | Agents may not discover new query paths at runtime |
| HALT on Unknown | If a question cannot be routed, agent MUST HALT |

---

## Allowed Join Paths

### Declared Joins

| From Table | To Table | Join Key | Direction | Purpose |
|------------|----------|----------|-----------|---------|
| `cl.company_identity` | `lcs.event` | `sovereign_company_id` (by value) | 1:N | All communication events for a company |
| `cl.company_identity` | `cl.company_names` | `company_unique_id` | 1:N | Name variants |
| `cl.company_identity` | `cl.company_domains` | `company_unique_id` | 1:N | Domain records |
| `cl.company_identity` | `cl.identity_confidence` | `company_unique_id` | 1:1 | Confidence scoring |
| `cl.company_identity` | `cl.company_identity_bridge` | `company_unique_id` | 1:N | Source ID mapping |
| `lcs.event` | `lcs.err0` | `message_run_id` (by value) | 1:N | Errors for a delivery attempt |
| `lcs.event` | `lcs.signal_registry` | `signal_set_hash` (by value) | N:1 | Signal config lookup |
| `lcs.event` | `lcs.frame_registry` | `frame_id` (by value) | N:1 | Frame config lookup |
| `lcs.event` | `lcs.adapter_registry` | `adapter_type` (by value) | N:1 | Adapter config lookup |
| `cl.company_identity` | `lcs.signal_queue` | `sovereign_company_id` (by value) | 1:N | Queued pressure signals for a company |
| `lcs.signal_queue` | `lcs.signal_registry` | `signal_set_hash` (by value) | N:1 | Signal config for queued signal |

### Join Rules

| Rule | Enforcement |
|------|-------------|
| Declared Only | If a join is not in this table, it is INVALID |
| No Ad-Hoc Joins | Agents may not invent joins at runtime |
| ERD Must Implement | ERDs may only contain joins declared here |
| ADR for New Joins | Adding a new join requires ADR approval |
| By Value, Not FK | LCS joins to spine by value (sovereign_company_id carried on CET row), not by foreign key constraint |

### Forbidden Joins

| From | To | Reason |
|------|----|--------|
| `cl.company_candidate` | `cl.company_identity` | Candidates must pass verification gate first |
| `cl.company_candidate` | `lcs.event` | Candidates are not yet verified — no comms allowed |
| `lcs.event` | `cl.company_candidate` | CET never references candidates |
| `cl.company_identity_archive` | `lcs.event` | Archived FAIL companies are not communication targets |
| `cl.company_identity_excluded` | `lcs.event` | Excluded companies are filtered out of active pool |
| `lcs.signal_registry` | `lcs.frame_registry` | No direct registry-to-registry join — pipeline resolves independently |
| SUBHUB-CL-INTAKE tables | SUBHUB-CL-LCS tables (direct) | Cross-sub-hub isolation — route through spine |

---

## Table Classifications

| Table Name | Classification | Query Surface | Notes |
|------------|----------------|---------------|-------|
| `cl.company_identity` | QUERY | **YES** | Spine table — sovereign identity |
| `cl.company_names` | QUERY | **YES** | Name variants per company |
| `cl.company_domains` | QUERY | **YES** | Domain records per company |
| `cl.identity_confidence` | QUERY | **YES** | Confidence scoring |
| `cl.company_candidate` | SOURCE | **NO** | Intake staging — not a query surface |
| `cl.company_identity_bridge` | ENRICHMENT | **NO** | Source-to-sovereign mapping |
| `cl.company_identity_archive` | AUDIT | **NO** | Archived FAIL records |
| `cl.company_identity_excluded` | AUDIT | **NO** | Category-excluded companies |
| `lcs.event` | QUERY | **YES** | CET — all communication events |
| `lcs.err0` | AUDIT | **NO** | Error log — ORBT strike tracking |
| `lcs.signal_queue` | QUERY | **YES** | Bridged pressure signals awaiting pipeline processing |
| `lcs.signal_registry` | QUERY | **YES** | Signal config registry |
| `lcs.frame_registry` | QUERY | **YES** | Frame config registry |
| `lcs.adapter_registry` | QUERY | **YES** | Adapter config registry |
| `lcs.v_latest_by_entity` | QUERY | **YES** | Matview — latest event per entity |
| `lcs.v_latest_by_company` | QUERY | **YES** | Matview — latest event per company |
| `lcs.v_company_intelligence` | QUERY | **YES** | Matview — cross-sub-hub intelligence snapshot |

### Classification Rules

| Rule | Enforcement |
|------|-------------|
| SOURCE tables are NEVER query surfaces | Agent MUST HALT if asked to query cl.company_candidate directly |
| ENRICHMENT tables are joined, not queried | cl.company_identity_bridge is never the "FROM" table |
| AUDIT tables are for logging, not business queries | lcs.err0 and archive tables are not business query surfaces |
| QUERY tables are the only valid query surfaces | All business questions route to QUERY tables |

---

## STOP Conditions

Agents MUST HALT and request clarification when:

### Query Routing STOP Conditions

| Condition | Action |
|-----------|--------|
| Question cannot be routed to a declared table | HALT — ask human for routing |
| Question requires a join not declared in OSAM | HALT — request ADR |
| Question targets cl.company_candidate | HALT — SOURCE table, not a query surface |
| Question requires cross-sub-hub direct join | HALT — isolation violation |
| Question targets archived or excluded companies | HALT — AUDIT classification |

### Semantic STOP Conditions

| Condition | Action |
|-----------|--------|
| Concept not declared in this OSAM | HALT — semantic gap |
| Multiple tables claim ownership of concept | HALT — ambiguity resolution required |
| sovereign_company_id not found in query path | HALT — structural violation |

---

## Validation Checklist

| Check | Status |
|-------|--------|
| [x] Universal join key declared | sovereign_company_id |
| [x] Spine table identified | cl.company_identity |
| [x] All sub-hubs listed with table ownership | INTAKE (1 table), LCS (6 tables + 3 views) |
| [x] All allowed joins explicitly declared | 11 join paths |
| [x] All tables classified (QUERY/SOURCE/ENRICHMENT/AUDIT) | 17 tables classified |
| [x] Query routing table complete | 14 question types routed |
| [x] STOP conditions understood | 7 halt conditions |
| [x] No undeclared joins exist in ERD | Verified against SQL contracts |

---

## Relationship to Other Artifacts

| Artifact | OSAM Relationship |
|----------|-------------------|
| **PRD** | PRD declares WHAT transformation. OSAM declares WHERE to query. PRD must reference OSAM. |
| **ERD** | ERD implements OSAM. ERD may not introduce joins not in OSAM. |
| **Process** | Processes query via OSAM routes. No ad-hoc queries. |
| **Agents** | Agents follow OSAM routing strictly. HALT on unknown routes. |
| **REPO_DOMAIN_SPEC.md** | Domain spec binds generic roles. OSAM binds query routing. Both required. |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-02-12 |
| Last Modified | 2026-02-12 |
| Version | 1.0.0 |
| Status | ACTIVE |
| Authority | CONSTITUTIONAL |
| Derives From | CONSTITUTION.md (Transformation Law) |
| Change Protocol | ADR + HUMAN APPROVAL REQUIRED |
