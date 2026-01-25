# Neon Database Access via Doppler

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |
| **Doppler Project** | company-lifecycle-cl |

---

## Overview

All Neon PostgreSQL database access MUST go through Doppler secrets management.

**No hardcoded credentials. No `.env` files in production.**

---

## Doppler Configuration

### Project Setup

```yaml
# doppler.yaml
setup:
  project: company-lifecycle-cl
  config: dev
```

### Available Configs

| Config | Environment | Use Case |
|--------|-------------|----------|
| `dev` | Development | Local development |
| `stg` | Staging | Pre-production testing |
| `prd` | Production | Live environment |

---

## Neon Secrets in Doppler

| Secret | Description | Format |
|--------|-------------|--------|
| `VITE_NEON_HOST` | Neon database host | `ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech` |
| `VITE_NEON_DATABASE` | Database name | `Marketing DB` |
| `VITE_NEON_USER` | Database user | `Marketing DB_owner` |
| `VITE_NEON_PASSWORD` | Database password | `[SECURED IN DOPPLER]` |
| `VITE_DATABASE_URL` | Full connection string | `postgresql://...` |
| `HUB_ID` | Hub identifier | `HUB-CL-001` |

---

## Quick Start

### 1. Install Doppler CLI

```bash
# Windows (PowerShell)
(Invoke-WebRequest -Uri https://cli.doppler.com/install.ps1 -UseBasicParsing).Content | powershell -Command -

# macOS
brew install dopplerhq/cli/doppler

# Linux
curl -Ls https://cli.doppler.com/install.sh | sh
```

### 2. Login to Doppler

```bash
doppler login
```

### 3. Setup Project

```bash
cd company-lifecycle-cl
doppler setup
# Select: company-lifecycle-cl > dev
```

### 4. View Secrets

```bash
# View all secrets
doppler secrets

# View specific secret
doppler secrets get VITE_DATABASE_URL
```

### 5. Run with Secrets

```bash
# Run any command with Doppler secrets injected
doppler run -- node scripts/verify_and_mint.cjs

# Run npm commands
doppler run -- npm run dev
```

---

## Database Connection Examples

### Node.js (pg library)

```javascript
// Doppler injects VITE_DATABASE_URL automatically
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.VITE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
```

### Run Script with Doppler

```bash
# Instead of hardcoding connection string:
doppler run -- node scripts/verify_and_mint.cjs

# Or export to environment:
doppler run -- bash -c 'node scripts/my_script.js'
```

### Python

```python
import os
import psycopg2

# Doppler injects VITE_DATABASE_URL
conn = psycopg2.connect(os.environ['VITE_DATABASE_URL'])
```

---

## Schema Access

### CL Schema Tables

The Company Lifecycle hub uses the `cl` schema in Neon:

| Table | Purpose |
|-------|---------|
| `cl.company_identity` | Sovereign identity hub |
| `cl.company_candidate` | Staging for new companies |
| `cl.company_names` | Name variations |
| `cl.company_domains` | Domain ownership |
| `cl.identity_confidence` | Confidence scoring |
| `cl.cl_errors` | Error tracking |

### Query Example

```bash
# Run a query via Doppler
doppler run -- node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.VITE_DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT COUNT(*) FROM cl.company_identity').then(r => console.log(r.rows[0])).finally(() => pool.end());
"
```

---

## Security Rules

| Rule | Enforcement |
|------|-------------|
| No credentials in code | MANDATORY |
| No `.env` files committed | MANDATORY |
| Use Doppler for all secrets | MANDATORY |
| Rotate credentials every 90 days | RECOMMENDED |
| Use connection pooler | MANDATORY |

---

## Troubleshooting

### Cannot Find Project

```bash
# List available projects
doppler projects

# Ensure you're authenticated
doppler login
```

### Connection Refused

```bash
# Verify secrets are loaded
doppler secrets

# Test connection
doppler run -- node -e "console.log(process.env.VITE_DATABASE_URL)"
```

### SSL Issues

Always use `ssl: { rejectUnauthorized: false }` for Neon pooler connections.

---

## Compliance Checklist

- [x] `doppler.yaml` exists at hub root
- [x] Project created in Doppler dashboard
- [x] dev config created
- [x] All Neon secrets stored in Doppler
- [x] No secrets in code or `.env` committed
- [ ] CI/CD uses Doppler token
- [ ] Rotation schedule documented

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| Doppler Project | `company-lifecycle-cl` |
| Neon Database | `Marketing DB` |
| Schema | `cl` |
| Hub ID | `HUB-CL-001` |

---

## Document Control

| Field | Value |
|-------|-------|
| Created | 2026-01-25 |
| Last Modified | 2026-01-25 |
| Status | ACTIVE |
| Authority | IMO Audit |
