# REPO_DOMAIN_SPEC.md

**Domain**: Company Lifecycle
**Parent**: IMO-Creator
**Status**: ACTIVE

---

## CRITICAL: What This File MUST NOT Contain

- NO SQL statements
- NO code snippets or functions
- NO workflow logic or decision trees
- NO scoring formulas or calculations
- NO implementation details
- NO prose descriptions of "how it works"

This file contains BINDINGS ONLY - mapping generic roles to domain-specific names.

---

## Domain Identity

| Field | Value |
|-------|-------|
| Domain Name | company-lifecycle |
| Sovereign Reference | imo-creator |
| Hub ID | HUB-CL-001 |

---

## Fact Schema Bindings

Map generic FACT role to your domain's source-of-truth tables.

| Generic Role | Domain Table | Owner Schema | Description (10 words max) |
|--------------|--------------|--------------|---------------------------|
| FACT_TABLE | company_identity | cl | Master table for PASS companies |
| CANDIDATE_TABLE | company_candidate | cl | Intake candidates pending verification |
| ARCHIVE_TABLE | company_identity_archive | cl | Archived FAIL companies |
| BRIDGE_TABLE | company_identity_bridge | cl | Source ID to Sovereign ID mapping |
| NAMES_TABLE | company_names | cl | Name variants per company |
| DOMAINS_TABLE | company_domains | cl | Domain records for companies |
| CONFIDENCE_TABLE | identity_confidence | cl | Confidence scores per company |

---

## Intent Layer Bindings

Map generic concepts to your domain's implementation.

| Generic Role | Domain Column/Table | Data Type | Description (10 words max) |
|--------------|---------------------|-----------|---------------------------|
| LIFECYCLE_STATE | eligibility_status | ENUM | PROSPECT, OUTREACH, SALES, CLIENT stages |
| VERIFICATION_STATUS | verification_status | ENUM | PENDING, VERIFIED, FAILED verification gate |
| FINAL_OUTCOME | final_outcome | ENUM | PASS or FAIL admission decision |
| ENTITY_ROLE | entity_role | ENUM | COMPANY, PERSON, UNKNOWN classification |

---

## Lane Definitions

Define data isolation boundaries within this domain.

| Lane Name | Tables Included | Isolation Rule |
|-----------|-----------------|----------------|
| INTAKE_LANE | company_candidate | No direct writes to company_identity |
| IDENTITY_LANE | company_identity, company_names, company_domains | Read-only from external hubs |
| ARCHIVE_LANE | company_identity_archive, cl_errors_archive | Append-only, no modifications |

---

## Downstream Consumers (Read-Only)

| Consumer | Access Level | Tables Exposed |
|----------|--------------|----------------|
| Outreach Hub | READ | v_company_promotable |
| Sales Hub | READ | v_company_lifecycle_status |
| Client Hub | READ | v_company_lifecycle_status |

---

## Forbidden Joins

| Source Table | Target Table | Reason |
|--------------|--------------|--------|
| company_candidate | company_identity | Candidates must pass verification gate first |
| cl_errors_archive | company_identity | Archived errors are historical record only |

---

## Domain Lifecycle States

| State | Maps To Canonical | Description |
|-------|-------------------|-------------|
| PROSPECT | ACTIVE | Company identified but not contacted |
| OUTREACH | ACTIVE | Active outreach in progress |
| SALES | ACTIVE | In sales pipeline |
| CLIENT | ACTIVE | Converted to paying client |
| CHURNED | TERMINATED | Former client, relationship ended |

---

## Lifecycle Pointers

| Pointer | Target Hub | Write Policy |
|---------|-----------|--------------|
| outreach_id | Outreach Hub | Write-once, trigger enforced |
| sales_process_id | Sales Hub | Write-once, trigger enforced |
| client_id | Client Hub | Write-once, trigger enforced |

---

## Binding Completeness Check

Before this file is valid, verify:

- [x] Domain Name: Non-placeholder value
- [x] Sovereign Reference: Valid CC-01 ID
- [x] Hub ID: Valid CC-02 ID
- [x] At least 1 Fact Schema binding
- [x] LIFECYCLE_STATE binding present
- [x] At least 1 Lane definition (if multiple data contexts)
- [x] All Lifecycle States map to canonical
- [x] NO SQL, code, or logic present
- [x] NO brackets [ ] remain in values

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-29 |
| Last Modified | 2026-01-29 |
| Version | 1.0.0 |
| Status | ACTIVE |
| Parent Doctrine | IMO-Creator |
| Validated | YES |
