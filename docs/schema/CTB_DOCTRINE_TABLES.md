# CTB & Doctrine Tables — Schema Documentation

> **Source of Truth:** Neon PostgreSQL
> **Verification Mode:** Read-Only
> **Verification Date:** 2026-03-03
> **Origin:** Migrated from research database (ep-young-block-aii5nj6b)

---

## 1. Overview

| Field | Value |
|-------|-------|
| **Schemas** | ctb, doctrine |
| **Hub** | SYSTEM_CORE |
| **Sub-Hub** | DOCTRINE_MGMT |
| **CANONICAL** | doctrine.doctrine_library |
| **ERROR** | doctrine.doctrine_library_error |
| **REGISTRY** | doctrine.doctrine_key, ctb.table_registry |

These tables provide two capabilities on the CL Neon:

1. **CTB Registry-First Enforcement** — `ctb.table_registry` tracks all registered tables across schemas, enforcing the doctrine that no table may exist without registration.
2. **Doctrine Library** — `doctrine.doctrine_library` stores vectorized doctrine content with 1536-dimensional embeddings for semantic search. Used by the SID worker for template resolution and message construction.

---

## 2. ctb.table_registry — Table Registration

| Field | Value |
|-------|-------|
| **Schema** | ctb |
| **Table** | table_registry |
| **Classification** | REGISTRY |
| **Total Columns** | 10 |
| **Row Count** | 20 (as of 2026-03-03) |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `id` | BIGINT | NO | GENERATED ALWAYS AS IDENTITY | Auto-incrementing primary key. | System | IMMUTABLE | Internal |
| `table_schema` | TEXT | NO | 'public' | PostgreSQL schema name. | Registration | IMMUTABLE | Drift audit, registry enforcement |
| `table_name` | TEXT | NO | — | Table name within schema. | Registration | IMMUTABLE | Drift audit, registry enforcement |
| `hub_id` | TEXT | NO | — | Owning hub identifier. | Registration | CONFIG | Governance, audit |
| `subhub_id` | TEXT | NO | — | Owning sub-hub identifier. | Registration | CONFIG | Governance, audit |
| `leaf_type` | TEXT | NO | — | `CANONICAL`, `ERROR`, `STAGING`, `MV`, or `REGISTRY`. | Registration | CONFIG | Cardinality enforcement |
| `is_frozen` | BOOLEAN | NO | FALSE | Whether table schema is frozen (no ALTER allowed). | Governance | CONFIG | Migration gate |
| `description` | TEXT | YES | — | Human-readable table description. | Registration | CONFIG | Documentation |
| `registered_at` | TIMESTAMPTZ | NO | NOW() | When table was registered. | System | IMMUTABLE | Audit |
| `registered_by` | TEXT | NO | CURRENT_USER | Who registered the table. | System | IMMUTABLE | Audit |

### Constraints

| Constraint | Type | Definition |
|------------|------|------------|
| PK | PRIMARY KEY | `id` |
| `uq_table_registry_table` | UNIQUE | `(table_schema, table_name)` |
| `table_registry_leaf_type_check` | CHECK | `leaf_type IN ('CANONICAL', 'ERROR', 'STAGING', 'MV', 'REGISTRY')` |

### Current Registry Contents

| Schema | Table | Sub-Hub | Leaf Type |
|--------|-------|---------|-----------|
| cl | company_identity | SH-CL-IDENTITY | CANONICAL |
| cl | cl_err_existence | SH-CL-IDENTITY | ERROR |
| cl | company_identity_bridge | SH-CL-IDENTITY | STAGING |
| cl | company_identity_excluded | SH-CL-IDENTITY | STAGING |
| cl | movement_code_registry | SH-CL-IDENTITY | REGISTRY |
| doctrine | doctrine_library | DOCTRINE_MGMT | CANONICAL |
| doctrine | doctrine_library_error | DOCTRINE_MGMT | ERROR |
| doctrine | doctrine_key | DOCTRINE_MGMT | REGISTRY |
| lcs | event | SH-LCS-EVENTS | CANONICAL |
| lcs | err0 | SH-LCS-EVENTS | ERROR |
| lcs | v_company_intelligence | SH-LCS-EVENTS | MV |
| lcs | v_latest_by_company | SH-LCS-EVENTS | MV |
| lcs | v_latest_by_entity | SH-LCS-EVENTS | MV |
| lcs | signal_registry | SH-LCS-SIGNALS | CANONICAL |
| lcs | signal_queue | SH-LCS-SIGNALS | STAGING |
| lcs | frame_registry | SH-LCS-FRAMES | CANONICAL |
| lcs | adapter_registry | SH-LCS-ADAPTERS | CANONICAL |
| lcs | cid | SH-LCS-PIPELINE | CANONICAL |
| lcs | sid_output | SH-LCS-PIPELINE | STAGING |
| lcs | mid_sequence_state | SH-LCS-PIPELINE | STAGING |

