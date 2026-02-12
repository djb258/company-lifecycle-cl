import { supabase } from '@/data/integrations/supabase/client';
import type { CapacityGateContext, SuppressionContext, FreshnessGateContext, SuppressionState } from '@/sys/lcs/gates';
import type { LifecyclePhase, Channel, IntelligenceTier } from '@/data/lcs';
import type { SubHubFreshness } from '@/sys/lcs/gates';

/**
 * Context Assembler — input spoke that builds gate contexts from database queries.
 *
 * What triggers this? The cron runner needs gate contexts before calling runPipeline().
 * How do we get it? Queries adapter_registry, CET matviews, signal_registry for fresh data.
 *
 * This is a SPOKE — it gathers data and passes it inward to the hub.
 * It does NOT make decisions. Gates make decisions.
 */

// ═══════════════════════════════════════════════════════════════
// Capacity Context
// ═══════════════════════════════════════════════════════════════

export async function assembleCapacityContext(
  agentNumber: string,
  adapterChannel: Channel
): Promise<CapacityGateContext> {
  // 1. Founder calendar — check if founder has open calendar slots today
  //    v1: Simple env var toggle. Future: Calendly API integration.
  const founderAvailable = process.env.FOUNDER_CALENDAR_AVAILABLE !== 'false';

  // 2. Agent territory sends today
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const { count: agentSentToday } = await supabase
    .from('event')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('*', { count: 'exact', head: true })
    .eq('agent_number', agentNumber)
    .gte('created_at', `${today}T00:00:00Z`)
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS']);

  // 3. Adapter registry data
  const { data: adapterData } = await supabase
    .from('adapter_registry')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('daily_cap, health_status')
    .eq('adapter_type', adapterChannel)
    .eq('is_active', true)
    .single();

  // 4. Adapter sends today
  const { count: adapterSentToday } = await supabase
    .from('event')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('*', { count: 'exact', head: true })
    .eq('channel', adapterChannel)
    .gte('created_at', `${today}T00:00:00Z`)
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS']);

  // 5. Agent daily cap from config (env var or future: territory config table)
  const agentDailyCap = parseInt(process.env.AGENT_DAILY_CAP ?? '50', 10);

  return {
    founder_calendar_available: founderAvailable,
    agent_number: agentNumber,
    agent_daily_cap: agentDailyCap,
    agent_sent_today: agentSentToday ?? 0,
    adapter_daily_cap: (adapterData?.daily_cap as number) ?? null,
    adapter_sent_today: adapterSentToday ?? 0,
    adapter_health_status: (adapterData?.health_status as string) ?? 'HEALTHY',
  };
}

// ═══════════════════════════════════════════════════════════════
// Suppression Context
// ═══════════════════════════════════════════════════════════════

export async function assembleSuppressionContext(
  entityId: string,
  sovereignCompanyId: string,
  lifecyclePhase: LifecyclePhase,
  channel: Channel
): Promise<SuppressionContext> {
  // 1. Latest entity event (for last contact + suppression flags)
  const { data: latestEntity } = await supabase
    .from('v_latest_by_entity')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('*')
    .eq('entity_id', entityId)
    .single();

  // 2. Company sends this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: companySendsThisWeek } = await supabase
    .from('event')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('*', { count: 'exact', head: true })
    .eq('sovereign_company_id', sovereignCompanyId)
    .gte('created_at', weekAgo.toISOString())
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS']);

  // 3. Derive suppression state from latest event
  //    v1: Simple derivation. Future: dedicated suppression state table.
  let suppressionState: SuppressionState = 'ACTIVE';
  let lastContactAt: string | null = null;
  let neverContact = false;
  let unsubscribed = false;
  let hardBounced = false;
  let complained = false;

  if (latestEntity) {
    lastContactAt = (latestEntity.created_at as string) ?? null;
    const lastStatus = latestEntity.delivery_status as string;
    const lastEventType = latestEntity.event_type as string;

    if (lastEventType === 'COMPOSITION_BLOCKED' && lastStatus === 'FAILED') {
      // Check reason in payload for specific suppression flags
      const payload = latestEntity.payload as Record<string, unknown> | null;
      const reason = (payload?.gate_reason as string) ?? '';
      if (reason.includes('never_contact')) neverContact = true;
      if (reason.includes('unsubscribed')) unsubscribed = true;
      if (reason.includes('hard bounce')) hardBounced = true;
      if (reason.includes('spam complaint')) complained = true;
      suppressionState = 'SUPPRESSED';
    } else if (lastStatus === 'BOUNCED') {
      hardBounced = true;
      suppressionState = 'SUPPRESSED';
    }
  }

  // Min contact interval from config (env var or future: phase config table)
  const minContactIntervalDays = parseInt(process.env.MIN_CONTACT_INTERVAL_DAYS ?? '14', 10);
  const companyWeeklyCap = parseInt(process.env.COMPANY_WEEKLY_CAP ?? '3', 10);

  return {
    suppression_state: suppressionState,
    last_contact_at: lastContactAt,
    min_contact_interval_days: minContactIntervalDays,
    company_sends_this_week: companySendsThisWeek ?? 0,
    company_weekly_cap: companyWeeklyCap,
    never_contact: neverContact,
    unsubscribed,
    hard_bounced: hardBounced,
    complained,
    lifecycle_phase: lifecyclePhase,
    channel,
  };
}

// ═══════════════════════════════════════════════════════════════
// Freshness Context
// ═══════════════════════════════════════════════════════════════

export async function assembleFreshnessContext(
  sovereignCompanyId: string
): Promise<Omit<FreshnessGateContext, 'frame_required_fields' | 'frame_fallback_id'>> {
  // 1. Get intelligence snapshot (includes freshness timestamps)
  const { data: intel } = await supabase
    .from('v_company_intelligence')
    // @ts-expect-error — lcs schema requires PostgREST config
    .schema('lcs')
    .select('intelligence_tier, ceo_data_fetched_at')
    .eq('sovereign_company_id', sovereignCompanyId)
    .single();

  // Freshness windows from config (env vars or future: config table)
  const peopleFreshnessWindow = parseInt(process.env.PEOPLE_FRESHNESS_DAYS ?? '30', 10);
  const dolFreshnessWindow = parseInt(process.env.DOL_FRESHNESS_DAYS ?? '90', 10);
  const blogFreshnessWindow = parseInt(process.env.BLOG_FRESHNESS_DAYS ?? '60', 10);
  const sitemapFreshnessWindow = parseInt(process.env.SITEMAP_FRESHNESS_DAYS ?? '60', 10);

  const subHubFreshness: SubHubFreshness[] = [
    {
      sub_hub: 'PEOPLE',
      data_fetched_at: (intel?.ceo_data_fetched_at as string) ?? null,
      freshness_window_days: peopleFreshnessWindow,
    },
    {
      sub_hub: 'DOL',
      data_fetched_at: null, // DOL freshness not tracked in current matview
      freshness_window_days: dolFreshnessWindow,
    },
    {
      sub_hub: 'BLOG',
      data_fetched_at: null, // Blog freshness not tracked in current matview
      freshness_window_days: blogFreshnessWindow,
    },
    {
      sub_hub: 'SITEMAP',
      data_fetched_at: null, // Sitemap freshness not tracked in current matview
      freshness_window_days: sitemapFreshnessWindow,
    },
  ];

  return {
    current_tier: (intel?.intelligence_tier as IntelligenceTier) ?? 5,
    sub_hub_freshness: subHubFreshness,
  };
}
