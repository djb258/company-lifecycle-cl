

# Full-Loop Integration Test Plan

The user has provided the `MAILGUN_WEBHOOK_SIGNING_KEY` value: `da73c383e65b90cf7bd6327e0047311e`. This unlocks authenticated testing of all four edge functions.

## Test Sequence

### Test 1: lcs-delivery-runner
POST with `x-webhook-secret: da73c383e65b90cf7bd6327e0047311e`. This hits Neon, reads QUEUED rows from `mid_sequence_state`, and attempts delivery. If no QUEUED rows exist, expect `{ processed: 0, succeeded: 0, failed: 0 }` — still proves Neon connectivity and query execution.

### Test 2: lcs-mailgun-webhook
POST with a synthetic Mailgun webhook payload. Mailgun uses HMAC signature verification (not the simple secret header), so we send a test payload and expect `406` or signature mismatch — confirms the HMAC auth gate is active.

### Test 3: lcs-heyreach-webhook
POST with a synthetic HeyReach callback. This function checks `HEYREACH_WEBHOOK_SECRET` (a separate secret from `HEYREACH_API_KEY`). Since that webhook secret may not be configured, expect `401` — confirms auth gate.

### Test 4: lcs-inbound-reply
POST with `x-webhook-secret: da73c383e65b90cf7bd6327e0047311e` and a synthetic inbound email payload with a fake LCS communication_id in the `In-Reply-To` header. Expect `200 { status: 'error', reason: 'original_not_found' }` — proves the lookup query executes against the database.

## Success Criteria

| Function | Auth | Expected Response |
|----------|------|-------------------|
| delivery-runner | `x-webhook-secret` ✅ | `200 { processed: 0 }` or real deliveries |
| mailgun-webhook | HMAC (can't forge) | `406` or signature error |
| heyreach-webhook | webhook secret | `401` (separate secret) |
| inbound-reply | `x-webhook-secret` ✅ | `200 { original_not_found }` |

## Implementation

I will use `curl_edge_functions` to invoke all four functions sequentially, then check edge function logs to report full results. If the delivery runner finds QUEUED rows with real recipient data, I will report what it found before any actual sends occur.

