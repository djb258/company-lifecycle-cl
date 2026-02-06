# CLAUDE.md — Company Lifecycle (CL) Hub

## IDENTITY

This is a **child repository** governed by **imo-creator**.

**Hub Name**: Company Lifecycle
**Hub ID**: HUB-CL-001
**Authority**: Inherited from imo-creator (CC-01)
**Domain Spec**: `doctrine/REPO_DOMAIN_SPEC.md`
**Purpose**: Sovereign authority for company identity minting, verification, and lifecycle state management

---

## CANONICAL REFERENCE

| Template | imo-creator Path | Version |
|----------|------------------|---------|
| Architecture | `templates/doctrine/ARCHITECTURE.md` | 2.0.0 |
| Tools | `templates/integrations/TOOLS.md` | 1.1.0 |
| OSAM | `templates/semantic/OSAM.md` | 1.0.0 |
| PRD | `templates/prd/PRD_HUB.md` | 1.0.0 |
| ADR | `templates/adr/ADR.md` | 1.0.0 |
| Checklist | `templates/checklists/HUB_COMPLIANCE.md` | 1.0.0 |

---

## LOCKED FILES (READ-ONLY)

The following CL-specific files are **LOCKED**. Claude Code may READ them but may NEVER modify them.

### CL Domain Doctrine

| File | Purpose |
|------|---------|
| `docs/doctrine/CL_DOCTRINE.md` | Sovereign hub definition — what CL owns, lifecycle states, topology |
| `docs/doctrine/INVARIANTS_AND_KILL_SWITCHES.md` | 20 invariants, 10 kill switches, violation protocol |
| `docs/doctrine/COMPANY_LIFECYCLE_LOCK.md` | Non-negotiable intake rules, compile-time guards |
| `docs/doctrine/CONCEPTUAL_SCHEMA.md` | Conceptual data definitions — concepts and invariants |
| `docs/doctrine/AIR_DOCTRINE.md` | Action/Incident/Result telemetry contract |

### Domain Binding

| File | Purpose |
|------|---------|
| `doctrine/REPO_DOMAIN_SPEC.md` | Domain bindings — maps generic roles to CL tables (GUARDSPEC-required) |

### Governance

| File | Purpose |
|------|---------|
| `CONSTITUTION.md` | Governing scope — what is and isn't governed |
| `DOCTRINE.md` | Conformance declaration — parent reference and binding docs |
| `IMO_CONTROL.json` | Control plane contract — lifecycle phases, structure model |
| `REGISTRY.yaml` | Hub identity — sub-hubs, spokes, document control |

---

## TOOL DOCTRINE

Before suggesting ANY tool, library, or vendor:

1. Check `templates/SNAP_ON_TOOLBOX.yaml` BANNED list first
2. Prefer TIER 0 (FREE) tools
3. Then TIER 1 (CHEAP)
4. Then TIER 2 (SURGICAL) — gated, require conditions
5. If NOT LISTED — ASK, may need ADR

**LLM is tail, not spine. Deterministic logic first, AI assists only.**

---

## CL HUB ARCHITECTURE

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite (port 8080)
- **UI**: Radix UI (shadcn/ui) + Tailwind CSS
- **Database**: PostgreSQL (Neon) — schema `cl`
- **Auth**: Supabase
- **State**: TanStack React Query
- **Secrets**: Doppler
- **CI**: GitHub Actions

### CTB Structure

```
src/
├── sys/    → System infrastructure (main.tsx entry point)
├── data/   → Supabase client, generated types
├── app/    → Hooks, business logic
├── ai/     → AI components (empty)
└── ui/     → Pages, components, styles
```

### Key Database Tables

| Table | Schema | Purpose |
|-------|--------|---------|
| `company_identity` | cl | Sovereign identity registry (106k+ rows) |
| `company_candidate` | cl | Intake staging |
| `company_identity_bridge` | cl | Source ↔ sovereign mapping |
| `company_names` | cl | Name variants |
| `company_domains` | cl | Domain records |
| `identity_confidence` | cl | Confidence scoring |

### Pipeline Architecture

```
Source Adapters → Intake Service → Lifecycle Worker → Identity Table
                  (company_candidate)  (verify + mint)   (company_identity)
```

- **Entry**: `pipeline/ingest.js --source [STATE] --file [PATH]`
- **Orchestrator**: `pipeline/orchestrator.js --state [STATE]`
- **Adapters**: NC Excel (`source_nc_excel.js`), DE CSV (`source_de_csv.js`)
- **All adapters extend**: `StateCsvSourceAdapter` (invariant enforcement)

### Hard Invariant

```
IF any code path mints identity WITHOUT verifyCandidate() THEN build is INVALID
```

---

## WHAT CLAUDE CODE CAN DO IN THIS REPO

| Action | Permitted |
|--------|-----------|
| Read all files | YES |
| Modify source code (`src/`, `pipeline/`, `scripts/`, `neon/`) | YES |
| Create new source files | YES |
| Modify CI workflows | YES (with care) |
| Modify doctrine files | NO — LOCKED |
| Modify `doctrine/REPO_DOMAIN_SPEC.md` | NO — LOCKED |
| Modify `IMO_CONTROL.json` governance rules | NO — only `upstream_commit` field |
| Create forbidden directories (`utils/`, `helpers/`, `lib/`, `common/`, `shared/`, `misc/`) | NO |

---

## FORBIDDEN PATTERNS

| Pattern | Why |
|---------|-----|
| `src/utils/`, `src/helpers/`, `src/lib/`, `src/common/`, `src/shared/`, `src/misc/` | CTB violation — use proper branch |
| Direct INSERT to `cl.company_identity` outside `lifecycle_worker.js` | Bypass verification invariant |
| Import of deprecated files | Use canonical pipeline only |
| Hardcoded connection strings | Use Doppler/env vars |
| Identity minting without `verifyCandidate()` | Doctrine violation |

---

## GOLDEN RULES

1. **This repo conforms to imo-creator. Parent defines, we conform.**
2. **CL is the sovereign authority for company identity. All other hubs serve CL.**
3. **Locked files are law. Read, don't touch.**
4. **`company_unique_id` is immutable once minted.**
5. **Verification before minting. Always.**
6. **Determinism first. LLM as tail only.**
7. **State is data, not code. All states use the same verification logic.**

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-06 |
| Last Modified | 2026-02-06 |
| Status | ACTIVE |
| Authority | HUB-CL-001 / SHQ |
