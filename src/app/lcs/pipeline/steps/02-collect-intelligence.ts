import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type { PipelineState, StepResult } from '../types';
import type { IntelligenceTier } from '@/data/lcs';

/**
 * Step 2: Collect Intelligence — read company intelligence from matview.
 */
export async function collectIntelligence(state: PipelineState): Promise<StepResult> {
  try {
    const { data, error } = await lcsClient
      .from('v_company_intelligence')
      .select('*')
      .eq('sovereign_company_id', state.signal.sovereign_company_id)
      .single();

    if (error || !data) {
      state.intelligence = null;
      state.intelligence_tier = 5;

      return {
        step_number: 2,
        step_name: 'Collect Intelligence',
        event_type: 'INTELLIGENCE_COLLECTED',
        success: true,
        state,
        payload: { intelligence_tier: 5, reason: 'No intelligence found for company' },
      };
    }

    state.intelligence = data as Record<string, unknown>;
    state.intelligence_tier = (data.intelligence_tier as IntelligenceTier) ?? 5;

    return {
      step_number: 2,
      step_name: 'Collect Intelligence',
      event_type: 'INTELLIGENCE_COLLECTED',
      success: true,
      state,
      payload: { intelligence_tier: state.intelligence_tier },
    };
  } catch (err) {
    state.failed = true;
    state.failure_step = 2;
    state.failure_reason = err instanceof Error ? err.message : 'Intelligence collection failed';

    return {
      step_number: 2,
      step_name: 'Collect Intelligence',
      event_type: 'DATA_STALE',
      success: false,
      state,
    };
  }
}
