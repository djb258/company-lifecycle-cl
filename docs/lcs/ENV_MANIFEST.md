# LCS Environment Variable Manifest v2.3.0

Generated from `grep -r 'process\.env\|Deno\.env\|import\.meta\.env' src/ supabase/`

---

## Required Variables

| Variable | Source File(s) | Description | Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `data/integrations/supabase/client.ts` | Supabase project URL (Vite client) | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `data/integrations/supabase/client.ts` | Supabase anon key (Vite client) | `eyJhbGci...` |
| `SUPABASE_URL` | Edge Functions (Deno) | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (Deno) | Supabase service role key | `eyJhbGci...` |
| `MAILGUN_API_KEY` | `app/lcs/adapters/mailgun-adapter.ts` | Mailgun API key | `key-xxxx...` |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | `lcs-mailgun-webhook`, `lcs-inbound-reply` Edge Functions | Mailgun webhook HMAC signing key / inbound reply auth secret | `key-xxxx...` |
| `HEYREACH_API_KEY` | `app/lcs/adapters/heyreach-adapter.ts` | HeyReach API bearer token | `hr_xxxx...` |
| `HEYREACH_WEBHOOK_SECRET` | `supabase/functions/lcs-heyreach-webhook/index.ts` | HeyReach webhook auth secret | `secret_xxxx...` |

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

All variables are managed through **Doppler** under the **company-lifecycle-cl** project. No `.env` files. CL pulls from the Doppler config.

| Context | Method |
|---|---|
| Vite (client-side) | Doppler injects `VITE_*` vars at build time |
| Edge Functions (Deno) | `supabase secrets set` (synced from Doppler) |
| Server-side (Node/ts-node) | `doppler run --project company-lifecycle-cl --` prefix |
| pg_cron (SQL context) | `current_setting('app.settings.xxx')` via dashboard |

## Edge Functions

| Function | Trigger | Auth Method |
|---|---|---|
| `lcs-heyreach-webhook` | HeyReach webhook POST | `HEYREACH_WEBHOOK_SECRET` header |
| `lcs-mailgun-webhook` | Mailgun delivery webhook POST | HMAC-SHA256 via `MAILGUN_WEBHOOK_SIGNING_KEY` |
| `lcs-inbound-reply` | Cloudflare Email Routing POST (via Worker) | `MAILGUN_WEBHOOK_SIGNING_KEY` via `x-webhook-secret` header |
