# LCS Cron Schedule

> **Authority:** HUB-CL-001, SUBHUB-CL-LCS
> **Workers:** `lcs-pipeline-runner`, `lcs-domain-reset`

---

## CF Workers Cron Trigger Configuration

Cron triggers are configured via `wrangler.toml` on Cloudflare Workers.

```toml
[triggers]
crons = ["*/15 8-17 * * 1-5"]  # Every 15 min during business hours Mon-Fri 8AM-5PM ET
```

---

## Timezone Notes

The schedule above uses **UTC time**. Adjust accordingly:

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
curl -X POST https://<worker-name>.<account>.workers.dev/lcs-pipeline-runner \
  -H "Authorization: Bearer <CF_API_TOKEN>"
```

---

## Kill Switch

Set `FOUNDER_CALENDAR_AVAILABLE=false` in CF Workers environment to block all sends globally. The capacity gate checks this flag on every invocation.

---

## Job 2: Domain Reset

Resets `sent_today` counter on all sending domains at midnight ET.

```toml
# In wrangler.toml — second cron trigger
[triggers]
crons = ["*/15 8-17 * * 1-5", "0 5 * * *"]  # pipeline-runner + domain-reset
```

```
Worker:      lcs-domain-reset
Schedule:    0 5 * * * (UTC)
Description: Resets sent_today counter for all domains at midnight ET
```

**UTC timing:**
- `0 5 * * *` = midnight ET during EST (Nov–Mar)
- `0 4 * * *` = midnight ET during EDT (Mar–Nov)

This runs daily (including weekends) to ensure counters are fresh for Monday morning.

---

**Document Control:** HUB-CL-001 | CC-01
