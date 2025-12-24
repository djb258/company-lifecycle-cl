# Copilot Instructions for Company Lifecycle Hub

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |
| **CTB Version** | 1.0.0 |

---

## Architecture Overview

This repository follows the **Hub & Spoke Architecture** defined in `templates/doctrine/HUB_SPOKE_ARCHITECTURE.md`.

### Key Principles

1. **Hub = Application** — This repo contains exactly ONE hub
2. **Spokes = Interfaces** — Spokes carry data only, no logic
3. **IMO Model** — All processing follows Ingress → Middle → Egress flow
4. **CTB Placement** — Files are organized by altitude (40k → 5k)

---

## IMO Structure

| Layer | Role | Location |
|-------|------|----------|
| **I (Ingress)** | Data input, validation only | `src/components/forms/`, `src/lib/validation/` |
| **M (Middle)** | All logic, state, decisions | `src/lib/lifecycle/`, `src/hooks/useLifecycle*` |
| **O (Egress)** | Output, notifications | `src/components/display/`, `src/lib/export/` |

---

## Code Generation Rules

### DO:
- Place logic in the M (Middle) layer only
- Keep UI components dumb (I layer receives, O layer displays)
- Use Supabase for persistence
- Follow existing patterns in the codebase
- Reference PRD when making architectural decisions
- Use TypeScript with strict typing

### DON'T:
- Add business logic to UI components
- Create cross-hub dependencies
- Add state management to spokes
- Hardcode secrets (use Doppler)
- Skip validation in the I layer
- Generate code without reading the PRD

---

## File Organization (CTB)

```
40k (Doctrine):     templates/doctrine/, global-config/
                    ↓
40k (System):       supabase/, src/lib/supabase/, src/integrations/
                    ↓
20k (IMO):          src/lib/lifecycle/, src/lib/validation/
                    ↓
10k (UI):           src/components/, src/pages/
                    ↓
5k (Operations):    scripts/, .github/workflows/
```

---

## Before Generating Code

1. Read `docs/prd/PRD-COMPANY-LIFECYCLE.md`
2. Check if an ADR exists for the decision
3. Identify which IMO layer the code belongs to
4. Verify CTB placement is correct

---

## Testing Requirements

- Unit tests for M layer logic
- Integration tests for I/O layer interfaces
- No mocking of hub internals in spoke tests

---

## Related Documentation

- Hub PRD: `docs/prd/PRD-COMPANY-LIFECYCLE.md`
- Architecture Doctrine: `templates/doctrine/HUB_SPOKE_ARCHITECTURE.md`
- Altitude Model: `templates/doctrine/ALTITUDE_DESCENT_MODEL.md`
- CTB Branch Map: `global-config/ctb.branchmap.yaml`
