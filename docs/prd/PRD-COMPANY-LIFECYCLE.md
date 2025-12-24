# PRD — Company Lifecycle Hub

## 1. Overview

- **System Name:** Company Lifecycle CL
- **Hub Name:** Company Lifecycle Hub
- **Owner:** Barton Enterprises
- **Version:** 1.0.0

---

## 2. Hub Identity

| Field | Value |
|-------|-------|
| **Hub ID** | HUB-CL-001 |
| **Process ID** | PROC-CL-${SESSION_ID} |

---

## 3. Purpose

The Company Lifecycle Hub manages the complete lifecycle of companies from creation to retirement. It owns all logic related to company state transitions, lifecycle stage management, company data validation, and lifecycle event orchestration. This is the central hub for company lifecycle operations across the Barton Enterprise ecosystem.

---

## 4. CTB Placement

| CTB Path | Branch Level | Parent Hub |
|----------|--------------|------------|
| sys/company-lifecycle | sys | None (Root Hub) |

---

## 5. Altitude Scope

| Level | Description | Selected |
|-------|-------------|----------|
| 30,000 ft | Strategic vision, system-wide boundaries | [ ] |
| 20,000 ft | Domain architecture, hub relationships | [x] |
| 10,000 ft | Component design, interface contracts | [ ] |
| 5,000 ft | Implementation detail, execution logic | [ ] |

---

## 6. IMO Structure

_This hub owns all three IMO layers internally. Spokes are external interfaces only._

| Layer | Role | Description |
|-------|------|-------------|
| **I — Ingress** | Dumb input only | Receives company data via UI forms, API calls, webhooks; validates shape only |
| **M — Middle** | Logic, decisions, state | All lifecycle state machine logic, stage transitions, validation rules, event orchestration |
| **O — Egress** | Output only | Emits lifecycle events, notifications, API responses, UI state updates |

---

## 7. Spokes

_Spokes are interfaces ONLY. They carry no logic, tools, or state. Each spoke is typed as Ingress (I) or Egress (O)._

| Spoke Name | Type | Direction | Contract |
|------------|------|-----------|----------|
| UI Form Spoke | I | Inbound | React form components → Hub |
| API Gateway Spoke | I | Inbound | REST/GraphQL requests → Hub |
| Webhook Receiver Spoke | I | Inbound | External webhooks → Hub |
| Database Spoke | O | Outbound | Hub → Supabase persistence |
| Notification Spoke | O | Outbound | Hub → Email/SMS notifications |
| Event Bus Spoke | O | Outbound | Hub → Other hubs via events |
| Dashboard Spoke | O | Outbound | Hub → Analytics/reporting UI |

---

## 8. Connectors

| Connector | Type | Direction | Contract |
|-----------|------|-----------|----------|
| Supabase | API | Bidirectional | Company CRUD, stage tracking |
| External CRM | API | Outbound | Company sync, lifecycle updates |
| Email Service | Event | Outbound | Lifecycle stage notifications |
| Analytics Platform | Event | Outbound | Lifecycle metrics and events |

---

## 9. Tools

_All tools are scoped strictly INSIDE this hub. Spokes do not own tools._

| Tool | Doctrine ID | Scoped To | ADR |
|------|-------------|-----------|-----|
| Lifecycle State Machine | TOOL-CL-001 | This Hub (M layer) | ADR-001 |
| Company Validator | TOOL-CL-002 | This Hub (M layer) | ADR-002 |
| Stage Transition Engine | TOOL-CL-003 | This Hub (M layer) | ADR-003 |
| Event Orchestrator | TOOL-CL-004 | This Hub (M layer) | ADR-004 |

---

## 10. Guard Rails

| Guard Rail | Type | Threshold |
|------------|------|-----------|
| API Rate Limit | Rate Limit | 100 req/min per user |
| Stage Transition Timeout | Timeout | 30 seconds |
| Company Data Validation | Validation | All required fields must pass schema |
| Concurrent Updates | Rate Limit | 1 update per company per second |

---

## 11. Kill Switch

- **Endpoint:** `/api/v1/lifecycle/kill`
- **Activation Criteria:**
  - Error rate exceeds 10% over 5 minutes
  - Database connection failures > 3 consecutive
  - Memory usage > 90%
- **Emergency Contact:** ops@bartonenterprises.com

---

## 12. Promotion Gates

| Gate | Artifact | Requirement |
|------|----------|-------------|
| G1 | PRD | This document approved |
| G2 | ADR | Lifecycle state machine decision recorded |
| G3 | Linear Issue | Implementation tasks created |
| G4 | PR | All lifecycle logic reviewed and merged |
| G5 | Checklist | Full hub compliance verified |

---

## 13. Failure Modes

| Failure | Severity | Remediation |
|---------|----------|-------------|
| Database unavailable | Critical | Retry with exponential backoff, queue operations |
| Invalid stage transition | High | Reject with clear error, log attempt |
| Concurrent modification | Medium | Optimistic locking, retry or conflict resolution |
| External service timeout | Low | Queue for retry, continue processing |

---

## 14. Human Override Rules

_When can a human bypass automation? Who approves?_

- **Force Stage Transition:** Requires Hub Owner approval, logged with audit trail
- **Data Correction:** Requires two approvers, immutable audit record created
- **Kill Switch Activation:** Single approved operator can activate, auto-notifies all stakeholders

---

## 15. Observability

- **Logs:** Structured JSON logs → Supabase logs table, lifecycle stage transitions logged
- **Metrics:** Stage transition counts, latency percentiles, error rates
- **Alerts:** PagerDuty integration for critical failures, Slack for warnings

---

## Approval

| Role | Name | Date |
|------|------|------|
| Owner | | |
| Reviewer | | |
