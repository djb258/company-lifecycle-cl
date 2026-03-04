

# LCS Data Flow: Three-Table Contract

## Summary

Wire the existing pipeline to read from two upstream tables (`lcs.mid_sequence_state` and `lcs.sid_output`) and write delivery results to `lcs.event`. Currently, the pipeline passes data through in-memory `PipelineState` with placeholder/null values for recipient info and message content. This plan connects it to real data.

## What Changes

### 1. Create TypeScript types for the two READ tables

New file: `src/data/lcs/types/mid-sequence-state.ts`
- `MidSequenceStateRow`: `message_run_id`, `communication_id`, `channel`, `delivery_status`, `sovereign_company_id`, `entity_id`, `entity_type`, `lifecycle_phase`, `agent_number`, `lane`, `signal_set_hash`, `frame_id`, `adapter_type`, `step_number`, `created_at`

New file: `src/data/lcs/types/sid-output.ts`
- `SidOutputRow`: `communication_id`, `recipient_email`, `recipient_name`, `subject_line`, `body_plain`, `body_html`, `sender_identity`

Export both from `src/data/lcs/types/index.ts`.

### 2. Create a delivery-queue reader

New file: `src/app/lcs/delivery-queue.ts`
- `fetchQueuedDeliveries()`: queries `lcsClient.from('mid_sequence_state')` where `delivery_status = 'QUEUED'`, then joins to `lcsClient.from('sid_output')` on `communication_id` to hydrate recipient/content fields.
- Returns an array of fully hydrated delivery payloads ready for the adapter.

### 3. Update Step 6 (call-adapter) to accept hydrated payloads

Currently Step 6 builds `AdapterPayload` from pipeline state with nulls for `subject`, `body_html`, `body_text`. Update it so that when hydrated data is present on `PipelineState` (populated by the queue reader), those values flow through to the adapter payload.

Add to `PipelineState`:
- `subject_line: string | null`
- `body_plain: string | null`
- `body_html: string | null`
- `recipient_name: string | null`

Then in `callAdapter`, use `state.subject_line` / `state.body_html` / `state.body_plain` instead of hardcoded nulls.

### 4. CET write (already done)

The existing `cet-logger.ts` already writes to `lcs.event` via `lcsClient.from('event').insert(...)`. No changes needed. The `logStep` helper in the orchestrator already maps all required CET columns (`communication_id`, `message_run_id`, `delivery_status`, `adapter_type`, `channel`, `event_type`, `adapter_response`, `sovereign_company_id`, `entity_id`).

### 5. Create a delivery-runner entry point

New file: `src/app/lcs/delivery-runner.ts`
- `runQueuedDeliveries()`: calls `fetchQueuedDeliveries()`, then for each item instantiates the correct adapter (MG or HR based on `channel`), builds pipeline state from the hydrated row, and calls the adapter + logs to CET.
- This is the function an edge function or cron would invoke.

## Files Touched

| File | Action |
|------|--------|
| `src/data/lcs/types/mid-sequence-state.ts` | **New** — type for queue table |
| `src/data/lcs/types/sid-output.ts` | **New** — type for composition output |
| `src/data/lcs/types/index.ts` | **Edit** — re-export new types |
| `src/app/lcs/delivery-queue.ts` | **New** — reads QUEUED rows + joins sid_output |
| `src/app/lcs/delivery-runner.ts` | **New** — orchestrates queue → adapter → CET write |
| `src/app/lcs/pipeline/types.ts` | **Edit** — add content fields to PipelineState |
| `src/app/lcs/pipeline/steps/06-call-adapter.ts` | **Edit** — use state content fields in payload |

## Data Flow Diagram

```text
lcs.mid_sequence_state          lcs.sid_output
(delivery_status='QUEUED')      (recipient + content)
        │                              │
        └──── JOIN on communication_id ─┘
                       │
                  delivery-queue.ts
                  (fetchQueuedDeliveries)
                       │
                  delivery-runner.ts
                       │
              ┌────────┴────────┐
              │  MG adapter     │  HR adapter
              └────────┬────────┘
                       │
                  cet-logger.ts
                       │
                  lcs.event (INSERT)
```

