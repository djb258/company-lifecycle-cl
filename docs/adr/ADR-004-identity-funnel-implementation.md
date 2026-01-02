# ADR-004: Identity Funnel Implementation

## Status

**Accepted** — 2026-01-02

## Context

After Gate Zero authorization and sovereign identity minting, CL needed a systematic way to:

1. Verify company existence (domain resolution)
2. Normalize and canonicalize names
3. Ensure domain-name coherence
4. Detect and resolve identity collisions
5. Validate firmographic consistency

This required a multi-pass funnel with deterministic, cost-bounded execution.

## Decision

### Funnel Architecture

Implement a 5-pass identity funnel with the following characteristics:

1. **Cost-first, accuracy-second** — All passes deterministic before LLM
2. **Idempotent** — Each pass skips already-processed records
3. **Batch execution** — 100-500 records per batch
4. **Kill switches** — Error rate and cost thresholds
5. **Unified error table** — Single `cl.cl_errors` with pass discriminator

### Pass Order (Locked)

| Pass | Name | Purpose | Cost |
|------|------|---------|------|
| 1 | Existence Verification | Prove company exists via domain resolution | $0 |
| 2 | Name Canonicalization | Normalize names, extract aliases | $0 |
| 3 | Domain-Name Coherence | Ensure domain matches company name | $0 |
| 4 | Collision Detection | Find and resolve duplicate identities | $0* |
| 5 | Firmographic Coherence | Validate data consistency | $0 |

*Pass 4 has optional LLM escalation, feature-flagged off by default.

### Schema (Frozen)

Five tables only:

1. `cl.company_identity` — Spine table (extended)
2. `cl.company_names` — Name sidecar (canonical + aliases)
3. `cl.company_domains` — Domain sidecar (health + coherence)
4. `cl.cl_errors` — Unified error table with `pass_name` discriminator
5. `cl.identity_confidence` — Confidence envelope (HIGH/MEDIUM/LOW/UNVERIFIED)

### Confidence Scoring

```
Base: 20 (existence verified) or 0 (not verified)
+ name_match >= 70: +60 pts
+ name_match >= 40: +40 pts
+ canonical_name: +5 pts
+ multiple_aliases: +5 pts
+ domain_confidence >= 80: +10 pts
+ unresolved_collision: -20 pts
+ firmographic_verified: +5 pts
```

Buckets:
- HIGH: 70-100
- MEDIUM: 40-69
- LOW: 20-39
- UNVERIFIED: 0-19

## Consequences

### Positive

- Zero-cost verification for 71,820 companies
- Deterministic, reproducible results
- Clear confidence scoring for downstream consumers
- Unified error handling across all passes
- Idempotent execution allows re-runs

### Negative

- LLM collision resolution disabled (deterministic only)
- 62k original companies required re-verification (reset from FALSE to NULL)
- Verification throughput limited to ~1.6/sec by domain timeouts

### Risks Mitigated

- **Cost overrun**: All passes $0, LLM gated
- **Data quality**: Multi-pass validation catches issues early
- **Duplicates**: Collision detection finds 4,332 collisions
- **False confidence**: Conservative scoring, requires verification

## Implementation

### Scripts

| Script | Purpose |
|--------|---------|
| `pass-2-name-canonicalization.js` | Name normalization |
| `pass-3-domain-coherence.js` | Domain-name matching |
| `pass-4-collision-detection.js` | Duplicate detection |
| `pass-5-firmographic-coherence.js` | Data validation |
| `recompute-confidence.js` | Score recalculation |
| `existence-verification-worker.js` | Domain resolution |

### Results (2026-01-02)

| Metric | Count |
|--------|-------|
| Total companies | 71,820 |
| Existence verified | 9,494 |
| Canonical names | 9,486 |
| Collisions detected | 4,332 |
| HIGH confidence | 4,809 |
| MEDIUM confidence | 4,530 |
| LOW confidence | 155 |
| UNVERIFIED | 62,326* |

*UNVERIFIED includes original 61k bootstrap currently undergoing verification.

## References

- PRD: `docs/prd/PRD-COMPANY-LIFECYCLE.md`
- Pass Contracts: `docs/CL_PASS_CONTRACTS.md`
- Funnel Report: `docs/CL_FUNNEL_REPORT.md`
- Previous ADR: ADR-003 (Identity Anchor & State Expansion)

## Approval

| Role | Name | Date |
|------|------|------|
| Hub Owner | SHQ | 2026-01-02 |
