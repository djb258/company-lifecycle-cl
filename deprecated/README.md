# Deprecated Pipeline Files

**STATUS: DEPRECATED — DO NOT USE**

These files represent the old NC-specific pipeline that violated the sovereign intake contract.

## Why Deprecated

1. **State was CODE, not DATA** — NC was hardcoded in logic
2. **Identity minted BEFORE verification** — Irreversible writes before validation
3. **Disconnected from canonical intake** — Did not use `cl.company_candidate`
4. **Non-generalizable** — Adding new states required code changes

## Violations Fixed

| Violation | Old Behavior | New Behavior |
|-----------|--------------|--------------|
| State handling | Hardcoded "NC" | `state_code` parameter |
| Intake path | Direct Excel → Identity | Excel → `cl.company_candidate` |
| Verification timing | Post-hoc | Pre-minting gate |
| Identity minting | Before verification | Only after verification PASS |

## New Pipeline

Use `pipeline/orchestrator.js` for all lifecycle operations:

```bash
# Process all pending states
node pipeline/orchestrator.js

# Process single state
node pipeline/orchestrator.js --state NC
```

## Files in This Directory

| File | Original Purpose | Why Deprecated |
|------|------------------|----------------|
| `nc-phases-b-f.js` | NC Excel batch loader | Minted IDs before verification |
| `nc-phase-a-validation.js` | NC validation | Hardcoded NC state |
| `pass-2-name-canonicalization.js` | Name normalization | Post-hoc verification |
| `pass-3-domain-coherence.js` | Domain validation | Post-hoc verification |
| `pass-4-collision-detection.js` | Dedup logic | Runs after minting |
| `pass-5-firmographic-coherence.js` | Firmographic checks | Post-hoc verification |
| `phase-d-error-routing.js` | Error handling | Old pipeline specific |
| `phase-e-audit.js` | Audit logging | Old pipeline specific |
| `recompute-confidence.js` | Confidence scoring | Post-hoc operation |
| `integrate-existence-pass.js` | Existence integration | Old schema |
| `hardening-bootstrap.js` | Schema hardening | One-time migration |

## DO NOT

- ❌ Import these files
- ❌ Execute these files directly
- ❌ Reference these patterns in new code
- ❌ Restore these files to active use

## Correct Approach

```
Source Adapter (NC, TX, etc.)
    ↓
cl.company_candidate (staging)
    ↓
verifyCandidate() (validation gate)
    ↓
IF PASS: INSERT cl.company_identity (irreversible)
IF FAIL: Record error only
```

**Deprecated on:** 2026-01-05
**Reason:** Architectural correction to enforce verification-before-minting
