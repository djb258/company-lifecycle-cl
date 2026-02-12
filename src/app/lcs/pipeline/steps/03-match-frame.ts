import { supabase } from '@/data/integrations/supabase/client';
import type { PipelineState, StepResult } from '../types';
import type { FrameType } from '@/data/lcs';

/**
 * Step 3: Match Frame — select the best frame from frame_registry at the current tier.
 *
 * What triggers this? Successful Step 2 + passed freshness gate.
 * How do we get it? Query lcs.frame_registry filtered by phase, tier, and active status.
 */
export async function matchFrame(state: PipelineState): Promise<StepResult> {
  try {
    const { data, error } = await supabase
      .from('frame_registry')
      .select('*')
      // @ts-expect-error — lcs schema requires PostgREST config; see deployment notes
      .schema('lcs')
      .eq('lifecycle_phase', state.signal.lifecycle_phase)
      .eq('is_active', true)
      .lte('tier', state.intelligence_tier ?? 5)
      .order('tier', { ascending: true })  // prefer highest-intelligence frame
      .limit(1);

    if (error || !data || data.length === 0) {
      state.failed = true;
      state.failure_step = 3;
      state.failure_reason = `No eligible frame found for phase=${state.signal.lifecycle_phase}, tier<=${state.intelligence_tier}`;

      return {
        step_number: 3,
        step_name: 'Match Frame',
        event_type: 'FRAME_INELIGIBLE',
        success: false,
        state,
      };
    }

    const frame = data[0];
    state.frame_id = frame.frame_id as string;
    state.frame_type = frame.frame_type as FrameType;
    state.frame_required_fields = (frame.required_fields as string[]) ?? [];
    state.frame_fallback_id = (frame.fallback_frame as string) ?? null;

    return {
      step_number: 3,
      step_name: 'Match Frame',
      event_type: 'FRAME_MATCHED',
      success: true,
      state,
      payload: { frame_id: state.frame_id, frame_type: state.frame_type },
    };
  } catch (err) {
    state.failed = true;
    state.failure_step = 3;
    state.failure_reason = err instanceof Error ? err.message : 'Frame matching failed';

    return {
      step_number: 3,
      step_name: 'Match Frame',
      event_type: 'FRAME_INELIGIBLE',
      success: false,
      state,
    };
  }
}
