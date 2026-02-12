import { supabase } from '@/data/integrations/supabase/client';

/**
 * Materialized View Refresh — scheduled refresh for LCS matviews.
 *
 * Doctrine schedule (LCS_DATA_MODEL.md):
 *   - lcs.v_company_intelligence: 2:00 AM daily
 *   - lcs.v_latest_by_entity: 2:30 AM daily
 *   - lcs.v_latest_by_company: 2:30 AM daily
 *
 * What triggers this? Supabase pg_cron on the scheduled time.
 * How do we get it? SQL: REFRESH MATERIALIZED VIEW CONCURRENTLY
 *
 * CONCURRENTLY = non-blocking refresh (requires UNIQUE index on matview).
 */

interface RefreshResult {
  view_name: string;
  success: boolean;
  duration_ms: number;
  error?: string;
}

/**
 * Refresh a single materialized view.
 */
async function refreshView(viewName: string): Promise<RefreshResult> {
  const start = Date.now();

  try {
    const { error } = await supabase.rpc('refresh_lcs_matview', {
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

/**
 * Refresh intelligence matview — runs at 2:00 AM.
 * Must run BEFORE entity/company views (they may reference intelligence data).
 */
export async function refreshIntelligence(): Promise<RefreshResult> {
  console.log('[Matview] Refreshing lcs.v_company_intelligence...');
  return refreshView('lcs.v_company_intelligence');
}

/**
 * Refresh entity and company matviews — runs at 2:30 AM.
 * Runs AFTER intelligence refresh.
 */
export async function refreshEntityViews(): Promise<RefreshResult[]> {
  console.log('[Matview] Refreshing entity and company views...');

  const results = await Promise.all([
    refreshView('lcs.v_latest_by_entity'),
    refreshView('lcs.v_latest_by_company'),
  ]);

  return results;
}

/**
 * Refresh all matviews in correct order.
 * Convenience function for manual refresh or testing.
 */
export async function refreshAllMatviews(): Promise<RefreshResult[]> {
  // Intelligence first (dependency)
  const intelResult = await refreshIntelligence();

  // Entity views second
  const entityResults = await refreshEntityViews();

  return [intelResult, ...entityResults];
}

/**
 * SQL for the database-side RPC function.
 * This must be deployed to Neon/Supabase as a server-side function.
 *
 * CREATE OR REPLACE FUNCTION refresh_lcs_matview(view_name TEXT)
 * RETURNS VOID AS $$
 * BEGIN
 *   EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
 * END;
 * $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 * pg_cron schedule (add via Supabase dashboard or SQL):
 *   SELECT cron.schedule('refresh-lcs-intelligence', '0 2 * * *',
 *     $$SELECT refresh_lcs_matview('lcs.v_company_intelligence')$$);
 *   SELECT cron.schedule('refresh-lcs-entity', '30 2 * * *',
 *     $$SELECT refresh_lcs_matview('lcs.v_latest_by_entity')$$);
 *   SELECT cron.schedule('refresh-lcs-company', '30 2 * * *',
 *     $$SELECT refresh_lcs_matview('lcs.v_latest_by_company')$$);
 */
