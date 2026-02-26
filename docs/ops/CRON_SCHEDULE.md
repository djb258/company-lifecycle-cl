# LCS Cron Schedule

> **Authority:** HUB-CL-001, SUBHUB-CL-LCS
> **Edge Functions:** `lcs-pipeline-runner`, `lcs-domain-reset`

---

## Supabase Cron Job Configuration

pg_cron is not available on Neon. This job must be configured manually in the **Supabase Dashboard** under **Database > Cron Jobs**.

```
Job Name:    lcs-pipeline-runner
Schedule:    */15 8-17 * * 1-5
Method:      POST
URL:         https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/lcs-pipeline-runner
Headers:     Authorization: Bearer <SUPABASE_ANON_KEY>
Description: Fires pipeline runner every 15 min during business hours Mon-Fri 8AM-5PM ET
```

---

## Timezone Notes

The schedule above uses **local server time**. Supabase cron runs in UTC, so adjust accordingly:

| Season | Eastern Time | UTC Equivalent |
|--------|-------------|----------------|
| EST (Nov–Mar) | 8:00 AM – 5:00 PM | 13:00 – 22:00 UTC |
| EDT (Mar–Nov) | 8:00 AM – 5:00 PM | 12:00 – 21:00 UTC |

**EST schedule:** `*/15 13-22 * * 1-5`
**EDT schedule:** `*/15 12-21 * * 1-5`

Dave must update the cron schedule manually when daylight saving time changes (second Sunday of March and first Sunday of November).

---

## What the Pipeline Runner Does

Each invocation:
1. Queries `lcs.signal_queue` for up to 50 PENDING signals
2. For each signal: hydrates gate contexts, resolves adapter, runs 7-step pipeline
3. Compiles message from intelligence snapshot via message compiler
4. Dispatches via Mailgun (email) or HeyReach (LinkedIn) adapter
5. Logs all events to `lcs.event` (CET)
6. Updates signal status to PROCESSED or ERROR

---

## Manual Trigger

The pipeline runner also accepts GET requests for manual triggering:

```bash
curl -X POST https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/lcs-pipeline-runner \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>"
```

---

## Kill Switch

Set `FOUNDER_CALENDAR_AVAILABLE=false` in Supabase Edge Function environment to block all sends globally. The capacity gate checks this flag on every invocation.

---

## Job 2: Domain Reset

Resets `sent_today` counter on all sending domains at midnight ET.

```
Job Name:    lcs-domain-reset
Schedule:    0 5 * * *
Method:      POST
URL:         https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/lcs-domain-reset
Headers:     Authorization: Bearer <SUPABASE_ANON_KEY>
Description: Resets sent_today counter for all domains at midnight ET
```

**UTC timing:**
- `0 5 * * *` = midnight ET during EST (Nov–Mar)
- `0 4 * * *` = midnight ET during EDT (Mar–Nov)

This runs daily (including weekends) to ensure counters are fresh for Monday morning.

---

**Document Control:** HUB-CL-001 | CC-01
