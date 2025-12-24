# HEIR Compliance Template

**HEIR = Hub Environment Identity Record**

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |
| **Schema Version** | HEIR/1.0 |

---

## Overview

Every hub MUST have a `heir.doctrine.yaml` file at the root for compliance validation.

> **HEIR enforces doctrine programmatically.**
> **No manual checks. No trust. Only validation.**

---

## Required File: `heir.doctrine.yaml`

```yaml
meta:
  app_name: "company-lifecycle-cl"
  repo_slug: "djb258/company-lifecycle-cl"
  stack: ["react", "vite", "typescript", "supabase", "tailwindcss"]
  llm:
    providers:
      - anthropic
      - openai
    default: "anthropic"

doctrine:
  unique_id: "HUB-CL-001-${TIMESTAMP}-${RANDOM_HEX}"
  process_id: "PROC-CL-${SESSION_ID}"
  schema_version: "HEIR/1.0"
  blueprint_version_hash: "${AUTO_SHA256_OF_CANON}"
  agent_execution_signature: "${AUTO_HASH(llm+tools)}"

deliverables:
  repos:
    - name: "company-lifecycle-cl"
      visibility: private
  services:
    - name: "web"
      port: 5173
    - name: "api"
      port: 3000
  env:
    VITE_SUPABASE_URL: "${DOPPLER:SUPABASE_URL}"
    VITE_SUPABASE_ANON_KEY: "${DOPPLER:SUPABASE_ANON_KEY}"
    LLM_DEFAULT_PROVIDER: "anthropic"

contracts:
  acceptance:
    - "All HEIR checks pass in CI"
    - "Build succeeds without errors"
    - "All tests pass"

build:
  actions:
    heir_check: ["heir.check"]
    ci_checks: ["npm run build", "npm run lint"]
    telemetry_events: ["app.start", "lifecycle.transition"]
```

---

## HEIR Validation Checks

| Check | What It Validates |
|-------|-------------------|
| **Meta** | app_name, repo_slug, stack, LLM providers |
| **Doctrine** | unique_id, process_id, schema_version |
| **Deliverables** | repos, services, env vars |
| **Contracts** | acceptance criteria defined |
| **Build** | CI checks, telemetry events |
| **Manifest** | IMO manifest integration |

---

## Running HEIR Checks

```bash
# Run validation
npm run heir:check

# Expected output
[INFO] Running HEIR validation checks...
  Checking Meta configuration... PASSED
  Checking Doctrine fields... PASSED
  Checking Deliverables... PASSED
  Checking Contracts... PASSED
  Checking Build configuration... PASSED

==================================================
HEIR Validation Summary
==================================================

[SUCCESS] All checks passed! Hub is HEIR-compliant.
```

---

## CI Integration

### GitHub Actions

```yaml
- name: Run HEIR Compliance Checks
  run: npm run heir:check

- name: Fail if not compliant
  if: failure()
  run: |
    echo "HEIR compliance failed. Fix errors before merging."
    exit 1
```

---

## Required Fields

### Meta Section
| Field | Required | Description |
|-------|----------|-------------|
| `app_name` | Yes | Hub name |
| `repo_slug` | Yes | GitHub org/repo |
| `stack` | Yes | Technology stack array |
| `llm.providers` | Yes | LLM providers array |
| `llm.default` | Yes | Default provider |

### Doctrine Section
| Field | Required | Description |
|-------|----------|-------------|
| `unique_id` | Yes | Hub ID pattern |
| `process_id` | Yes | Process ID pattern |
| `schema_version` | Yes | Must be "HEIR/1.0" |

### Deliverables Section
| Field | Required | Description |
|-------|----------|-------------|
| `services` | Yes | Must include web service |
| `env` | Yes | Required environment variables |

---

## Doppler Integration

All secrets in `heir.doctrine.yaml` should reference Doppler:

```yaml
env:
  VITE_SUPABASE_URL: "${DOPPLER:SUPABASE_URL}"
  VITE_SUPABASE_ANON_KEY: "${DOPPLER:SUPABASE_ANON_KEY}"
  ANTHROPIC_API_KEY: "${DOPPLER:ANTHROPIC_API_KEY}"
```

---

## Compliance Checklist

- [ ] `heir.doctrine.yaml` exists at hub root
- [ ] Meta section complete
- [ ] Doctrine IDs defined
- [ ] Services defined
- [ ] Environment variables reference Doppler
- [ ] CI runs HEIR checks
- [ ] All checks pass

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| PRD | PRD-COMPANY-LIFECYCLE |
| ADR | |
| Linear Issue | |
