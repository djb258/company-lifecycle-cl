# Doppler Secrets Management Template

## Hub Identity

| Field | Value |
|-------|-------|
| **Hub Name** | Company Lifecycle Hub |
| **Hub ID** | HUB-CL-001 |
| **Doppler Project** | company-lifecycle-cl |

---

## Overview

All hubs MUST use Doppler for secrets management.

**No exceptions. No local `.env` files in production.**

---

## Required Configuration

### doppler.yaml

Every hub MUST have a `doppler.yaml` at the root:

```yaml
setup:
  project: company-lifecycle-cl
  config: dev
```

### Environment Configs

| Config | Purpose | Sync Target |
|--------|---------|-------------|
| `dev` | Local development | Local machine |
| `stg` | Staging environment | Staging server |
| `prd` | Production environment | Production server |

---

## Required Secrets (All Hubs)

| Secret | Description | Required |
|--------|-------------|----------|
| `HUB_ID` | Unique hub identifier | Yes |
| `PROCESS_ID` | Execution trace ID | Yes |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `COMPOSIO_API_KEY` | Composio integration | If using Composio |
| `ANTHROPIC_API_KEY` | Claude integration | If using AI |
| `OPENAI_API_KEY` | OpenAI integration | If using AI |

---

## Setup Commands

```bash
# Install Doppler CLI
brew install dopplerhq/cli/doppler  # macOS
# or
curl -Ls https://cli.doppler.com/install.sh | sh  # Linux

# Login
doppler login

# Setup project
doppler setup

# Run with secrets
doppler run -- <your-command>

# Example: Run Vite dev server
doppler run -- npm run dev

# Example: Run production build
doppler run -- npm run build
```

---

## Local Development

For local development, create a `.env` file from Doppler:

```bash
# Export secrets to .env (dev only)
doppler secrets download --no-file --format env > .env

# Or run directly with Doppler
doppler run -- npm start
```

**Never commit `.env` files.** They are gitignored.

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Doppler CLI
  uses: dopplerhq/cli-action@v3

- name: Run with Doppler
  run: doppler run -- npm run build
  env:
    DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
```

### Vercel

```bash
# Sync to Vercel
doppler secrets download --no-file --format env | vercel env add
```

---

## Secret Rotation

| Secret Type | Rotation Frequency |
|-------------|-------------------|
| API Keys | 90 days |
| Tokens | 30 days |
| Passwords | 90 days |

---

## Compliance Checklist

- [ ] `doppler.yaml` exists at hub root
- [ ] Project created in Doppler dashboard
- [ ] dev/stg/prd configs created
- [ ] All secrets stored in Doppler
- [ ] No secrets in code or `.env` committed
- [ ] CI/CD uses Doppler token
- [ ] Rotation schedule documented

---

## Traceability

| Artifact | Reference |
|----------|-----------|
| PRD | PRD-COMPANY-LIFECYCLE |
| ADR | |
| Linear Issue | |
