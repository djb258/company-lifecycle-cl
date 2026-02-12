import { supabase } from '@/data/integrations/supabase/client';
import type { PipelineState, StepResult } from '../types';
import type { IntelligenceTier } from '@/data/lcs';

/**
 * Step 2: Collect Intelligence — read company intelligence from matview.
 *
 * What triggers this? Successful Step 1.
 * How do we get it? Query lcs.v_company_intelligence for the sovereign_company_id.
 */
export async function collectIntelligence(state: PipelineState): Promise<StepResult> {
  try {
    const { data, error } = await supabase
      .from('v_company_intelligence')
      .select('*')
      // @ts-expect-error — lcs schema requires PostgREST config; see deployment notes
      .schema('lcs')
      .eq('sovereign_company_id', state.signal.sovereign_company_id)
      .single();

    if (error || !data) {
      // No intelligence found — set tier 5 (bare minimum)
      state.intelligence = null;
      state.intelligence_tier = 5;

      return {
        step_number: 2,
        step_name: 'Collect Intelligence',
        event_type: 'INTELLIGENCE_COLLECTED',
        success: true, // Not a failure — just low tier
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
