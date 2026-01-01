# ADR: Gate Zero as Pre-Sovereign Verification Stage

## ADR Identity

| Field | Value |
|-------|-------|
| **ADR ID** | ADR-002 |
| **Status** | [x] Accepted |
| **Date** | 2025-12-31 |

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
| O — Egress | [x] |

---

## Context

Company candidates arrive from external sources (Clay, Apollo, CSV imports) with claimed identity anchors (domain, LinkedIn, state). Before minting a sovereign `company_unique_id`, these candidates must be verified to ensure:

1. The company actually exists (domain resolves, LinkedIn page exists)
2. The claimed identity is coherent (LinkedIn state matches intake state)
3. We don't mint duplicates or invalid identities

A pre-sovereignty verification stage is required that:
- Operates exclusively on `intake_id` (never sovereign ID)
- Performs binary existence verification (pass/fail only)
- Never enriches or augments authoritative tables
- Handles failures through recovery with throttles
- Signals downstream mint eligibility via events

---

## Decision

**Gate Zero is established as the pre-sovereign verification stage within CL.**

Gate Zero:

1. **Is a lifecycle stage**, not a hub or outreach concern
2. **Uses `intake_id` exclusively** — has no knowledge of `sovereign_company_id`
3. **Performs binary existence verification** — pass or fail, no partial states
4. **Never enriches authoritative tables** — data stays where created
5. **Routes failures to recovery** with throttled retry (3 attempts: 24h → 72h → 168h)
6. **Emits AUTH on success** — downstream Mint Worker subscribes to authorize minting
7. **Never emits MINT** — sovereignty minting is reserved for downstream worker

**AIR (Action/Incident/Result) is established as the event contract:**

- AIR is deterministic process telemetry, not logging
- Gate Zero emits AIR events for every outcome (ATTEMPT, PASS, FAIL, AUTH, EXHAUSTED)
- Downstream workers subscribe to AIR, not table states
- Authorization travels by AIR; data stays where it was created

---

## Alternatives Considered

| Option | Why Not Chosen |
|--------|----------------|
| Verify in Outreach Hub | Outreach operates on sovereign companies; verification is pre-sovereign |
| Mint first, verify later | Creates invalid sovereign identities that require retirement |
| Inline verification at mint | Couples concerns; no recovery path for transient failures |
| Status columns instead of AIR | No subscription model; polling inefficient; audit trail incomplete |
| Do Nothing | Invalid companies minted; data quality degrades |

---

## Consequences

### Enables

- Clean separation between pre-sovereign (intake) and sovereign (company) identities
- Binary pass/fail simplicity — no ambiguous states
- Recovery path for transient failures (API downtime, rate limits)
- Downstream workers subscribe to outcomes via AIR
- Self-healing pipeline — AI can route to correct stage based on AIR events
- Full audit trail of every verification attempt

### Prevents

- Invalid sovereign identities being minted
- Coupling between verification and minting
- Silent failures without recovery path
- Ambiguous "maybe" states in verification
- Enrichment at verification stage (scope creep)

---

## Guard Rails

| Type | Value |
|------|-------|
| Rate Limit | 3 retry attempts per intake |
| Backoff | 24h → 72h → 168h between retries |
| Recovery Window | 14 days post-batch, then freeze |
| Kill Switch | `/cl/gate-zero/kill-switch` |

---

## Rollback

If Gate Zero proves invalid, rollback requires:

1. Freezing Gate Zero processing
2. Direct-minting from intake (bypassing verification)
3. Manual verification of minted identities post-facto
4. Deprecating Gate Zero AIR subscriptions

Rollback **does not** support partial verification or hybrid models.

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| PRD | docs/prd/PRD-GATE-ZERO.md |
| Doctrine | docs/doctrine/AIR_DOCTRINE.md |
| Schema | docs/schema/GATE_ZERO_INTAKE.md |
| Schema | docs/schema/GATE_ZERO_RECOVERY.md |
| Schema | docs/schema/GATE_ZERO_AIR.md |
| Linear Issue | CL-002 |
| PR(s) | Gate Zero documentation |

---

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2025-12-31 |
| Reviewer | | |
