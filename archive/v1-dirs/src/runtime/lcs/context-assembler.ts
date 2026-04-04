import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type { CapacityGateContext, SuppressionContext, FreshnessGateContext, SuppressionState } from '@/sys/lcs/gates';
import type { LifecyclePhase, Channel, IntelligenceTier } from '@/data/lcs';
import type { SubHubFreshness } from '@/sys/lcs/gates';

/**
 * Context Assembler — input spoke that builds gate contexts from database queries.
 */

// ═══════════════════════════════════════════════════════════════
// Capacity Context
// ═══════════════════════════════════════════════════════════════

export async function assembleCapacityContext(
  agentNumber: string,
  adapterChannel: Channel
): Promise<CapacityGateContext> {
  const founderAvailable = process.env.FOUNDER_CALENDAR_AVAILABLE !== 'false';
  const today = new Date().toISOString().slice(0, 10);

  const { count: agentSentToday } = await lcsClient
    .from('event')
    .select('*', { count: 'exact', head: true })
    .eq('agent_number', agentNumber)
    .gte('created_at', `${today}T00:00:00Z`)
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS']);

  const { data: adapterData } = await lcsClient
    .from('adapter_registry')
    .select('daily_cap, health_status')
    .eq('adapter_type', adapterChannel)
    .eq('is_active', true)
    .single();

  const { count: adapterSentToday } = await lcsClient
    .from('event')
    .select('*', { count: 'exact', head: true })
    .eq('channel', adapterChannel)
    .gte('created_at', `${today}T00:00:00Z`)
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS']);

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
  const { data: latestEntity } = await lcsClient
    .from('v_latest_by_entity')
    .select('*')
    .eq('entity_id', entityId)
    .single();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: companySendsThisWeek } = await lcsClient
    .from('event')
    .select('*', { count: 'exact', head: true })
    .eq('sovereign_company_id', sovereignCompanyId)
    .gte('created_at', weekAgo.toISOString())
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS']);

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
  const { data: intel } = await lcsClient
    .from('v_company_intelligence')
    .select('intelligence_tier, people_data_fetched_at, dol_data_fetched_at, blog_data_fetched_at, sitemap_data_fetched_at')
    .eq('sovereign_company_id', sovereignCompanyId)
    .single();

  const peopleFreshnessWindow = parseInt(process.env.PEOPLE_FRESHNESS_DAYS ?? '30', 10);
  const dolFreshnessWindow = parseInt(process.env.DOL_FRESHNESS_DAYS ?? '90', 10);
  const blogFreshnessWindow = parseInt(process.env.BLOG_FRESHNESS_DAYS ?? '60', 10);
  const sitemapFreshnessWindow = parseInt(process.env.SITEMAP_FRESHNESS_DAYS ?? '60', 10);

  const subHubFreshness: SubHubFreshness[] = [
    {
      sub_hub: 'PEOPLE',
      data_fetched_at: (intel?.people_data_fetched_at as string) ?? null,
      freshness_window_days: peopleFreshnessWindow,
    },
    {
      sub_hub: 'DOL',
      data_fetched_at: (intel?.dol_data_fetched_at as string) ?? null,
      freshness_window_days: dolFreshnessWindow,
    },
    {
      sub_hub: 'BLOG',
      data_fetched_at: (intel?.blog_data_fetched_at as string) ?? null,
      freshness_window_days: blogFreshnessWindow,
    },
    {
      sub_hub: 'SITEMAP',
      data_fetched_at: (intel?.sitemap_data_fetched_at as string) ?? null,
      freshness_window_days: sitemapFreshnessWindow,
    },
  ];

  return {
    current_tier: (intel?.intelligence_tier as IntelligenceTier) ?? 5,
    sub_hub_freshness: subHubFreshness,
  };
}
