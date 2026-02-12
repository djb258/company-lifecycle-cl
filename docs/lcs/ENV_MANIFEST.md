# LCS Environment Variable Manifest v2.2.0

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
| `MAILGUN_WEBHOOK_SIGNING_KEY` | `runtime/lcs/webhook-handler.ts`, Edge Functions | Mailgun webhook HMAC signing key | `key-xxxx...` |
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

## Where to Set

All variables are managed through **Doppler** under the **imo-creator** project. No `.env` files. CL pulls from the imo-creator Doppler config.

| Context | Method |
|---|---|
| Vite (client-side) | Doppler injects `VITE_*` vars at build time (from imo-creator) |
| Edge Functions (Deno) | `supabase secrets set` (synced from imo-creator Doppler) |
| Server-side (Node/ts-node) | `doppler run --project imo-creator --` prefix |
| pg_cron (SQL context) | `current_setting('app.settings.xxx')` via Supabase dashboard |
