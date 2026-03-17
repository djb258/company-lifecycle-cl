# LCS Environment Variable Manifest v2.2.0

Generated from `grep -r 'process\.env\|Deno\.env\|import\.meta\.env' src/`

---

## Required Variables

| Variable | Source File(s) | Description | Example |
|---|---|---|---|
| `CF_D1_DATABASE_ID` | `data/integrations/d1/client.ts` | Cloudflare D1 database ID (working DB) | `xxxx-xxxx-xxxx` |
| `CF_ACCOUNT_ID` | `data/integrations/d1/client.ts` | Cloudflare account ID | `xxxx...` |
| `CF_API_TOKEN` | CF Workers | Cloudflare API token | `xxxx...` |
| `NEON_VAULT_URL` | Vault archive layer | Neon PostgreSQL vault connection string | `postgres://...` |
| `MAILGUN_API_KEY` | `app/lcs/adapters/mailgun-adapter.ts` | Mailgun API key | `key-xxxx...` |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | `runtime/lcs/webhook-handler.ts`, Edge Functions | Mailgun webhook HMAC signing key | `key-xxxx...` |
| `HEYREACH_API_KEY` | `app/lcs/adapters/heyreach-adapter.ts` | HeyReach API bearer token | `hr_xxxx...` |
| `HEYREACH_WEBHOOK_SECRET` | `runtime/lcs/webhook-handler.ts` | HeyReach webhook auth secret | `secret_xxxx...` |

## Optional Variables (with defaults)

| Variable | Default | Source | Description |
|---|---|---|---|
| `MAILGUN_API_URL` | `https://api.mailgun.net/v3` | `mailgun-adapter.ts` | Mailgun API base URL |
| `HEYREACH_API_URL` | `https://api.heyreach.io/api/v1` | `heyreach-adapter.ts` | HeyReach API base URL |
| `FOUNDER_CALENDAR_AVAILABLE` | `'true'` | `context-assembler.ts` | `'false'` blocks all sends |
| `AGENT_DAILY_CAP` | `'50'` | `context-assembler.ts` | Max sends per agent per day |
| `MIN_CONTACT_INTERVAL_DAYS` | `'14'` | `context-assembler.ts` | Min days between contacts to same entity |
| `COMPANY_WEEKLY_CAP` | `'3'` | `context-assembler.ts` | Max sends per company per week |
| `PEOPLE_FRESHNESS_DAYS` | `'30'` | `context-assembler.ts` | People data freshness window |
| `DOL_FRESHNESS_DAYS` | `'90'` | `context-assembler.ts` | DOL data freshness window |
| `BLOG_FRESHNESS_DAYS` | `'60'` | `context-assembler.ts` | Blog data freshness window |
| `SITEMAP_FRESHNESS_DAYS` | `'60'` | `context-assembler.ts` | Sitemap data freshness window |

## Where to Set

All variables are managed through **Doppler** under the **imo-creator** project. No `.env` files. CL pulls from the imo-creator Doppler config.

| Context | Method |
|---|---|
| Vite (client-side) | Doppler injects `VITE_*` vars at build time (from imo-creator) |
| CF Workers | Wrangler secrets / Doppler sync to Cloudflare |
| Server-side (Node/ts-node) | `doppler run --project imo-creator --` prefix |
| Neon vault (SQL context) | Environment variables via Doppler |
