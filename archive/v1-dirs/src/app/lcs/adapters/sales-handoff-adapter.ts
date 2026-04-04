import type { LcsAdapter, AdapterPayload, AdapterResponse } from './types';

/**
 * Sales Handoff Adapter — output spoke for internal sales team handoff.
 *
 * What triggers this? Pipeline Step 6 calls adapter.send() with channel='SH'.
 * How do we get it? No external API — writes handoff record to internal table.
 *
 * v1 implementation: Insert a handoff record that the sales team monitors.
 * Future: Push to Slack, CRM webhook, or calendar booking system.
 *
 * This adapter is a DUMB SPOKE — same sovereignty rules as MG and HR.
 */

export class SalesHandoffAdapter implements LcsAdapter {
  readonly channel = 'SH' as const;

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    // ─── Sales Handoff has no external validation requirements ────
    // It just needs a sovereign_company_id and entity context in metadata

    try {
      // v1: Log the handoff as a structured record
      // The sales team queries this to find meetings to book
      const handoffRecord = {
        communication_id: payload.communication_id,
        message_run_id: payload.message_run_id,
        sender_identity: payload.sender_identity,
        recipient_email: payload.recipient_email,
        recipient_linkedin_url: payload.recipient_linkedin_url,
        handoff_reason: (payload.metadata.signal_set_hash as string) ?? 'UNKNOWN',
        frame_id: (payload.metadata.frame_id as string) ?? 'UNKNOWN',
        created_at: new Date().toISOString(),
      };

      // For v1, we don't have a dedicated handoff table.
      // The CET event IS the handoff record (logged by the pipeline after this returns).
      // This adapter returns success to indicate the handoff is ready to be logged.

      return {
        success: true,
        delivery_status: 'DELIVERED',   // Handoff is immediate — no async confirmation needed
        adapter_message_id: `SH-${payload.communication_id}`,
        raw_response: handoffRecord,
        error_message: null,
      };
    } catch (err) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: err instanceof Error ? err.message : 'Unknown error' },
        error_message: err instanceof Error ? err.message : 'Sales handoff failed',
      };
    }
  }
}
