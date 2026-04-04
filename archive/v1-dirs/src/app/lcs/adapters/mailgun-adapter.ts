import type { LcsAdapter, AdapterPayload, AdapterResponse } from './types';

/**
 * Mailgun Adapter — output spoke for email delivery via Mailgun REST API.
 *
 * What triggers this? Pipeline Step 6 calls adapter.send() with channel='MG'.
 * How do we get it? Mailgun API key + domain from environment variables.
 *
 * Mailgun API: POST https://api.mailgun.net/v3/{domain}/messages
 * Auth: Basic auth with api:{MAILGUN_API_KEY}
 *
 * This adapter is a DUMB SPOKE:
 *   - Takes payload IN from the pipeline hub
 *   - Pushes to Mailgun API
 *   - Returns response OUT to the pipeline hub
 *   - Does NOT know about CET, ERR0, gates, or other adapters
 */

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY ?? '';
const MAILGUN_BASE_URL = process.env.MAILGUN_API_URL ?? 'https://api.mailgun.net/v3';

export class MailgunAdapter implements LcsAdapter {
  readonly channel = 'MG' as const;

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    // ─── Validate required fields ────────────────────────
    if (!payload.recipient_email) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'No recipient email provided' },
        error_message: 'Mailgun requires recipient_email',
      };
    }

    if (!payload.sender_domain) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'No sender domain provided' },
        error_message: 'Mailgun requires sender_domain for domain routing',
      };
    }

    if (!MAILGUN_API_KEY) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'MAILGUN_API_KEY not configured' },
        error_message: 'Missing MAILGUN_API_KEY environment variable',
      };
    }

    // ─── Build Mailgun request ───────────────────────────
    const url = `${MAILGUN_BASE_URL}/${payload.sender_domain}/messages`;

    const formData = new FormData();
    formData.append('from', `${payload.sender_identity} <${payload.sender_email ?? `noreply@${payload.sender_domain}`}>`);
    formData.append('to', payload.recipient_email);
    if (payload.subject) formData.append('subject', payload.subject);
    if (payload.body_html) formData.append('html', payload.body_html);
    if (payload.body_text) formData.append('text', payload.body_text);

    // Custom headers for tracking
    formData.append('v:communication_id', payload.communication_id);
    formData.append('v:message_run_id', payload.message_run_id);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`,
        },
        body: formData,
      });

      const body = await response.json() as Record<string, unknown>;

      if (response.ok) {
        return {
          success: true,
          delivery_status: 'SENT',    // Mailgun accepts = SENT (DELIVERED confirmed async via webhook)
          adapter_message_id: (body.id as string) ?? null,
          raw_response: body,
          error_message: null,
        };
      }

      // Mailgun rejected the message
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: body,
        error_message: (body.message as string) ?? `Mailgun HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: err instanceof Error ? err.message : 'Unknown fetch error' },
        error_message: err instanceof Error ? err.message : 'Mailgun request failed',
      };
    }
  }
}
