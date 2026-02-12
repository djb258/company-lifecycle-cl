# LCS Deployment Checklist v2.2.0

Execute in order. Each phase depends on the previous one completing successfully.

---

## Phase 0 — Pre-Flight Verification

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] All Prompts 1–14 committed to Git
- [ ] Neon database accessible via connection string
- [ ] Supabase project active and accessible
- [ ] imo-creator Doppler project configured with all required variables (see ENV_MANIFEST.md)

## Phase 1 — Schema Deployment

Run migrations in order against Neon:

```bash
# Option A: Direct psql
psql $NEON_CONNECTION_STRING -f migrations/lcs/001_lcs_schema_v2.2.0.sql

# Option B: Via Doppler
doppler run -- psql -f migrations/lcs/001_lcs_schema_v2.2.0.sql
```

- [ ] `001_lcs_schema_v2.2.0.sql` — Schema + tables + matviews + RPC
- [ ] Verify: `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'lcs';` → 6 tables
- [ ] Verify: `SELECT count(*) FROM pg_matviews WHERE schemaname = 'lcs';` → 3 matviews
- [ ] Verify: `SELECT proname FROM pg_proc WHERE pronamespace = 'lcs'::regnamespace;` → 1 function (refresh_lcs_matview)

## Phase 2 — Seed Data

- [ ] `002_lcs_seed_registries.sql` — Adapter, signal, frame registry rows
- [ ] Verify: `SELECT count(*) FROM lcs.adapter_registry;` → 3
- [ ] Verify: `SELECT count(*) FROM lcs.signal_registry;` → 9
- [ ] Verify: `SELECT count(*) FROM lcs.frame_registry;` → 10

## Phase 3 — Signal Bridge

- [ ] `003_lcs_signal_bridge.sql` — Bridge function
- [ ] Verify: `SELECT proname FROM pg_proc WHERE pronamespace = 'lcs'::regnamespace;` → 2 functions (refresh_lcs_matview + bridge_pressure_signals)
- [ ] Verify: `SELECT lcs.bridge_pressure_signals();` — should return 3 rows (PEOPLE, DOL, BLOG)
- [ ] Check signal_queue: `SELECT count(*) FROM lcs.signal_queue WHERE status = 'PENDING';`

## Phase 4 — PostgREST Schema Exposure

- [ ] In Supabase dashboard → Settings → API → Exposed schemas: add `lcs`
- [ ] Verify: Supabase client `.schema('lcs').from('event').select('*').limit(1)` succeeds

## Phase 5 — External Service Configuration

### Mailgun
- [ ] API key set in imo-creator Doppler: `MAILGUN_API_KEY`
- [ ] Webhook signing key set in imo-creator Doppler: `MAILGUN_WEBHOOK_SIGNING_KEY`
- [ ] Sending domains verified in Mailgun dashboard
- [ ] Sending domains added to adapter_registry:
  ```sql
  UPDATE lcs.adapter_registry
  SET domain_rotation_config = jsonb_set(
    domain_rotation_config, '{domains}',
    '["domain1.com", "domain2.com", "domain3.com"]'
  )
  WHERE adapter_type = 'MG';
  ```
- [ ] Webhook URL configured in Mailgun → Webhooks:
  `https://<project>.supabase.co/functions/v1/lcs-mailgun-webhook`

### HeyReach
- [ ] API key set in imo-creator Doppler: `HEYREACH_API_KEY`
- [ ] Webhook secret set: `HEYREACH_WEBHOOK_SECRET`
- [ ] LinkedIn account connected in HeyReach dashboard
- [ ] Webhook URL configured (if available):
  `https://<project>.supabase.co/functions/v1/lcs-heyreach-webhook`

### Edge Function Secrets (synced from imo-creator Doppler)
```bash
# Sync from Doppler to Supabase Edge Function secrets
supabase secrets set MAILGUN_API_KEY=key-xxxx
supabase secrets set MAILGUN_WEBHOOK_SIGNING_KEY=key-xxxx
supabase secrets set HEYREACH_API_KEY=hr_xxxx
supabase secrets set HEYREACH_WEBHOOK_SECRET=secret_xxxx
```

## Phase 6 — Edge Function Deployment

```bash
supabase functions deploy lcs-mailgun-webhook --no-verify-jwt
supabase functions deploy lcs-heyreach-webhook --no-verify-jwt
```

- [ ] Mailgun webhook deployed
- [ ] HeyReach webhook deployed
- [ ] Test Mailgun webhook: send test event from Mailgun dashboard
- [ ] Verify CET event logged: `SELECT * FROM lcs.event WHERE step_number = 8 LIMIT 1;`

## Phase 7 — Cron Activation

- [ ] `004_lcs_cron_schedule.sql` — pg_cron jobs
- [ ] Verify jobs scheduled: `SELECT * FROM cron.job ORDER BY jobid;` → 7 jobs
- [ ] Configure pipeline runner in Supabase cron (Edge Function trigger)
- [ ] Wait for first matview refresh (2:00 AM ET)
- [ ] Verify intelligence matview populated:
  `SELECT count(*), avg(intelligence_tier) FROM lcs.v_company_intelligence;`

## Phase 8 — Smoke Test

- [ ] Manually insert a test signal:
  ```sql
  INSERT INTO lcs.signal_queue (
    signal_set_hash, signal_category, sovereign_company_id,
    lifecycle_phase, signal_data, source_hub, status
  ) VALUES (
    'SIG-MANUAL-TRIGGER-V1', 'MANUAL_TRIGGER',
    '<pick a real sovereign_company_id from cl.company_identity>',
    'OUTREACH', '{"test": true}', 'MANUAL', 'PENDING'
  );
  ```
- [ ] Wait for pipeline runner (or trigger manually)
- [ ] Check CET for pipeline events:
  `SELECT event_type, delivery_status FROM lcs.event WHERE sovereign_company_id = '<id>' ORDER BY created_at;`
- [ ] Verify ORBT error handling: check `lcs.err0` if delivery failed

## Phase 9 — Go Live

- [ ] Remove `FOUNDER_CALENDAR_AVAILABLE=false` if set
- [ ] Set production `AGENT_DAILY_CAP` value
- [ ] Monitor first 24 hours:
  - `SELECT count(*), delivery_status FROM lcs.event WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY delivery_status;`
  - `SELECT adapter_type, health_status, sent_today, bounce_rate_24h FROM lcs.adapter_registry;`
  - `SELECT * FROM lcs.err0 WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;`

---

## Rollback

If critical failure during deployment:

```sql
-- Nuclear option: remove entire LCS schema
DROP SCHEMA lcs CASCADE;

-- Remove cron jobs
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE 'lcs-%';
```

Edge Functions:
```bash
supabase functions delete lcs-mailgun-webhook
supabase functions delete lcs-heyreach-webhook
```