---

## 3. doctrine.doctrine_library — Vectorized Doctrine Content

| Field | Value |
|-------|-------|
| **Schema** | doctrine |
| **Table** | doctrine_library |
| **Classification** | CANONICAL |
| **Total Columns** | 15 |
| **Row Count** | 668 chunks across 9 domains |
| **Extension** | pgvector (vector type) |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `id` | UUID | NO | gen_random_uuid() | Primary key. | System | IMMUTABLE | Internal |
| `doctrine_id` | TEXT | NO | — | Globally unique doctrine chunk identifier. Format: `{DOMAIN}-{MAJOR}.{MINOR}-{SEQ}`. | Ingestion | IMMUTABLE | Lookup, SID worker |
| `domain` | TEXT | NO | — | Doctrine domain (CLIENT, COMP, FIN, GOV, OPS, PROD, RPT, SALES, SYS). | Ingestion | IMMUTABLE | Search, SID worker |
| `audience` | TEXT | NO | — | `INTERNAL` or `EXTERNAL`. | Ingestion | IMMUTABLE | Access control |
| `major_section` | INTEGER | NO | — | Major section number within domain. | Ingestion | IMMUTABLE | Navigation |
| `minor_section` | INTEGER | NO | — | Minor section number within major section. | Ingestion | IMMUTABLE | Navigation |
| `chunk_sequence` | INTEGER | NO | — | Chunk sequence within section. | Ingestion | IMMUTABLE | Ordering |
| `section_title` | TEXT | YES | — | Human-readable section title. | Ingestion | IMMUTABLE | Display, search |
| `content` | TEXT | NO | — | Doctrine content text. | Ingestion | IMMUTABLE | SID worker (template resolution) |
| `token_count` | INTEGER | NO | — | Token count for the chunk. | Ingestion | IMMUTABLE | Context budget |
| `embedding` | vector(1536) | NO | — | 1536-dimensional embedding vector. | Embedding model | IMMUTABLE | Semantic search |
| `source_file` | TEXT | NO | — | Source file the chunk was extracted from. | Ingestion | IMMUTABLE | Provenance |
| `status` | TEXT | NO | 'ACTIVE' | `DRAFT`, `ACTIVE`, or `DEPRECATED`. | Governance | CONFIG | Filtering |
| `version` | TEXT | NO | '1.0.0' | Doctrine version. | Governance | CONFIG | Versioning |
| `created_at` | TIMESTAMPTZ | NO | NOW() | Creation timestamp. | System | IMMUTABLE | Audit |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Last update (auto-set by trigger). | System | AUTO | Audit |

### Constraints

| Constraint | Type | Definition |
|------------|------|------------|
| PK | PRIMARY KEY | `id` |
| UNIQUE | `doctrine_id` | One row per chunk identifier |
| `doctrine_library_audience_check` | CHECK | `audience IN ('INTERNAL', 'EXTERNAL')` |
| `doctrine_library_status_check` | CHECK | `status IN ('DRAFT', 'ACTIVE', 'DEPRECATED')` |
| `trg_set_updated_at` | TRIGGER | Auto-sets `updated_at` on UPDATE |

### Indexes

| Index | Columns | Type |
|-------|---------|------|
| PK | `id` | btree |
| `doctrine_library_doctrine_id_key` | `doctrine_id` | btree (UNIQUE) |
| `idx_dl_doctrine_id` | `doctrine_id` | btree |
| `idx_dl_domain_audience` | `domain, audience` | btree |
| `idx_dl_embedding` | `embedding` | ivfflat (vector_cosine_ops, lists=100) |

