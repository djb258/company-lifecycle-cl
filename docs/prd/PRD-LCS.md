# PRD — LCS Sub-Hub (Lifecycle Communication Spine)

## Conformance

| Field | Value |
|-------|-------|
| **Doctrine Version** | 2.2.0 |
| **CTB Version** | 1.0.0 |
| **CC Layer** | CC-03 (Sub-Hub of HUB-CL-001) |

---

## 1. Sovereign Reference (CC-01)

| Field | Value |
|-------|-------|
| **Sovereign ID** | imo-creator (CC-01) |
| **Sovereign Boundary** | Communication orchestration for verified companies |

---

## 2. Hub Identity (CC-02 / CC-03)

| Field | Value |
|-------|-------|
| **Parent Hub** | HUB-CL-001 (Company Lifecycle Hub) |
| **Sub-Hub Name** | Lifecycle Communication Spine (LCS) |
| **Sub-Hub ID** | SUBHUB-CL-LCS |
| **Owner** | Barton / Supreme Headquarters (SHQ) |
| **Version** | 2.2.0 |

---

## 3. Purpose & Transformation Declaration

LCS is the **canonical event ledger and communication orchestration engine** for all lifecycle phases. It owns the 9-step IMO pipeline that transforms pressure signals from sub-hubs into delivered communications tracked in an append-only event table (CET).

### Transformation Statement (REQUIRED)

| Field | Value |
|-------|-------|
| **Transformation Summary** | This system transforms **pressure signals from sub-hubs** (people, DOL, blog) into **delivered communications** tracked in an append-only canonical event table. |

### Constants (Inputs)

| Constant | Source | Description |
|----------|--------|-------------|
| `sovereign_company_id` | `cl.company_identity` | Verified company identity from spine table |
| `pressure_signals` | `people/dol/blog.pressure_signals` | Sub-hub signals (renewal proximity, growth, plan change, blog trigger) |
| `signal_registry` | `lcs.signal_registry` | Declarative signal catalog (9 signal sets) |
| `frame_registry` | `lcs.frame_registry` | Declarative frame catalog (10 frames) |
| `adapter_registry` | `lcs.adapter_registry` | Declarative adapter catalog (3 adapters: MG, HR, SH) |
| `company_intelligence` | `lcs.v_company_intelligence` | Cross-sub-hub intelligence snapshot (46K+ companies) |

### Variables (Outputs)

| Variable | Destination | Description |
|----------|-------------|-------------|
| `communication_event` | `lcs.event` (CET) | Append-only event: signal received, composed, delivered, opened, etc. |
| `error_record` | `lcs.err0` | ORBT 3-strike error with escalation tracking |
| `delivery_payload` | Adapter spokes (MG, HR, SH) | Compiled message sent to Mailgun, HeyReach, or Sales Handoff |

### Pass Structure

| Pass | Type | IMO Layer | Description |
|------|------|-----------|-------------|
| Signal Bridge | CAPTURE | I (Ingress) | Bridge pressure_signals from sub-hubs into signal_queue |
| Signal Intake | CAPTURE | I (Ingress) | Read PENDING signals from signal_queue |
| Intelligence Collection | COMPUTE | M (Middle) | Read company intelligence snapshot from matview |
| Frame Matching | COMPUTE | M (Middle) | Match signal to frame via registries, apply tier/fallback |
| ID Minting | COMPUTE | M (Middle) | Mint communication_id (ULID) + message_run_id |
| Audience Resolution | COMPUTE | M (Middle) | Resolve entity targets (CEO, CFO, HR slots) |
| Gate Evaluation | COMPUTE | M (Middle) | Capacity gate, suppression engine, freshness gate |
| Adapter Dispatch | GOVERN | O (Egress) | Route to adapter spoke, call external service |
| CET Logging | GOVERN | O (Egress) | Append event to lcs.event |
| Error Handling | GOVERN | O (Egress) | ORBT 3-strike protocol → lcs.err0 |

### Scope Boundary

| Scope | Description |
|-------|-------------|
| **IN SCOPE** | Signal bridging, intelligence collection, frame matching, ID minting, audience resolution, gate evaluation, adapter dispatch, CET logging, ORBT error handling, matview refresh |
| **OUT OF SCOPE** | Company identity minting (CL spine), sub-hub data collection (people/dol/blog), email template authoring, LinkedIn sequence design, CRM integration |

---

## 4. CTB Placement

| Field | Value | CC Layer |
|-------|-------|----------|
| **Trunk** | `src/sys/lcs/` | CC-03 |
| **Branch** | `src/app/lcs/` | CC-03 |
| **Leaf** | `src/runtime/lcs/` | CC-03 |

