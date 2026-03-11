// AUTO-GENERATED FROM column_registry.yml — DO NOT EDIT

/**
 * SUPPORTING — sender identity configs per stage/persona/channel, defines from/reply-to/provider settings for transport adapters
 * Table: sender_profile_registry
 */
export interface SenderProfileRegistryRow {
  /** Primary key, unique sender profile identifier */
  sender_profile_id: string;
  /** Stage this profile applies to: OUTREACH, SALES, or CLIENT */
  stage: string;
  /** Communication channel: EMAIL or LINKEDIN */
  channel: string;
  /** Transport provider: MAILGUN, HEYREACH, or SMTP */
  provider: string;
  /** Sender email address or LinkedIn profile identifier */
  from_address?: string | null;
  /** Reply-to email address, nullable for LinkedIn channel */
  reply_to_address?: string | null;
  /** Human-readable sender display name */
  display_name?: string | null;
  /** Whether this sender profile is active, default TRUE */
  is_active: boolean;
  /** Profile creation timestamp, auto-set */
  created_at: string;
  /** Last update timestamp, auto-set */
  updated_at: string;
}
