# ADR: Lifecycle State Machine Design

## ADR Identity

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-001 |
| **Status** | [x] Proposed / [ ] Accepted / [ ] Superseded / [ ] Deprecated |
| **Date** | 2024-12-24 |

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
| I — Ingress | [ ] |
| M — Middle | [x] |
| O — Egress | [ ] |

---

## Context

The Company Lifecycle Hub needs a reliable, deterministic way to manage company lifecycle stages. Companies move through defined stages (e.g., Prospect → Active → Churned → Archived), and each transition must be validated, logged, and trigger appropriate downstream actions.

We need to decide on the architecture for managing these state transitions.

---

## Decision

We will implement a **Finite State Machine (FSM)** pattern for lifecycle management.

**Why this choice:**
1. **Deterministic** — State transitions are explicit and predictable
2. **Auditable** — Every transition is logged with timestamp and actor
3. **Validatable** — Invalid transitions are rejected before execution
4. **Testable** — FSM logic can be unit tested in isolation
5. **No LLM dependency** — Pure deterministic code, aligns with tool doctrine

The FSM will be implemented in TypeScript using XState or a custom lightweight implementation, residing entirely in the M (Middle) layer.

---

## Alternatives Considered

| Option | Why Not Chosen |
|--------|----------------|
| Event Sourcing | Over-engineered for current scale; adds complexity |
| Simple boolean flags | Not scalable; hard to validate transitions |
| Database triggers | Logic in wrong layer; hard to test |
| LLM-based classification | Violates determinism doctrine |
| Do Nothing | Status quo is insufficient for compliance |

---

## Consequences

### Enables

- Clear lifecycle stage visualization
- Reliable audit trail for compliance
- Easy addition of new stages without breaking existing logic
- Parallel state support for complex company scenarios
- Integration with notification system for stage transitions

### Prevents

- Invalid state transitions
- Race conditions in concurrent updates
- Logic bleeding into I/O layers
- Untraceable state changes

---

## Guard Rails

_Constraints that bound this decision. Do not define logic or implementation._

| Type | Value |
|------|-------|
| Rate Limit | 1 transition per company per second |
| Timeout | 30 seconds for transition completion |
| Kill Switch | `/api/v1/lifecycle/kill` to halt all transitions |

---

## Rollback

_How is this decision reversed if it fails? Do not define remediation logic._

1. FSM can be disabled via feature flag
2. Fallback to simple stage field updates
3. All transitions logged, enabling replay/recovery

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| PRD | PRD-COMPANY-LIFECYCLE |
| Sub-PRD | |
| Linear Issue | |
| PR(s) | |

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | | |
| Reviewer | | |
