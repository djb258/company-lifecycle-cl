# Hub Compliance Checklist — Company Lifecycle Hub

This checklist must be completed before any hub can ship.
No exceptions. No partial compliance.

---

## Hub Identity

- [x] Hub ID assigned (unique, immutable): **HUB-CL-001**
- [ ] Process ID assigned (execution / trace ID)
- [x] Hub Name defined: **Company Lifecycle Hub**
- [ ] Hub Owner assigned

---

## CTB Placement

- [x] CTB path defined: **sys/company-lifecycle**
- [x] Branch level specified: **sys (40k)**
- [x] Parent hub identified: **None (Root Hub)**

---

## Altitude Scope

- [x] Altitude level declared: **20k**
- [x] Scope appropriate for declared altitude

---

## IMO Structure

### Ingress (I Layer)

- [x] Ingress points defined (UI Forms, API Gateway, Webhooks)
- [ ] Ingress contains no logic
- [ ] Ingress contains no state
- [ ] UI (if present) is dumb ingress only

### Middle (M Layer)

- [ ] All logic resides in M layer
- [ ] All state resides in M layer
- [ ] All decisions occur in M layer
- [ ] Tools scoped to M layer only

### Egress (O Layer)

- [x] Egress points defined (Database, Notifications, Event Bus, Dashboard)
- [ ] Egress contains no logic
- [ ] Egress contains no state

---

## Spokes

- [x] All spokes typed as I or O only
- [ ] No spoke contains logic
- [ ] No spoke contains state
- [ ] No spoke owns tools
- [ ] No spoke performs decisions

---

## Tools

- [x] All tools scoped inside this hub (see TOOLS.md)
- [ ] All tools have Doctrine ID
- [ ] All tools have ADR reference
- [ ] No tools exposed to spokes

---

## Connectors

- [x] Connectors (API / CSV / Event) defined
- [x] Connector direction specified (Inbound / Outbound)
- [ ] Connector contracts documented

---

## Cross-Hub Isolation

- [ ] No sideways hub-to-hub calls
- [ ] No cross-hub logic
- [ ] No shared mutable state between hubs

---

## Guard Rails

- [x] Rate limits defined (100 req/min)
- [x] Timeouts defined (30 seconds)
- [ ] Validation implemented
- [ ] Permissions enforced

---

## Kill Switch

- [x] Kill switch endpoint defined: `/api/v1/lifecycle/kill`
- [x] Kill switch activation criteria documented
- [ ] Kill switch tested and verified
- [x] Emergency contact assigned: ops@bartonenterprises.com

---

## Rollback

- [ ] Rollback plan documented
- [ ] Rollback tested and verified

---

## Observability

- [ ] Logging implemented
- [ ] Metrics implemented
- [ ] Alerts configured
- [ ] Shipping without observability is forbidden

---

## Failure Modes

- [x] Failure modes documented (see PRD)
- [x] Severity levels assigned
- [ ] Remediation steps defined

---

## Human Override

- [x] Override conditions defined
- [ ] Override approvers assigned

---

## Traceability

- [x] PRD exists and is current: **PRD-COMPANY-LIFECYCLE**
- [x] ADR exists (if decisions required): **ADR-001**
- [ ] Linear issue linked
- [ ] PR linked

---

## Compliance Status

**Current Status:** IN PROGRESS

**Blockers:**
- Implementation not yet started
- Observability not configured
- Kill switch not tested

---

## Compliance Rule

If any box is unchecked, this hub may not ship.
