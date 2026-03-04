# LCS Pipeline ERD — SH-LCS-PIPELINE

> **Sub-Hub:** SH-LCS-PIPELINE
> **Format:** Mermaid (per DOCUMENTATION_ERD_DOCTRINE v1.0.0)
> **Created:** 2026-03-03
> **Migration:** 005_lcs_cid_sid_mid.sql

---

## Entity Relationship Diagram

```mermaid
erDiagram

  LCS_CID {
    text communication_id PK
    uuid sovereign_company_id
    text entity_type
    uuid entity_id
    text signal_set_hash
    uuid signal_queue_id
    text frame_id
    text lifecycle_phase
    text lane
    text agent_number
    int intelligence_tier
    text compilation_status
    text compilation_reason
    timestamptz created_at
  }

  LCS_SID_OUTPUT {
    uuid sid_id PK
    text communication_id FK
    text frame_id
    text template_id
    text subject_line
    text body_plain
    text body_html
    text sender_identity
    text sender_email
    text recipient_email
    text recipient_name
    text construction_status
    text construction_reason
    timestamptz created_at
  }

  LCS_MID_SEQUENCE_STATE {
    uuid mid_id PK
    text message_run_id
    text communication_id FK
    text adapter_type
    text channel
    int sequence_position
    int attempt_number
    text gate_verdict
    text gate_reason
    text throttle_status
    text delivery_status
    timestamptz scheduled_at
    timestamptz attempted_at
    timestamptz created_at
  }

  LCS_SIGNAL_QUEUE {
    uuid id PK
    text signal_set_hash
    uuid sovereign_company_id
    text lifecycle_phase
    text status
    timestamptz created_at
  }

  LCS_FRAME_REGISTRY {
    text frame_id PK
    text frame_name
    text lifecycle_phase
    text cid_compilation_rule
    text sid_template_id
    text mid_sequence_type
    int mid_delay_hours
    int mid_max_attempts
  }

  LCS_ADAPTER_REGISTRY {
    text adapter_type PK
    text adapter_name
    text channel_code
    boolean is_active
  }

  LCS_EVENT {
    uuid event_id PK
    text communication_id
    text message_run_id
    uuid sovereign_company_id
    text lifecycle_phase
    text adapter_type
  }

  CL_COMPANY_IDENTITY {
    uuid company_unique_id PK
    text company_name
    text company_domain
    text identity_status
    text final_outcome
  }

  LCS_SIGNAL_QUEUE ||--o| LCS_CID : "triggers_compilation"
  LCS_FRAME_REGISTRY ||--o{ LCS_CID : "binds_frame"
  CL_COMPANY_IDENTITY ||--o{ LCS_CID : "targets_company"
  LCS_CID ||--|| LCS_SID_OUTPUT : "compiled_to_constructed"
  LCS_FRAME_REGISTRY ||--o{ LCS_SID_OUTPUT : "resolves_template"
  LCS_SID_OUTPUT ||--o{ LCS_MID_SEQUENCE_STATE : "constructed_to_delivered"
  LCS_ADAPTER_REGISTRY ||--o{ LCS_MID_SEQUENCE_STATE : "routes_adapter"
  LCS_MID_SEQUENCE_STATE }o--|| LCS_EVENT : "records_event"
  LCS_CID }o--|| LCS_EVENT : "records_event"
```

---

## Relationship Descriptions

| From | To | Cardinality | Description |
|------|----|-------------|-------------|
| LCS_SIGNAL_QUEUE | LCS_CID | 0..1 : 1 | Each signal may produce one CID compilation (or none if blocked) |
| LCS_FRAME_REGISTRY | LCS_CID | 1 : 0..N | Each frame may be bound to many CID records |
| CL_COMPANY_IDENTITY | LCS_CID | 1 : 0..N | Each company may have many communications |
| LCS_CID | LCS_SID_OUTPUT | 1 : 1 | Each COMPILED CID produces exactly one SID output |
| LCS_FRAME_REGISTRY | LCS_SID_OUTPUT | 1 : 0..N | Each frame may be used in many SID constructions |
| LCS_SID_OUTPUT | LCS_MID_SEQUENCE_STATE | 1 : 0..N | Each CONSTRUCTED SID may produce multiple delivery attempts |
| LCS_ADAPTER_REGISTRY | LCS_MID_SEQUENCE_STATE | 1 : 0..N | Each adapter handles many delivery attempts |
| LCS_CID | LCS_EVENT | 0..N : 1 | CID communication_id carried to final CET record |
| LCS_MID_SEQUENCE_STATE | LCS_EVENT | 0..N : 1 | MID message_run_id carried to final CET record |

All relationships are **by value** (no foreign key constraints). Tables are independently queryable.

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | HUB-CL-001 |
| Sub-Hub | SH-LCS-PIPELINE |
| Version | 1.0.0 |
| Status | ACTIVE |
| Created | 2026-03-03 |
