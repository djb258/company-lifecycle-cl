# PRD: Neon Agent

## Overview

The Neon Agent is a database administration tool for the Company Lifecycle (CL) system. It enforces structure and movement across the 4-hub architecture without inventing business logic.

## Problem Statement

The CL system needs a controlled, auditable way to:
- Run schema migrations
- Monitor data quality
- Enforce stage gates
- Manage company promotions between lifecycle stages

Manual database operations are error-prone and lack auditability.

## Goals

1. **Enforce structure** - Ensure schema integrity across all hubs
2. **Enforce movement** - Gate companies between stages based on eligibility
3. **Provide visibility** - Audit data quality and system health
4. **Enable automation** - Support CLI, cron, and webhook invocation

## Non-Goals

- Invent business logic
- Guess intent
- Rewrite identity
- Run enrichment
- Make decisions about company verification

## Architecture

### 4-Hub Model

```
Hub 1: company_cl     → Sovereign identity, verification
Hub 2: outreach       → Engagement, DOL, people, blog
Hub 3: sales          → Pipeline (shell, Lovable vault)
Hub 4: client         → Customers (shell, Lovable vault)
```

### Agent Responsibilities

| Mode | Trigger | Actions |
|------|---------|---------|
| CLI | Manual | Migrations, backfills, one-off checks |
| Cron | Scheduled | Batch runs, refreshes, audits |
| Webhook | Event | Stage promotions |

## Commands

### `neon-agent migrate`

Run database migrations.

```bash
neon-agent migrate              # Run all pending migrations
neon-agent migrate --dry-run    # Preview changes
neon-agent migrate --rollback   # Rollback last migration
```

### `neon-agent audit`

Run data quality checks.

```bash
neon-agent audit                # Full audit
neon-agent audit --schema cl    # Audit specific schema
neon-agent audit --counts-only  # Just table counts
```

### `neon-agent gate`

Check gate eligibility.

```bash
neon-agent gate --summary                    # Gate statistics
neon-agent gate --company <uuid>             # Check specific company
neon-agent gate --stage cl-to-outreach       # Check specific gate
```

### `neon-agent promote`

Move companies between stages.

```bash
neon-agent promote --from cl --to outreach --batch 100
neon-agent promote --company <uuid> --dry-run
```

### `neon-agent health`

System health checks.

```bash
neon-agent health               # All checks
neon-agent health --connection  # Database connection
neon-agent health --schemas     # Schema integrity
neon-agent health --gates       # Gate constraints
```

### `neon-agent sync`

Sync identity status with verification results.

```bash
neon-agent sync             # Sync PENDING records
neon-agent sync --dry-run   # Preview changes
neon-agent sync --force     # Re-sync all records
```

## Gate Rules

| Gate | Condition | Enforcement |
|------|-----------|-------------|
| CL → Outreach | `identity_status = 'PASS'` | Database trigger + agent check |
| Outreach → Sales | Human signal | Outreach repo |
| Sales → Client | Contract executed | Lovable |

## Data Model

### company_identity (Hub 1)

```sql
company_unique_id UUID PRIMARY KEY  -- Sovereign ID
identity_status TEXT                 -- PENDING | PASS | FAIL
existence_verified BOOLEAN           -- Verification result
```

### Eligibility View

```sql
SELECT * FROM cl.v_company_identity_eligible
WHERE eligible_for_outreach = TRUE;
```

## Success Metrics

- Zero unauthorized stage promotions
- 100% migration success rate
- < 1 minute audit execution time
- Zero data quality regressions

## Security

- Agent does not store credentials (uses environment variables)
- All operations are logged
- Destructive operations require explicit flags
- Rollback capability for migrations

## Future Enhancements

- Webhook endpoints for external triggers
- Slack notifications for gate failures
- Automated backfill scheduling
- Multi-tenant support