---

## 5. IMO Structure (CC-03)

| Layer | Role | Description | CC Layer |
|-------|------|-------------|----------|
| **I -- Ingress** | Signal intake | Reads pressure_signals via bridge function; reads signal_queue PENDING rows | CC-03 |
| **M -- Middle** | Pipeline orchestration | 9-step pipeline: gates, intelligence, frame match, ID mint, audience, compose | CC-03 |
| **O -- Egress** | Adapter dispatch + CET | Routes to adapter spokes; appends to CET; logs errors to err0 | CC-03 |

---

## 6. Spokes (CC-03 Interfaces)

| Spoke Name | Spoke ID | Type | Direction | Contract | CC Layer |
|------------|----------|------|-----------|----------|----------|
| Outreach Signal Ingress | SPOKE-CL-I-010 | I | Inbound | `spoke_i010_outreach_signal.ts` | CC-03 |
| Sales Signal Ingress | SPOKE-CL-I-011 | I | Inbound | `spoke_i011_sales_signal.ts` | CC-03 |
| Client Signal Ingress | SPOKE-CL-I-012 | I | Inbound | `spoke_i012_client_signal.ts` | CC-03 |
| Calendly Webhook Ingress | SPOKE-CL-I-013 | I | Inbound | `spoke_i013_calendly_webhook.ts` | CC-03 |
| Reply Ingestion | SPOKE-CL-I-014 | I | Inbound | `spoke_i014_reply_ingestion.ts` | CC-03 |
| AFLAC Data Adapter | SPOKE-CL-I-015 | I | Inbound | `spoke_i015_aflac_data.ts` | CC-03 |
| Mailgun Adapter | SPOKE-CL-O-010 | O | Outbound | `spoke_o010_mailgun.ts` | CC-03 |
| HeyReach Adapter | SPOKE-CL-O-011 | O | Outbound | `spoke_o011_heyreach.ts` | CC-03 |
| Sales Handoff | SPOKE-CL-O-012 | O | Outbound | `spoke_o012_sales_handoff.ts` | CC-03 |

---

## 7. Constants vs Variables

| Element | Type | Mutability | CC Layer |
|---------|------|------------|----------|
| Sub-Hub ID (SUBHUB-CL-LCS) | Constant | Immutable | CC-03 |
| Schema name (`lcs`) | Constant | Immutable | CC-03 |
| communication_id format | Constant | ADR-gated | CC-03 |
| message_run_id format | Constant | ADR-gated | CC-03 |
| Signal registry rows | Variable | Config (INSERT/UPDATE, no DELETE) | CC-03 |
| Frame registry rows | Variable | Config (INSERT/UPDATE, no DELETE) | CC-03 |
| Adapter registry rows | Variable | Config (INSERT/UPDATE, no DELETE) | CC-03 |
| Intelligence tier thresholds | Variable | Config | CC-03 |
| Adapter daily caps | Variable | Config | CC-03 |
| Domain rotation config | Variable | Config | CC-03 |

---

## 8. Tools

| Tool | Solution Type | CC Layer | IMO Layer | Reference |
|------|---------------|----------|-----------|-----------|
| Mailgun API | Deterministic | CC-03 | O | Adapter spoke O-010 |
| HeyReach API | Deterministic | CC-03 | O | Adapter spoke O-011 |
| Supabase PostgREST | Deterministic | CC-03 | M | Database access via `.schema('lcs')` |
| pg_cron | Deterministic | CC-03 | I | Signal bridge, matview refresh, queue cleanup |
| Web Crypto API (HMAC) | Deterministic | CC-03 | I | Webhook signature validation |
| Doppler (imo-creator) | Deterministic | CC-03 | M | Secret management — all env vars |

---

## 9. Guard Rails

| Guard Rail | Type | Threshold | CC Layer |
|------------|------|-----------|----------|
| Capacity Gate | Rate Limit | Adapter daily cap, agent territory cap | CC-03 |
| Suppression Engine | Validation | never_contact, unsubscribed, hard_bounced, complained, frequency_cap | CC-03 |
| Freshness Gate | Validation | People stale = hard block; other sub-hub stale = tier downgrade | CC-03 |
| Adapter Auto-Pause | Rate Limit | max_bounce_rate: 0.05, max_complaint_rate: 0.001 | CC-03 |
| CET Immutability Trigger | Validation | communication_id cannot be updated after write | CC-03 |
| Signal Queue Dedup | Validation | UNIQUE(source_hub, source_signal_id) WHERE PENDING | CC-03 |

