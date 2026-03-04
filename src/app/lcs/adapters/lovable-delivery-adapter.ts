import type { LcsAdapter, AdapterPayload, AdapterResponse } from './types';

/**
 * Lovable Delivery Adapter — single egress adapter for all channels.
 *
 * All delivery channels (MG, HR, SH) route through this adapter.
 * CL sends the full payload; Lovable resolves templates and delivers.
 *
 * Contract boundary:
 *   CL → sends structured payload with recipient, content, and context
 *   Lovable → resolves templates, selects delivery method, confirms delivery
 *
 * Env: LOVABLE_DELIVERY_URL (from Doppler, never hardcoded)
 */

const LOVABLE_DELIVERY_URL = process.env.LOVABLE_DELIVERY_URL ?? '';

interface LovableRequestPayload {
  communication_id: string;
  message_run_id: string;
  channel: string;
  recipient_email: string | null;
  recipient_linkedin_url: string | null;
  subject_line: string | null;
  body_plain: string | null;
  body_html: string | null;
  sender_identity: string;
  frame_id: string;
  lifecycle_phase: string;
  sovereign_company_id: string;
  company_name: string | null;
  agent_number: string;
  metadata: Record<string, unknown>;
}

interface LovableResponsePayload {
  success: boolean;
  delivery_status: string;
  adapter_message_id: string | null;
  error_message: string | null;
}

export class LovableDeliveryAdapter implements LcsAdapter {
  readonly channel = 'MG' as const; // Default channel identity; routes all channels

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    if (!LOVABLE_DELIVERY_URL) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: 'LOVABLE_DELIVERY_URL not configured' },
        error_message: 'Missing LOVABLE_DELIVERY_URL environment variable (Doppler)',
      };
    }

    const requestBody: LovableRequestPayload = {
      communication_id: payload.communication_id,
      message_run_id: payload.message_run_id,
      channel: payload.channel,
      recipient_email: payload.recipient_email,
      recipient_linkedin_url: payload.recipient_linkedin_url,
      subject_line: payload.subject,
      body_plain: payload.body_text,
      body_html: payload.body_html,
      sender_identity: payload.sender_identity,
      frame_id: payload.frame_id,
      lifecycle_phase: payload.lifecycle_phase,
      sovereign_company_id: payload.sovereign_company_id,
      company_name: payload.company_name,
      agent_number: payload.agent_number,
      metadata: payload.metadata,
    };

    try {
      const response = await fetch(LOVABLE_DELIVERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const body = await response.json() as LovableResponsePayload;

      if (response.ok && body.success) {
        return {
          success: true,
          delivery_status: body.delivery_status === 'DELIVERED' ? 'DELIVERED' : 'SENT',
          adapter_message_id: body.adapter_message_id ?? null,
          raw_response: body as unknown as Record<string, unknown>,
          error_message: null,
        };
      }

      return {
        success: false,
        delivery_status: body.delivery_status === 'BOUNCED' ? 'BOUNCED' : 'FAILED',
        adapter_message_id: body.adapter_message_id ?? null,
        raw_response: body as unknown as Record<string, unknown>,
        error_message: body.error_message ?? `Lovable HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        success: false,
        delivery_status: 'FAILED',
        adapter_message_id: null,
        raw_response: { error: err instanceof Error ? err.message : 'Unknown fetch error' },
        error_message: err instanceof Error ? err.message : 'Lovable delivery request failed',
      };
    }
  }
}
