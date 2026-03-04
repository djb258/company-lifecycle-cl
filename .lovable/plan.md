

# Plan: LCS Delivery Runner Edge Function (Neon Direct)

## Summary

Create a Deno edge function `lcs-delivery-runner` that connects to Neon via `pg`, reads queued deliveries, fires adapters, and writes results to `lcs.event`. No UPDATE on `mid_sequence_state` — CET is the source of truth for delivery outcomes.

## Critical Design Decision: No UPDATE on mid_sequence_state

The `mid_sequence_state` table follows the same append-only / immutability-trigger pattern as the rest of the LCS schema. If `trg_lcs_mid_no_update` (or similar) exists, any UPDATE will be blocked at runtime.

**Resolution**: The edge function only INSERTs into `lcs.event`. The QUEUED row in `mid_sequence_state` represents the MID decision (what to send). The CET event represents the delivery outcome (what happened). Two separate facts. To determine what's already been processed, the edge function queries CET for existing `DELIVERY_SENT` / `DELIVERY_FAILED` events matching the `communication_id` and skips those.

## Prerequisite: NEON_CONNECTION_STRING Secret

Must be added before the edge function can work. Currently missing from secrets.

## Changes

### 1. New edge function: `supabase/functions/lcs-delivery-runner/index.ts`

Single file, all logic inline (edge function rules — no subfolder imports from `src/`).

**Auth**: `x-webhook-secret` header validated against `MAILGUN_WEBHOOK_SIGNING_KEY` (reuses existing secret).

**Flow**:
1. Connect to Neon via `postgres` (npm specifier)
2. SELECT from `lcs.mid_sequence_state` WHERE `delivery_status = 'QUEUED'`
3. LEFT JOIN `lcs.sid_output` ON `communication_id` for recipient/content
4. LEFT JOIN `lcs.event` to exclude rows that already have a `DELIVERY_SENT` or `DELIVERY_FAILED` event (dedup — prevents re-processing)
5. For each row: call Mailgun or HeyReach API based on `channel`
6. INSERT result into `lcs.event` (DELIVERY_SENT or DELIVERY_FAILED)
7. On adapter error: INSERT DELIVERY_FAILED event + INSERT into `lcs.err0`

**Key difference from client-side version**: Uses raw SQL via `pg` against Neon. Can do a proper JOIN in one query instead of two sequential PostgREST calls.

### 2. Register in `supabase/config.toml`

```toml
[functions.lcs-delivery-runner]
verify_jwt = false
```

### 3. Deprecate client-side files

Add deprecation headers to:
- `src/app/lcs/delivery-queue.ts` — replaced by edge function SQL
- `src/app/lcs/delivery-runner.ts` — replaced by edge function

These files stay for type reference but are no longer called.

## Files

| File | Action |
|------|--------|
| `supabase/functions/lcs-delivery-runner/index.ts` | **New** |
| `supabase/config.toml` | **Edit** — add function entry |
| `src/app/lcs/delivery-queue.ts` | **Edit** — add deprecation comment |
| `src/app/lcs/delivery-runner.ts` | **Edit** — add deprecation comment |

## Dedup Query (core SQL)

```sql
SELECT
  mss.message_run_id, mss.communication_id, mss.channel,
  mss.sovereign_company_id, mss.entity_id, mss.entity_type,
  mss.lifecycle_phase, mss.agent_number, mss.lane,
  mss.signal_set_hash, mss.frame_id, mss.adapter_type,
  sid.recipient_email, sid.recipient_name,
  sid.subject_line, sid.body_plain, sid.body_html,
  sid.sender_identity
FROM lcs.mid_sequence_state mss
JOIN lcs.sid_output sid ON sid.communication_id = mss.communication_id
LEFT JOIN lcs.event evt
  ON evt.communication_id = mss.communication_id
  AND evt.event_type IN ('DELIVERY_SENT', 'DELIVERY_FAILED')
WHERE mss.delivery_status = 'QUEUED'
  AND evt.communication_id IS NULL
```

This gives us only QUEUED rows that haven't already been processed — no UPDATE needed.

## Secrets Needed

| Secret | Status |
|--------|--------|
| `NEON_CONNECTION_STRING` | **Missing** — must add first |
| `MAILGUN_API_KEY` | Exists |
| `MAILGUN_WEBHOOK_SIGNING_KEY` | Exists (used for auth) |