---

## 10. Kill Switch

| Field | Value |
|-------|-------|
| **Activation Criteria** | Bounce rate > 5%, complaint rate > 0.1%, adapter PAUSED, or ORBT strike 3 escalation |
| **Trigger Authority** | CC-02 (Hub) / CC-01 (Sovereign) |
| **Emergency Contact** | SHQ / Barton Ops |

---

## 11. Promotion Gates

| Gate | Artifact | CC Layer | Requirement |
|------|----------|----------|-------------|
| G1 | PRD | CC-03 | Sub-hub definition approved (this document) |
| G2 | ADR | CC-03 | Architecture decision: dual-ID model, ORBT protocol |
| G3 | Schema Migration | CC-04 | 001-004 migrations executed on Neon |
| G4 | Registry Seed | CC-04 | 22 seed rows (3 adapters + 9 signals + 10 frames) |
| G5 | Edge Functions | CC-04 | Mailgun + HeyReach webhook handlers deployed |
| G6 | Cron Schedule | CC-04 | 7 pg_cron jobs activated via Supabase SQL Editor |

---

## 12. Failure Modes

| Failure | Severity | CC Layer | Remediation |
|---------|----------|----------|-------------|
| Adapter timeout | Medium | CC-03 | ORBT Strike 1: AUTO_RETRY |
| Hard bounce | High | CC-03 | ORBT Strike 2: ALT_CHANNEL (if eligible) |
| Complaint received | Critical | CC-03 | ORBT Strike 3: HUMAN_ESCALATION; add to suppression |
| Matview refresh failure | Medium | CC-03 | Retry via manual `REFRESH MATERIALIZED VIEW CONCURRENTLY` |
| Signal bridge returns 0 | Low | CC-03 | Expected when no new pressure_signals exist |
| CET partition missing | High | CC-03 | Monthly cron creates next partition; manual fallback |

---

## 13. PID Scope (CC-04)

| Field | Value |
|-------|-------|
| **PID Pattern** | `LCS-{PHASE}-{YYYYMMDD}-{ULID}` (communication_id) |
| **Retry Policy** | New message_run_id per retry (`RUN-{COMM_ID}-{CHANNEL}-{ATTEMPT}`) |
| **Audit Trail** | Required — every event appended to lcs.event |

---

## 14. Human Override Rules

| Override | Authority | Condition |
|----------|-----------|-----------|
| Manual signal injection | CC-02 | Insert to signal_queue with source_hub = 'MANUAL' |
| Adapter pause/resume | CC-02 | Update adapter_registry.health_status |
| Suppression list edit | CC-02 | Direct modification of suppression state |
| Force matview refresh | CC-02 | Manual `REFRESH MATERIALIZED VIEW CONCURRENTLY` |

---

## 15. Observability

| Type | Description | CC Layer |
|------|-------------|----------|
| **Logs** | CET (lcs.event) — append-only event log, queryable via matviews | CC-04 |
| **Errors** | err0 (lcs.err0) — ORBT strike log with failure classification | CC-04 |
| **Metrics** | Adapter health (bounce_rate_24h, complaint_rate_24h, sent_today) | CC-03 |
| **Alerts** | ORBT Strike 3 escalation, adapter auto-pause, matview refresh failure | CC-03 |

---

## Approval

| Role | Name | Date |
|------|------|------|
| Sovereign (CC-01) | imo-creator | 2026-02-12 |
| Hub Owner (CC-02) | Barton / SHQ | 2026-02-12 |
| Reviewer | Claude Opus 4.6 | 2026-02-12 |

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| Parent Hub PRD | `docs/prd/PRD-COMPANY-LIFECYCLE.md` |
| OSAM | `doctrine/OSAM.md` |
| ERD | `docs/schema/CL_ERD.md` (Section 11) |
| HEIR | `heir.doctrine.yaml` (doctrine.lcs section) |
| Schema Migration | `migrations/lcs/001_lcs_schema_v2.2.0.sql` |
| Registry Seed | `migrations/lcs/002_lcs_seed_registries.sql` |
| Signal Bridge | `migrations/lcs/003_lcs_signal_bridge.sql` |
| Cron Schedule | `migrations/lcs/004_lcs_cron_schedule.sql` |
| Deploy Checklist | `docs/lcs/DEPLOY_CHECKLIST.md` |
| Env Manifest | `docs/lcs/ENV_MANIFEST.md` |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-02-12 |
| Last Modified | 2026-02-12 |
| Version | 2.2.0 |
| Status | ACTIVE |
| Authority | SUBHUB-CL-LCS / HUB-CL-001 |
