import type { PipelineState, StepResult } from '../types';
import type { EntityType } from '@/data/lcs';

/**
 * Step 5: Resolve Audience — determine recipient entity and sender identity.
 *
 * What triggers this? Successful Step 4 + passed suppression gate.
 * How do we get it? Intelligence snapshot (from Step 2) contains CEO/CFO/HR slots.
 *   Sender identity comes from lifecycle_phase config.
 */
export async function resolveAudience(state: PipelineState): Promise<StepResult> {
  const intel = state.intelligence as Record<string, unknown> | null;

  // Resolve recipient from intelligence snapshot
  // Priority: CEO → CFO → HR (first available email)
  let entityId: string | null = null;
  let entityType: EntityType = 'slot';
  let email: string | null = null;
  let linkedinUrl: string | null = null;

  if (intel) {
    if (intel.ceo_email) {
      entityId = intel.ceo_entity_id as string;
      email = intel.ceo_email as string;
      linkedinUrl = (intel.ceo_linkedin_url as string) ?? null;
    } else if (intel.cfo_email) {
      entityId = intel.cfo_entity_id as string;
      email = intel.cfo_email as string;
      linkedinUrl = (intel.cfo_linkedin_url as string) ?? null;
    } else if (intel.hr_email) {
      entityId = intel.hr_entity_id as string;
      email = intel.hr_email as string;
      linkedinUrl = (intel.hr_linkedin_url as string) ?? null;
    }
  }

  if (!entityId || !email) {
    state.failed = true;
    state.failure_step = 5;
    state.failure_reason = 'No valid recipient found in intelligence snapshot';

    return {
      step_number: 5,
      step_name: 'Resolve Audience',
      event_type: 'COMPOSITION_BLOCKED',
      success: false,
      state,
    };
  }

  state.entity_type = entityType;
  state.entity_id = entityId;
  state.recipient_email = email;
  state.recipient_linkedin_url = linkedinUrl;

  // Sender identity is determined by lifecycle phase
  // (Actual sender config would come from a config table — stubbed here)
  state.sender_identity = `${state.signal.lifecycle_phase.toLowerCase()}-sender`;
  state.sender_email = null;   // resolved by adapter from sender_identity
  state.sender_domain = null;  // resolved by adapter from domain_rotation_config

  return {
    step_number: 5,
    step_name: 'Resolve Audience',
    event_type: 'AUDIENCE_RESOLVED',
    success: true,
    state,
    payload: {
      entity_id: entityId,
      entity_type: entityType,
      recipient_email: email,
    },
  };
}
