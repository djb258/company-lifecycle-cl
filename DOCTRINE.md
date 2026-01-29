# Doctrine Reference

This repository is governed by **IMO-Creator**.

---

## Conformance Declaration

| Field | Value |
|-------|-------|
| **Parent** | imo-creator |
| **Sovereignty** | INHERITED |
| **Doctrine Version** | 1.2.0 |
| **CTB Version** | 1.0.0 |

---

## Realignment Status

| Field | Value |
|-------|-------|
| **Mode** | CTB Realignment (Legacy Repo) |
| **Scope** | Structural changes only |
| **Logic Changes** | PROHIBITED |
| **Neon Changes** | PROHIBITED |

This repository is undergoing CTB structural realignment to achieve compliance with IMO-Creator templates. All changes during this process are mechanical (file moves, import updates) with no business logic modifications.

---

## Binding Documents

This repository conforms to the following doctrine files from IMO-Creator:

| Document | Purpose | Location |
|----------|---------|----------|
| CANONICAL_ARCHITECTURE_DOCTRINE.md | Operating physics | imo-creator/templates/doctrine/ |
| ALTITUDE_DESCENT_MODEL.md | CC descent sequence | imo-creator/templates/doctrine/ |
| TEMPLATE_IMMUTABILITY.md | AI modification prohibition | imo-creator/templates/doctrine/ |
| SNAP_ON_TOOLBOX.yaml | Tool registry | imo-creator/templates/ |
| IMO_SYSTEM_SPEC.md | System index | imo-creator/templates/ |
| AI_EMPLOYEE_OPERATING_CONTRACT.md | Agent constraints | imo-creator/templates/ |

---

## Domain-Specific Bindings

This repository's domain-specific bindings are declared in:

```
doctrine/REPO_DOMAIN_SPEC.md
```

This file maps generic roles to domain-specific tables and concepts.

---

## Authority Rule

> Parent doctrine is READ-ONLY.
> Domain specifics live in REPO_DOMAIN_SPEC.md.
> If rules conflict, parent wins.

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-29 |
| Last Modified | 2026-01-29 |
| Status | ACTIVE |