### Domain Coverage

| Domain | Chunks | Description |
|--------|--------|-------------|
| CLIENT | 40 sections | Client engagement and onboarding |
| COMP | 41 sections | Company operations |
| FIN | 6 sections | Financial |
| GOV | 150 sections | Governance |
| OPS | 12 sections | Operations |
| PROD | 5 sections | Product |
| RPT | 26 sections | Reporting |
| SALES | 31 sections | Sales process |
| SYS | 24 sections | System |

### Semantic Search Example

```sql
SELECT doctrine_id, section_title, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM doctrine.doctrine_library
WHERE status = 'ACTIVE'
  AND domain = 'SALES'
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

---

## 4. doctrine.doctrine_key — Section Index

| Field | Value |
|-------|-------|
| **Schema** | doctrine |
| **Table** | doctrine_key |
| **Classification** | REGISTRY |
| **Total Columns** | 8 |
| **Row Count** | 335 |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `key_id` | BIGINT | NO | GENERATED ALWAYS AS IDENTITY | Primary key. | System | IMMUTABLE | Internal |
| `domain` | TEXT | NO | — | Doctrine domain. | Ingestion | IMMUTABLE | Lookup |
| `major_section` | INTEGER | NO | — | Major section number. | Ingestion | IMMUTABLE | Navigation |
| `minor_section` | INTEGER | NO | — | Minor section number. | Ingestion | IMMUTABLE | Navigation |
| `section_title` | TEXT | NO | — | Section title (full-text searchable). | Ingestion | IMMUTABLE | Search |
| `audience` | TEXT | NO | — | `INTERNAL` or `EXTERNAL`. | Ingestion | IMMUTABLE | Access control |
| `chunk_count` | INTEGER | NO | — | Number of chunks in this section. | Ingestion | IMMUTABLE | Context budget |
| `first_doctrine_id` | TEXT | NO | — | First chunk ID in section for random access. | Ingestion | IMMUTABLE | Lookup |

### Indexes

| Index | Columns | Type |
|-------|---------|------|
| PK | `key_id` | btree |
| `uq_doctrine_key` | `(domain, major_section, minor_section, audience)` | btree (UNIQUE) |
| `idx_dk_lookup` | `(domain, major_section, minor_section, audience)` | btree |
| `idx_dk_title_search` | `to_tsvector('english', section_title)` | gin (full-text) |

### Full-Text Search Example

```sql
SELECT domain, major_section, minor_section, section_title, chunk_count
FROM doctrine.doctrine_key
WHERE to_tsvector('english', section_title) @@ plainto_tsquery('english', 'outreach process')
ORDER BY domain, major_section, minor_section;
```

---

## 5. doctrine.doctrine_library_error — Error Log

| Field | Value |
|-------|-------|
| **Schema** | doctrine |
| **Table** | doctrine_library_error |
| **Classification** | ERROR |
| **Total Columns** | 6 |
| **Row Count** | 0 (clean) |

### Column Dictionary

| Column | Type | Nullable | Default | Description | Source of Truth | Volatility | Consumer |
|--------|------|----------|---------|-------------|-----------------|------------|----------|
| `error_id` | BIGINT | NO | GENERATED ALWAYS AS IDENTITY | Primary key. | System | IMMUTABLE | Internal |
| `failed_at` | TIMESTAMPTZ | NO | NOW() | When error occurred. | System | IMMUTABLE | Audit |
| `operation` | TEXT | NO | — | `INSERT`, `UPDATE`, or `DELETE`. | System | IMMUTABLE | Audit |
| `error_code` | TEXT | YES | — | Error classification code. | System | IMMUTABLE | Triage |
| `error_message` | TEXT | YES | — | Human-readable error message. | System | IMMUTABLE | Triage |
| `offending_payload` | JSONB | YES | — | Payload that caused the error. | System | IMMUTABLE | Debug |

---

## Document Control

| Field | Value |
|-------|-------|
| Hub | SYSTEM_CORE / HUB-CL-001 |
| Sub-Hub | DOCTRINE_MGMT |
| Version | 1.0.0 |
| Status | ACTIVE |
| Created | 2026-03-03 |
| Origin | Research database (ep-young-block-aii5nj6b) |
