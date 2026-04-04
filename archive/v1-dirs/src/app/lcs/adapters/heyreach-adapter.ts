import type { LcsAdapter, AdapterPayload, AdapterResponse } from './types';

/**
 * HeyReach Adapter — output spoke for LinkedIn outreach via HeyReach API.
 *
 * What triggers this? Pipeline Step 6 calls adapter.send() with channel='HR'.
 * How do we get it? HeyReach API key from environment variables.
 *
 * HeyReach API: POST https://api.heyreach.io/api/v1/messages/send
 * Auth: Bearer token
 *
 * This adapter is a DUMB SPOKE — same rules as Mailgun adapter.
 */

const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY ?? '';
const HEYREACH_BASE_URL = process.env.HEYREACH_API_URL ?? 'https://api.heyreach.io/api/v1';

export class HeyReachAdapter implements LcsAdapter {
  readonly channel = 'HR' as const;

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    // ─── Validate required fields ────────────────────────
    if (!payload.recipient_linkedin_url) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'No recipient LinkedIn URL provided' },
        error_message: 'HeyReach requires recipient_linkedin_url',
      };
    }

    if (!payload.body_text) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'No message text provided' },
        error_message: 'HeyReach requires body_text for LinkedIn messages',
      };
    }

    if (!HEYREACH_API_KEY) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'HEYREACH_API_KEY not configured' },
        error_message: 'Missing HEYREACH_API_KEY environment variable',
      };
    }

    // ─── Build HeyReach request ──────────────────────────
    const url = `${HEYREACH_BASE_URL}/messages/send`;

    const requestBody = {
      linkedin_url: payload.recipient_linkedin_url,
      message: payload.body_text,
      sender_identity: payload.sender_identity,
      metadata: {
        communication_id: payload.communication_id,
        message_run_id: payload.message_run_id,
        ...payload.metadata,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HEYREACH_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const body = await response.json() as Record<string, unknown>;

      if (response.ok) {
        return {
          success: true,
          delivery_status: 'SENT',    // HeyReach queues the message — SENT, not DELIVERED
          adapter_message_id: (body.id as string) ?? (body.message_id as string) ?? null,
          raw_response: body,
          error_message: null,
        };
      }

      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: body,
        error_message: (body.error as string) ?? (body.message as string) ?? `HeyReach HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: err instanceof Error ? err.message : 'Unknown fetch error' },
        error_message: err instanceof Error ? err.message : 'HeyReach request failed',
      };
    }
  }
}
