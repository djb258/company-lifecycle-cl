import type { Channel, DeliveryStatus } from '@/data/lcs';

/**
 * Adapter Interface — the contract between LCS pipeline and delivery adapters.
 * Prompt 6 implements this for Mailgun, HeyReach, and Sales Handoff.
 *
 * What triggers this? Pipeline Step 6 (call-adapter) selects an adapter and calls send().
 * How do we get it? Adapter registry tells us which adapter to use. This interface is the spoke.
 */

/** What the pipeline gives the adapter */
export interface AdapterPayload {
  message_run_id: string;
  communication_id: string;
  channel: Channel;
  recipient_email: string | null;     // for MG
  recipient_linkedin_url: string | null; // for HR
  subject: string | null;             // for MG
  body_html: string | null;           // for MG
  body_text: string | null;           // for MG/HR
  sender_identity: string;
  sender_email: string | null;        // for MG
  sender_domain: string | null;       // for MG (from domain rotation)
  metadata: Record<string, unknown>;  // pass-through for adapter-specific data
}

/** What the adapter gives back */
export interface AdapterResponse {
  success: boolean;
  delivery_status: DeliveryStatus;    // SENT, DELIVERED, BOUNCED, FAILED
  adapter_message_id: string | null;  // external ID from the adapter (e.g., Mailgun message ID)
  raw_response: Record<string, unknown>;  // full adapter response for CET logging
  error_message: string | null;       // if failed, why
}

/** The adapter contract — every adapter implements this */
export interface LcsAdapter {
  channel: Channel;
  send(payload: AdapterPayload): Promise<AdapterResponse>;
}
