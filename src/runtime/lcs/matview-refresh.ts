import { lcsClient } from '@/data/integrations/supabase/lcs-client';

/**
 * Materialized View Refresh — scheduled refresh for LCS matviews.
 */

interface RefreshResult {
  view_name: string;
  success: boolean;
  duration_ms: number;
  error?: string;
}

async function refreshView(viewName: string): Promise<RefreshResult> {
  const start = Date.now();

  try {
    const { error } = await lcsClient.rpc('refresh_lcs_matview', {
      view_name: viewName,
    });

    if (error) {
      return {
        view_name: viewName,
        success: false,
        duration_ms: Date.now() - start,
        error: error.message,
      };
    }

    return {
      view_name: viewName,
      success: true,
      duration_ms: Date.now() - start,
    };
  } catch (err) {
    return {
      view_name: viewName,
      success: false,
      duration_ms: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function refreshIntelligence(): Promise<RefreshResult> {
  console.log('[Matview] Refreshing lcs.v_company_intelligence...');
  return refreshView('lcs.v_company_intelligence');
}

export async function refreshEntityViews(): Promise<RefreshResult[]> {
  console.log('[Matview] Refreshing entity and company views...');
  return Promise.all([
    refreshView('lcs.v_latest_by_entity'),
    refreshView('lcs.v_latest_by_company'),
  ]);
}

export async function refreshAllMatviews(): Promise<RefreshResult[]> {
  const intelResult = await refreshIntelligence();
  const entityResults = await refreshEntityViews();
  return [intelResult, ...entityResults];
}
