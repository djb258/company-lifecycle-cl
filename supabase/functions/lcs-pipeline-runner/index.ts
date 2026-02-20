/**
 * LCS Pipeline Runner -- Supabase Edge Function
 *
 * What triggers this? Supabase cron schedule (every 15 min during business hours)
 *   OR manual POST to https://<project>.supabase.co/functions/v1/lcs-pipeline-runner
 * How do we get it? pg_cron alternative: Supabase Dashboard > Database > Cron Jobs
 *   OR external scheduler (GitHub Actions) hitting this endpoint.
 *
 * Flow:
 *   1. Query lcs.signal_queue WHERE status = 'PENDING' ORDER BY priority DESC, created_at ASC LIMIT 50
 *   2. For each signal:
 *      a. Hydrate CapacityGateContext from lcs.adapter_registry
 *      b. Hydrate SuppressionContext from lcs.suppression + lcs.v_latest_by_company
 *      c. Hydrate FreshnessGateContext from lcs.v_company_intelligence
 *      d. Resolve adapter from signal channel preference
 *      e. Call runPipeline(signal, adapter, gateContexts)
 *      f. Update signal_queue status
 *   3. Return summary of processed signals
 *
 * Environment variables needed:
 *   SUPABASE_URL              -- auto-provided by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY -- auto-provided by Supabase
 *   MAILGUN_API_KEY           -- for Mailgun adapter
 *   MAILGUN_API_URL           -- optional, default: https://api.mailgun.net/v3
 *   HEYREACH_API_KEY          -- for HeyReach adapter
 *   HEYREACH_API_URL          -- optional, default: https://api.heyreach.io/api/v1
 *   FOUNDER_CALENDAR_AVAILABLE -- global kill switch (default: 'true')
 *
 * Authority: HUB-CL-001, SUBHUB-CL-LCS
 * Consolidates: orchestrator.ts, steps 01-07, gates (capacity, suppression, freshness),
 *   adapters (mailgun, heyreach, sales-handoff), cet-logger, err0-logger, id-minter
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { compileMessage } from './message-compiler.ts';
import { assignDomain, recordDomainSend } from './domain-rotator.ts';

// =====================================================================
// TYPES -- Inlined from src/data/lcs/types/ and src/app/lcs/
// =====================================================================

// --- Enums (from src/data/lcs/types/enums.ts) ---

type LifecyclePhase = 'OUTREACH' | 'SALES' | 'CLIENT';

type EventType =
  | 'SIGNAL_RECEIVED'
  | 'INTELLIGENCE_COLLECTED'
  | 'FRAME_MATCHED'
  | 'ID_MINTED'
  | 'AUDIENCE_RESOLVED'
  | 'ADAPTER_CALLED'
  | 'DELIVERY_SENT'
  | 'DELIVERY_SUCCESS'
  | 'DELIVERY_FAILED'
  | 'DELIVERY_BOUNCED'
  | 'DELIVERY_COMPLAINED'
  | 'OPENED'
  | 'CLICKED'
  | 'ERROR_LOGGED'
  | 'SIGNAL_DROPPED'
  | 'COMPOSITION_BLOCKED'
  | 'RECIPIENT_THROTTLED'
  | 'COMPANY_THROTTLED'
  | 'DATA_STALE'
  | 'FRAME_INELIGIBLE';

type DeliveryStatus =
  | 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED'
  | 'CLICKED' | 'REPLIED' | 'BOUNCED' | 'FAILED';

type Lane = 'MAIN' | 'LANE_A' | 'LANE_B' | 'NEWSLETTER';
type Channel = 'MG' | 'HR' | 'SH';
type EntityType = 'slot' | 'person';
type IntelligenceTier = 1 | 2 | 3 | 4 | 5;
type FrameType = 'HAMMER' | 'NEWSLETTER' | 'POND' | 'MEETING_FOLLOWUP' | 'EMPLOYEE_COMM' | 'RENEWAL_NOTICE' | 'ONBOARDING';
type PhaseCode = 'OUT' | 'SAL' | 'CLI';
type FailureType = 'ADAPTER_ERROR' | 'TIMEOUT' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'BOUNCE_HARD' | 'BOUNCE_SOFT' | 'COMPLAINT' | 'AUTH_FAILURE' | 'PAYLOAD_REJECTED' | 'CONNECTION_FAILED' | 'UNKNOWN';
type OrbtAction = 'AUTO_RETRY' | 'ALT_CHANNEL' | 'HUMAN_ESCALATION';

// --- CET Insert (from src/data/lcs/types/cet.ts) ---

interface LcsEventInsert {
  communication_id: string;
  message_run_id: string;
  sovereign_company_id: string;
  entity_type: EntityType;
  entity_id: string;
  signal_set_hash: string;
  frame_id: string;
  adapter_type: string;
  channel: Channel;
  delivery_status: DeliveryStatus;
  lifecycle_phase: LifecyclePhase;
  event_type: EventType;
  lane: Lane;
  agent_number: string;
  step_number: number;
  step_name: string;
  payload: Record<string, unknown> | null;
  adapter_response: Record<string, unknown> | null;
  intelligence_tier: IntelligenceTier | null;
  sender_identity: string | null;
  created_at?: string;
}

// --- ERR0 Insert (from src/data/lcs/types/err0.ts) ---

interface LcsErr0Insert {
  message_run_id: string;
  communication_id: string | null;
  sovereign_company_id: string | null;
  failure_type: FailureType;
  failure_message: string;
  lifecycle_phase: LifecyclePhase | null;
  adapter_type: string | null;
  orbt_strike_number: number | null;
  orbt_action_taken: OrbtAction | null;
  orbt_alt_channel_eligible: boolean | null;
  orbt_alt_channel_reason: string | null;
  error_id?: string;
  created_at?: string;
}

// --- Gate Types (from src/sys/lcs/gates/types.ts) ---

type GateVerdict = 'PASS' | 'BLOCK' | 'DOWNGRADE';

interface GateResult {
  gate: string;
  verdict: GateVerdict;
  reason: string;
  blocked_event_type?: string;
  downgraded_tier?: IntelligenceTier;
}

interface CapacityGateContext {
  founder_calendar_available: boolean;
  agent_number: string;
  agent_daily_cap: number;
  agent_sent_today: number;
  adapter_daily_cap: number | null;
  adapter_sent_today: number;
  adapter_health_status: string;
}

type SuppressionState = 'ACTIVE' | 'COOLED' | 'PARKED' | 'SUPPRESSED';

interface SuppressionContext {
  suppression_state: SuppressionState;
  last_contact_at: string | null;
  min_contact_interval_days: number;
  company_sends_this_week: number;
  company_weekly_cap: number;
  never_contact: boolean;
  unsubscribed: boolean;
  hard_bounced: boolean;
  complained: boolean;
  lifecycle_phase: LifecyclePhase;
  channel: Channel;
}

interface SubHubFreshness {
  sub_hub: 'PEOPLE' | 'DOL' | 'BLOG' | 'SITEMAP';
  data_fetched_at: string | null;
  freshness_window_days: number;
}

interface FreshnessGateContext {
  current_tier: IntelligenceTier;
  sub_hub_freshness: SubHubFreshness[];
  frame_required_fields: string[];
  frame_fallback_id: string | null;
}

// --- Pipeline Types (from src/app/lcs/pipeline/types.ts) ---

interface SignalInput {
  spoke_id: string;
  signal_set_hash: string;
  signal_category: string;
  sovereign_company_id: string;
  lifecycle_phase: LifecyclePhase;
  preferred_channel?: Channel;
  preferred_lane?: Lane;
  agent_number?: string;
  signal_data: Record<string, unknown>;
}

interface PipelineState {
  signal: SignalInput;
  agent_number: string;
  lane: Lane;
  intelligence: Record<string, unknown> | null;
  intelligence_tier: IntelligenceTier | null;
  frame_id: string | null;
  frame_type: FrameType | null;
  frame_required_fields: string[];
  frame_fallback_id: string | null;
  communication_id: string | null;
  entity_type: EntityType | null;
  entity_id: string | null;
  recipient_email: string | null;
  recipient_linkedin_url: string | null;
  sender_identity: string | null;
  sender_email: string | null;
  sender_domain: string | null;
  message_run_id: string | null;
  channel: Channel | null;
  adapter_type: string | null;
  adapter_response: AdapterResponse | null;
  delivery_status: DeliveryStatus | null;
  gate_results: GateResult[];
  domain_pool_id: string | null;
  failed: boolean;
  failure_step: number | null;
  failure_reason: string | null;
}

interface StepResult {
  step_number: number;
  step_name: string;
  event_type: EventType;
  success: boolean;
  state: PipelineState;
  payload?: Record<string, unknown>;
}

interface PipelineResult {
  success: boolean;
  communication_id: string | null;
  message_run_id: string | null;
  delivery_status: DeliveryStatus | null;
  steps_completed: number;
  gate_results: GateResult[];
  failure_reason: string | null;
}

// --- Adapter Types (from src/app/lcs/adapters/types.ts) ---

interface AdapterPayload {
  message_run_id: string;
  communication_id: string;
  channel: Channel;
  recipient_email: string | null;
  recipient_linkedin_url: string | null;
  subject: string | null;
  body_html: string | null;
  body_text: string | null;
  sender_identity: string;
  sender_email: string | null;
  sender_domain: string | null;
  metadata: Record<string, unknown>;
}

interface AdapterResponse {
  success: boolean;
  delivery_status: DeliveryStatus;
  adapter_message_id: string | null;
  raw_response: Record<string, unknown>;
  error_message: string | null;
}

interface LcsAdapter {
  channel: Channel;
  send(payload: AdapterPayload): Promise<AdapterResponse>;
}

// =====================================================================
// ID MINTER -- Inlined from src/app/lcs/id-minter.ts + src/data/lcs/ids.ts
// =====================================================================

const PHASE_CODE_MAP: Record<'OUTREACH' | 'SALES' | 'CLIENT', PhaseCode> = {
  OUTREACH: 'OUT',
  SALES: 'SAL',
  CLIENT: 'CLI',
} as const;

const COMMUNICATION_ID_REGEX = /^LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}$/;
const MESSAGE_RUN_ID_REGEX = /^RUN-LCS-(OUT|SAL|CLI)-\d{8}-[A-Z0-9]{10,}-(MG|HR|SH)-\d{3}$/;

function isValidCommunicationId(id: string): boolean {
  return COMMUNICATION_ID_REGEX.test(id);
}

function isValidMessageRunId(id: string): boolean {
  return MESSAGE_RUN_ID_REGEX.test(id);
}

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Deno-compatible ULID generator (no external dependency)
function generateUlid(): string {
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const ENCODING_LEN = ENCODING.length;
  const TIME_LEN = 10;
  const RANDOM_LEN = 16;

  const now = Date.now();
  let timeStr = '';
  let t = now;
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    timeStr = ENCODING[t % ENCODING_LEN] + timeStr;
    t = Math.floor(t / ENCODING_LEN);
  }

  let randomStr = '';
  const randomBytes = new Uint8Array(RANDOM_LEN);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < RANDOM_LEN; i++) {
    randomStr += ENCODING[randomBytes[i] % ENCODING_LEN];
  }

  return timeStr + randomStr;
}

function mintCommunicationId(phase: LifecyclePhase): string {
  const phaseCode = PHASE_CODE_MAP[phase];
  const dateStr = formatDateYYYYMMDD(new Date());
  const ulidStr = generateUlid();
  const id = `LCS-${phaseCode}-${dateStr}-${ulidStr}`;
  if (!isValidCommunicationId(id)) {
    throw new Error(`ID Minter produced invalid communication_id: ${id}`);
  }
  return id;
}

function mintMessageRunId(communicationId: string, channel: Channel, attempt: number): string {
  const attemptStr = String(attempt).padStart(3, '0');
  const id = `RUN-${communicationId}-${channel}-${attemptStr}`;
  if (!isValidMessageRunId(id)) {
    throw new Error(`ID Minter produced invalid message_run_id: ${id}`);
  }
  return id;
}

// =====================================================================
// CET LOGGER -- Inlined from src/app/lcs/cet-logger.ts
// =====================================================================

async function logCetEvent(
  supabase: SupabaseClient,
  event: LcsEventInsert
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .schema('lcs')
      .from('event')
      .insert(event);

    if (error) {
      console.error('[CET Logger] Insert failed:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CET Logger] Exception:', message);
    return { success: false, error: message };
  }
}

// =====================================================================
// ERR0 LOGGER -- Inlined from src/app/lcs/err0-logger.ts
// =====================================================================

function getOrbtAction(strikeNumber: number): OrbtAction {
  switch (strikeNumber) {
    case 1: return 'AUTO_RETRY';
    case 2: return 'ALT_CHANNEL';
    case 3: return 'HUMAN_ESCALATION';
    default: return 'HUMAN_ESCALATION';
  }
}

async function getNextStrikeNumber(
  supabase: SupabaseClient,
  communicationId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .schema('lcs')
      .from('err0')
      .select('orbt_strike_number')
      .eq('communication_id', communicationId)
      .not('orbt_strike_number', 'is', null)
      .order('orbt_strike_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return 1;
    return Math.min((data[0].orbt_strike_number as number) + 1, 3);
  } catch {
    return 1;
  }
}

function checkAltChannelEligible(currentChannel: string): { eligible: boolean; reason: string } {
  if (currentChannel === 'MG') {
    return { eligible: true, reason: 'Mailgun failed -- HeyReach (LinkedIn) available as alternate' };
  }
  if (currentChannel === 'HR') {
    return { eligible: true, reason: 'HeyReach failed -- Mailgun (email) available as alternate' };
  }
  return { eligible: false, reason: 'Sales Handoff has no alternate channel' };
}

async function logErr0(
  supabase: SupabaseClient,
  error: LcsErr0Insert
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: dbError } = await supabase
      .schema('lcs')
      .from('err0')
      .insert(error);

    if (dbError) {
      console.error('[ERR0 Logger] Insert failed:', dbError.message);
      return { success: false, error: dbError.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ERR0 Logger] Exception:', message);
    return { success: false, error: message };
  }
}

// =====================================================================
// GATES -- Inlined from src/sys/lcs/gates/
// =====================================================================

// --- Capacity Gate (from capacity-gate.ts) ---

function checkCapacity(ctx: CapacityGateContext): GateResult {
  const GATE = 'CAPACITY';

  if (!ctx.founder_calendar_available) {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Founder calendar unavailable -- all sends paused', blocked_event_type: 'SIGNAL_DROPPED' };
  }
  if (ctx.adapter_health_status === 'PAUSED') {
    return { gate: GATE, verdict: 'BLOCK', reason: `Adapter paused -- health_status: ${ctx.adapter_health_status}`, blocked_event_type: 'SIGNAL_DROPPED' };
  }
  if (ctx.adapter_daily_cap !== null && ctx.adapter_sent_today >= ctx.adapter_daily_cap) {
    return { gate: GATE, verdict: 'BLOCK', reason: `Adapter daily cap reached: ${ctx.adapter_sent_today}/${ctx.adapter_daily_cap}`, blocked_event_type: 'SIGNAL_DROPPED' };
  }
  if (ctx.agent_sent_today >= ctx.agent_daily_cap) {
    return { gate: GATE, verdict: 'BLOCK', reason: `Agent ${ctx.agent_number} territory cap reached: ${ctx.agent_sent_today}/${ctx.agent_daily_cap}`, blocked_event_type: 'SIGNAL_DROPPED' };
  }

  return { gate: GATE, verdict: 'PASS', reason: 'Capacity available' };
}

// --- Suppression Engine (from suppression-engine.ts) ---

function checkSuppression(ctx: SuppressionContext): GateResult {
  const GATE = 'SUPPRESSION';

  if (ctx.never_contact) {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient flagged never_contact -- permanent suppression', blocked_event_type: 'COMPOSITION_BLOCKED' };
  }
  if (ctx.unsubscribed) {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient unsubscribed -- CAN-SPAM compliance', blocked_event_type: 'COMPOSITION_BLOCKED' };
  }
  if (ctx.hard_bounced) {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient hard bounced -- email permanently undeliverable', blocked_event_type: 'COMPOSITION_BLOCKED' };
  }
  if (ctx.complained) {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient filed spam complaint -- permanent suppression', blocked_event_type: 'COMPOSITION_BLOCKED' };
  }

  if (ctx.suppression_state === 'SUPPRESSED') {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient in SUPPRESSED state', blocked_event_type: 'COMPOSITION_BLOCKED' };
  }
  if (ctx.suppression_state === 'PARKED') {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient in PARKED state -- temporarily removed from outreach', blocked_event_type: 'COMPOSITION_BLOCKED' };
  }
  if (ctx.suppression_state === 'COOLED') {
    return { gate: GATE, verdict: 'BLOCK', reason: 'Recipient in COOLED state -- waiting for cooldown interval', blocked_event_type: 'RECIPIENT_THROTTLED' };
  }

  if (ctx.last_contact_at !== null) {
    const lastContact = new Date(ctx.last_contact_at);
    const now = new Date();
    const daysSinceContact = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceContact < ctx.min_contact_interval_days) {
      return { gate: GATE, verdict: 'BLOCK', reason: `Recipient contacted ${daysSinceContact.toFixed(1)} days ago -- minimum interval is ${ctx.min_contact_interval_days} days`, blocked_event_type: 'RECIPIENT_THROTTLED' };
    }
  }

  if (ctx.company_sends_this_week >= ctx.company_weekly_cap) {
    return { gate: GATE, verdict: 'BLOCK', reason: `Company weekly cap reached: ${ctx.company_sends_this_week}/${ctx.company_weekly_cap}`, blocked_event_type: 'COMPANY_THROTTLED' };
  }

  return { gate: GATE, verdict: 'PASS', reason: 'Recipient active, within frequency limits, company under cap' };
}

// --- Freshness Gate (from freshness-gate.ts) ---

function isStale(sh: SubHubFreshness): boolean {
  if (sh.data_fetched_at === null) return true;
  const fetchedAt = new Date(sh.data_fetched_at);
  const now = new Date();
  const daysSinceFetch = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceFetch > sh.freshness_window_days;
}

function checkFreshness(ctx: FreshnessGateContext): GateResult {
  const GATE = 'FRESHNESS';

  const staleSubHubs: string[] = [];
  let peopleStale = false;

  for (const sh of ctx.sub_hub_freshness) {
    if (isStale(sh)) {
      staleSubHubs.push(sh.sub_hub);
      if (sh.sub_hub === 'PEOPLE') peopleStale = true;
    }
  }

  if (peopleStale) {
    return { gate: GATE, verdict: 'BLOCK', reason: 'People sub-hub data is stale -- hard block, no contact without fresh contact data', blocked_event_type: 'DATA_STALE' };
  }

  if (staleSubHubs.length === 0) {
    return { gate: GATE, verdict: 'PASS', reason: 'All sub-hub data is fresh' };
  }

  const downgradeAmount = staleSubHubs.length;
  const newTier = Math.min(ctx.current_tier + downgradeAmount, 5) as IntelligenceTier;

  if (newTier === ctx.current_tier) {
    return { gate: GATE, verdict: 'PASS', reason: `Sub-hubs stale (${staleSubHubs.join(', ')}) but already at tier ${ctx.current_tier} -- no further downgrade` };
  }

  if (ctx.frame_required_fields.length === 0) {
    return { gate: GATE, verdict: 'DOWNGRADE', reason: `Stale sub-hubs: ${staleSubHubs.join(', ')}. Tier downgraded ${ctx.current_tier} -> ${newTier}. Frame has no required fields -- safe to proceed.`, downgraded_tier: newTier };
  }

  if (ctx.frame_fallback_id !== null) {
    return { gate: GATE, verdict: 'DOWNGRADE', reason: `Stale sub-hubs: ${staleSubHubs.join(', ')}. Tier downgraded ${ctx.current_tier} -> ${newTier}. Fallback frame available: ${ctx.frame_fallback_id}`, downgraded_tier: newTier };
  }

  return { gate: GATE, verdict: 'BLOCK', reason: `Stale sub-hubs: ${staleSubHubs.join(', ')}. Tier downgraded ${ctx.current_tier} -> ${newTier}. Frame requires fields (${ctx.frame_required_fields.join(', ')}) with no fallback -- cannot proceed.`, blocked_event_type: 'FRAME_INELIGIBLE' };
}

// =====================================================================
// ADAPTERS -- Inlined from src/app/lcs/adapters/
// =====================================================================

// --- Mailgun Adapter (from mailgun-adapter.ts) ---

class MailgunAdapter implements LcsAdapter {
  readonly channel = 'MG' as const;

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    const apiKey = Deno.env.get('MAILGUN_API_KEY') ?? '';
    const baseUrl = Deno.env.get('MAILGUN_API_URL') ?? 'https://api.mailgun.net/v3';

    if (!payload.recipient_email) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: 'No recipient email provided' }, error_message: 'Mailgun requires recipient_email' };
    }
    if (!payload.sender_domain) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: 'No sender domain provided' }, error_message: 'Mailgun requires sender_domain for domain routing' };
    }
    if (!apiKey) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: 'MAILGUN_API_KEY not configured' }, error_message: 'Missing MAILGUN_API_KEY environment variable' };
    }

    const url = `${baseUrl}/${payload.sender_domain}/messages`;
    const formData = new FormData();
    formData.append('from', `${payload.sender_identity} <${payload.sender_email ?? `noreply@${payload.sender_domain}`}>`);
    formData.append('to', payload.recipient_email);
    if (payload.subject) formData.append('subject', payload.subject);
    if (payload.body_html) formData.append('html', payload.body_html);
    if (payload.body_text) formData.append('text', payload.body_text);
    formData.append('v:communication_id', payload.communication_id);
    formData.append('v:message_run_id', payload.message_run_id);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(`api:${apiKey}`)}` },
        body: formData,
      });
      const body = await response.json() as Record<string, unknown>;

      if (response.ok) {
        return { success: true, delivery_status: 'SENT', adapter_message_id: (body.id as string) ?? null, raw_response: body, error_message: null };
      }
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: body, error_message: (body.message as string) ?? `Mailgun HTTP ${response.status}` };
    } catch (err) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: err instanceof Error ? err.message : 'Unknown fetch error' }, error_message: err instanceof Error ? err.message : 'Mailgun request failed' };
    }
  }
}

// --- HeyReach Adapter (from heyreach-adapter.ts) ---

class HeyReachAdapter implements LcsAdapter {
  readonly channel = 'HR' as const;

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    const apiKey = Deno.env.get('HEYREACH_API_KEY') ?? '';
    const baseUrl = Deno.env.get('HEYREACH_API_URL') ?? 'https://api.heyreach.io/api/v1';

    if (!payload.recipient_linkedin_url) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: 'No recipient LinkedIn URL provided' }, error_message: 'HeyReach requires recipient_linkedin_url' };
    }
    if (!payload.body_text) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: 'No message text provided' }, error_message: 'HeyReach requires body_text for LinkedIn messages' };
    }
    if (!apiKey) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: 'HEYREACH_API_KEY not configured' }, error_message: 'Missing HEYREACH_API_KEY environment variable' };
    }

    const url = `${baseUrl}/messages/send`;
    const requestBody = {
      linkedin_url: payload.recipient_linkedin_url,
      message: payload.body_text,
      sender_identity: payload.sender_identity,
      metadata: {
        communication_id: payload.communication_id,
        message_run_id: payload.message_run_id,
        ...payload.metadata,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const body = await response.json() as Record<string, unknown>;

      if (response.ok) {
        return { success: true, delivery_status: 'SENT', adapter_message_id: (body.id as string) ?? (body.message_id as string) ?? null, raw_response: body, error_message: null };
      }
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: body, error_message: (body.error as string) ?? (body.message as string) ?? `HeyReach HTTP ${response.status}` };
    } catch (err) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: err instanceof Error ? err.message : 'Unknown fetch error' }, error_message: err instanceof Error ? err.message : 'HeyReach request failed' };
    }
  }
}

// --- Sales Handoff Adapter (from sales-handoff-adapter.ts) ---

class SalesHandoffAdapter implements LcsAdapter {
  readonly channel = 'SH' as const;

  async send(payload: AdapterPayload): Promise<AdapterResponse> {
    try {
      const handoffRecord = {
        communication_id: payload.communication_id,
        message_run_id: payload.message_run_id,
        sender_identity: payload.sender_identity,
        recipient_email: payload.recipient_email,
        recipient_linkedin_url: payload.recipient_linkedin_url,
        handoff_reason: (payload.metadata.signal_set_hash as string) ?? 'UNKNOWN',
        frame_id: (payload.metadata.frame_id as string) ?? 'UNKNOWN',
        created_at: new Date().toISOString(),
      };

      return { success: true, delivery_status: 'DELIVERED', adapter_message_id: `SH-${payload.communication_id}`, raw_response: handoffRecord, error_message: null };
    } catch (err) {
      return { success: false, delivery_status: 'FAILED', adapter_message_id: null, raw_response: { error: err instanceof Error ? err.message : 'Unknown error' }, error_message: err instanceof Error ? err.message : 'Sales handoff failed' };
    }
  }
}

// --- Adapter Resolver ---

function resolveAdapter(channel: Channel): LcsAdapter {
  const adapters: Record<Channel, LcsAdapter> = {
    MG: new MailgunAdapter(),
    HR: new HeyReachAdapter(),
    SH: new SalesHandoffAdapter(),
  };
  return adapters[channel];
}

// =====================================================================
// PIPELINE STEPS -- Inlined from src/app/lcs/pipeline/steps/
// =====================================================================

// --- Step 1: Signal Intake (from 01-signal-intake.ts) ---

async function signalIntake(state: PipelineState): Promise<StepResult> {
  const signal = state.signal;

  if (!signal.sovereign_company_id || !signal.signal_set_hash || !signal.lifecycle_phase) {
    state.failed = true;
    state.failure_step = 1;
    state.failure_reason = 'Signal missing required fields: sovereign_company_id, signal_set_hash, or lifecycle_phase';
    return { step_number: 1, step_name: 'Signal Intake', event_type: 'SIGNAL_DROPPED', success: false, state };
  }

  state.lane = signal.preferred_lane ?? 'MAIN';
  state.agent_number = signal.agent_number ?? 'UNASSIGNED';

  return { step_number: 1, step_name: 'Signal Intake', event_type: 'SIGNAL_RECEIVED', success: true, state, payload: { signal_data: signal.signal_data } };
}

// --- Step 2: Collect Intelligence (from 02-collect-intelligence.ts) ---

async function collectIntelligence(supabase: SupabaseClient, state: PipelineState): Promise<StepResult> {
  try {
    const { data, error } = await supabase
      .schema('lcs')
      .from('v_company_intelligence')
      .select('*')
      .eq('sovereign_company_id', state.signal.sovereign_company_id)
      .single();

    if (error || !data) {
      state.intelligence = null;
      state.intelligence_tier = 5;
      return { step_number: 2, step_name: 'Collect Intelligence', event_type: 'INTELLIGENCE_COLLECTED', success: true, state, payload: { intelligence_tier: 5, reason: 'No intelligence found for company' } };
    }

    state.intelligence = data as Record<string, unknown>;
    state.intelligence_tier = (data.intelligence_tier as IntelligenceTier) ?? 5;

    return { step_number: 2, step_name: 'Collect Intelligence', event_type: 'INTELLIGENCE_COLLECTED', success: true, state, payload: { intelligence_tier: state.intelligence_tier } };
  } catch (err) {
    state.failed = true;
    state.failure_step = 2;
    state.failure_reason = err instanceof Error ? err.message : 'Intelligence collection failed';
    return { step_number: 2, step_name: 'Collect Intelligence', event_type: 'DATA_STALE', success: false, state };
  }
}

// --- Step 3: Match Frame (from 03-match-frame.ts) ---

async function matchFrame(supabase: SupabaseClient, state: PipelineState): Promise<StepResult> {
  try {
    const { data, error } = await supabase
      .schema('lcs')
      .from('frame_registry')
      .select('*')
      .eq('lifecycle_phase', state.signal.lifecycle_phase)
      .eq('is_active', true)
      .lte('tier', state.intelligence_tier ?? 5)
      .order('tier', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) {
      state.failed = true;
      state.failure_step = 3;
      state.failure_reason = `No eligible frame found for phase=${state.signal.lifecycle_phase}, tier<=${state.intelligence_tier}`;
      return { step_number: 3, step_name: 'Match Frame', event_type: 'FRAME_INELIGIBLE', success: false, state };
    }

    const frame = data[0];
    state.frame_id = frame.frame_id as string;
    state.frame_type = frame.frame_type as FrameType;
    state.frame_required_fields = (frame.required_fields as string[]) ?? [];
    state.frame_fallback_id = (frame.fallback_frame as string) ?? null;

    return { step_number: 3, step_name: 'Match Frame', event_type: 'FRAME_MATCHED', success: true, state, payload: { frame_id: state.frame_id, frame_type: state.frame_type } };
  } catch (err) {
    state.failed = true;
    state.failure_step = 3;
    state.failure_reason = err instanceof Error ? err.message : 'Frame matching failed';
    return { step_number: 3, step_name: 'Match Frame', event_type: 'FRAME_INELIGIBLE', success: false, state };
  }
}

// --- Step 4: Mint IDs (from 04-mint-ids.ts) ---

async function mintIds(state: PipelineState): Promise<StepResult> {
  try {
    state.communication_id = mintCommunicationId(state.signal.lifecycle_phase);
    return { step_number: 4, step_name: 'Mint IDs', event_type: 'ID_MINTED', success: true, state, payload: { communication_id: state.communication_id } };
  } catch (err) {
    state.failed = true;
    state.failure_step = 4;
    state.failure_reason = err instanceof Error ? err.message : 'ID minting failed';
    return { step_number: 4, step_name: 'Mint IDs', event_type: 'ERROR_LOGGED', success: false, state };
  }
}

// --- Step 5: Resolve Audience (from 05-resolve-audience.ts) ---

async function resolveAudience(state: PipelineState, supabase: SupabaseClient): Promise<StepResult> {
  const intel = state.intelligence as Record<string, unknown> | null;

  let entityId: string | null = null;
  const entityType: EntityType = 'slot';
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
    return { step_number: 5, step_name: 'Resolve Audience', event_type: 'COMPOSITION_BLOCKED', success: false, state };
  }

  state.entity_type = entityType;
  state.entity_id = entityId;
  state.recipient_email = email;
  state.recipient_linkedin_url = linkedinUrl;

  // --- Domain Assignment (deterministic rotation) ---
  const domainResult = await assignDomain(supabase, state.communication_id!, state.signal.sovereign_company_id);

  if (!domainResult.success || !domainResult.assignment) {
    state.failed = true;
    state.failure_step = 5;
    state.failure_reason = domainResult.error ?? 'Domain rotation failed — no eligible domain';
    return { step_number: 5, step_name: 'Resolve Audience', event_type: 'COMPOSITION_BLOCKED', success: false, state };
  }

  state.sender_domain = domainResult.assignment.subdomain;
  state.sender_email = domainResult.assignment.sender_email;
  state.sender_identity = domainResult.assignment.sender_name;
  state.domain_pool_id = domainResult.assignment.domain_pool_id;

  return { step_number: 5, step_name: 'Resolve Audience', event_type: 'AUDIENCE_RESOLVED', success: true, state, payload: { entity_id: entityId, entity_type: entityType, recipient_email: email, sender_domain: state.sender_domain } };
}

// --- Step 6: Call Adapter (from 06-call-adapter.ts) ---

async function callAdapter(state: PipelineState, adapter: LcsAdapter): Promise<StepResult> {
  try {
    const channel: Channel = state.signal.preferred_channel ?? adapter.channel;
    state.channel = channel;
    state.adapter_type = adapter.channel;

    // --- Message Compilation (before adapter dispatch) ---
    const compiled = compileMessage(
      state.frame_id!,
      state.frame_type!,
      state.intelligence,
      state.sender_identity!
    );

    if (!compiled.success || !compiled.message) {
      state.failed = true;
      state.failure_step = 6;
      state.failure_reason = compiled.error ?? 'Message compilation failed';
      return { step_number: 6, step_name: 'Call Adapter', event_type: 'COMPOSITION_BLOCKED', success: false, state };
    }

    const attempt = 1;
    state.message_run_id = mintMessageRunId(state.communication_id!, channel, attempt);

    const payload: AdapterPayload = {
      message_run_id: state.message_run_id,
      communication_id: state.communication_id!,
      channel,
      recipient_email: state.recipient_email,
      recipient_linkedin_url: state.recipient_linkedin_url,
      subject: compiled.message.subject,
      body_html: compiled.message.body_html,
      body_text: compiled.message.body_text,
      sender_identity: state.sender_identity!,
      sender_email: state.sender_email,
      sender_domain: state.sender_domain,
      metadata: {
        frame_id: state.frame_id,
        signal_set_hash: state.signal.signal_set_hash,
        message_snapshot: compiled.message.snapshot,
      },
    };

    const response = await adapter.send(payload);
    state.adapter_response = response;
    state.delivery_status = response.delivery_status;

    return { step_number: 6, step_name: 'Call Adapter', event_type: 'ADAPTER_CALLED', success: true, state, payload: { adapter_response: response.raw_response, message_snapshot: compiled.message.snapshot } };
  } catch (err) {
    state.failed = true;
    state.failure_step = 6;
    state.failure_reason = err instanceof Error ? err.message : 'Adapter call failed';
    return { step_number: 6, step_name: 'Call Adapter', event_type: 'DELIVERY_FAILED', success: false, state };
  }
}

// --- Step 7: Log Delivery (from 07-log-delivery.ts) ---

async function logDelivery(state: PipelineState): Promise<StepResult> {
  const response = state.adapter_response;
  let eventType: EventType;

  if (!response) {
    eventType = 'DELIVERY_FAILED';
    state.failed = true;
    state.failure_step = 7;
    state.failure_reason = 'No adapter response available';
  } else if (response.success) {
    eventType = response.delivery_status === 'DELIVERED' ? 'DELIVERY_SUCCESS' : 'DELIVERY_SENT';
  } else if (response.delivery_status === 'BOUNCED') {
    eventType = 'DELIVERY_BOUNCED';
  } else {
    eventType = 'DELIVERY_FAILED';
  }

  return { step_number: 7, step_name: 'Log Delivery', event_type: eventType, success: !state.failed, state, payload: response ? { raw_response: response.raw_response } : undefined };
}

// =====================================================================
// ORCHESTRATOR -- Inlined from src/app/lcs/pipeline/orchestrator.ts
// =====================================================================

async function logStep(
  supabase: SupabaseClient,
  result: StepResult,
  state: PipelineState
): Promise<void> {
  const event: LcsEventInsert = {
    communication_id: state.communication_id ?? `PENDING-STEP-${result.step_number}`,
    message_run_id: state.message_run_id ?? `PENDING-STEP-${result.step_number}`,
    sovereign_company_id: state.signal.sovereign_company_id,
    entity_type: state.entity_type ?? 'slot',
    entity_id: state.entity_id ?? '00000000-0000-0000-0000-000000000000',
    signal_set_hash: state.signal.signal_set_hash,
    frame_id: state.frame_id ?? 'UNRESOLVED',
    adapter_type: state.adapter_type ?? 'UNRESOLVED',
    channel: state.channel ?? 'MG',
    delivery_status: state.delivery_status ?? 'PENDING',
    lifecycle_phase: state.signal.lifecycle_phase,
    event_type: result.event_type,
    lane: state.lane,
    agent_number: state.agent_number,
    step_number: result.step_number,
    step_name: result.step_name,
    payload: result.payload ?? null,
    adapter_response: state.adapter_response?.raw_response ?? null,
    intelligence_tier: state.intelligence_tier ?? null,
    sender_identity: state.sender_identity ?? null,
  };

  await logCetEvent(supabase, event);
}

async function logGateBlock(
  supabase: SupabaseClient,
  state: PipelineState,
  gate: { blocked_event_type?: string; reason: string }
): Promise<void> {
  const event: LcsEventInsert = {
    communication_id: state.communication_id ?? 'GATE-BLOCKED',
    message_run_id: state.message_run_id ?? 'GATE-BLOCKED',
    sovereign_company_id: state.signal.sovereign_company_id,
    entity_type: state.entity_type ?? 'slot',
    entity_id: state.entity_id ?? '00000000-0000-0000-0000-000000000000',
    signal_set_hash: state.signal.signal_set_hash,
    frame_id: state.frame_id ?? 'UNRESOLVED',
    adapter_type: state.adapter_type ?? 'UNRESOLVED',
    channel: state.channel ?? 'MG',
    delivery_status: 'FAILED',
    lifecycle_phase: state.signal.lifecycle_phase,
    event_type: (gate.blocked_event_type ?? 'SIGNAL_DROPPED') as EventType,
    lane: state.lane,
    agent_number: state.agent_number,
    step_number: 0,
    step_name: 'Gate Block',
    payload: { gate_reason: gate.reason },
    adapter_response: null,
    intelligence_tier: state.intelligence_tier ?? null,
    sender_identity: state.sender_identity ?? null,
  };

  await logCetEvent(supabase, event);
}

async function handleError(
  supabase: SupabaseClient,
  state: PipelineState
): Promise<void> {
  const commId = state.communication_id;
  const strikeNumber = commId ? await getNextStrikeNumber(supabase, commId) : 1;
  const orbtAction = getOrbtAction(strikeNumber);
  const altChannel = state.channel ? checkAltChannelEligible(state.channel) : { eligible: false, reason: 'No channel' };

  const err: LcsErr0Insert = {
    message_run_id: state.message_run_id ?? 'UNKNOWN',
    communication_id: commId ?? null,
    sovereign_company_id: state.signal.sovereign_company_id,
    failure_type: 'ADAPTER_ERROR',
    failure_message: state.failure_reason ?? state.adapter_response?.error_message ?? 'Unknown failure',
    lifecycle_phase: state.signal.lifecycle_phase,
    adapter_type: state.adapter_type ?? null,
    orbt_strike_number: strikeNumber,
    orbt_action_taken: orbtAction,
    orbt_alt_channel_eligible: altChannel.eligible,
    orbt_alt_channel_reason: altChannel.reason,
  };

  await logErr0(supabase, err);
}

function buildResult(state: PipelineState, stepsCompleted: number): PipelineResult {
  return {
    success: !state.failed,
    communication_id: state.communication_id,
    message_run_id: state.message_run_id,
    delivery_status: state.delivery_status,
    steps_completed: stepsCompleted,
    gate_results: state.gate_results,
    failure_reason: state.failure_reason,
  };
}

async function runPipeline(
  supabase: SupabaseClient,
  signal: SignalInput,
  adapter: LcsAdapter,
  gateContexts: {
    capacity: CapacityGateContext;
    suppression: SuppressionContext;
    freshness: Omit<FreshnessGateContext, 'frame_required_fields' | 'frame_fallback_id'>;
  }
): Promise<PipelineResult> {
  const state: PipelineState = {
    signal,
    agent_number: signal.agent_number ?? 'UNASSIGNED',
    lane: signal.preferred_lane ?? 'MAIN',
    intelligence: null,
    intelligence_tier: null,
    frame_id: null,
    frame_type: null,
    frame_required_fields: [],
    frame_fallback_id: null,
    communication_id: null,
    entity_type: null,
    entity_id: null,
    recipient_email: null,
    recipient_linkedin_url: null,
    sender_identity: null,
    sender_email: null,
    sender_domain: null,
    message_run_id: null,
    channel: null,
    adapter_type: null,
    adapter_response: null,
    delivery_status: null,
    gate_results: [],
    domain_pool_id: null,
    failed: false,
    failure_step: null,
    failure_reason: null,
  };

  // STEP 1: Signal Intake
  const step1 = await signalIntake(state);
  await logStep(supabase, step1, state);
  if (!step1.success) return buildResult(state, 1);

  // GATE: Capacity
  const capacityResult = checkCapacity(gateContexts.capacity);
  state.gate_results.push(capacityResult);
  if (capacityResult.verdict === 'BLOCK') {
    state.failed = true;
    state.failure_reason = capacityResult.reason;
    await logGateBlock(supabase, state, capacityResult);
    return buildResult(state, 1);
  }

  // STEP 2: Collect Intelligence
  const step2 = await collectIntelligence(supabase, state);
  await logStep(supabase, step2, state);
  if (!step2.success) return buildResult(state, 2);

  // GATE: Freshness
  const freshnessCtx: FreshnessGateContext = {
    ...gateContexts.freshness,
    frame_required_fields: [],
    frame_fallback_id: null,
  };
  const freshnessResult = checkFreshness(freshnessCtx);
  state.gate_results.push(freshnessResult);
  if (freshnessResult.verdict === 'BLOCK') {
    state.failed = true;
    state.failure_reason = freshnessResult.reason;
    await logGateBlock(supabase, state, freshnessResult);
    return buildResult(state, 2);
  }
  if (freshnessResult.verdict === 'DOWNGRADE' && freshnessResult.downgraded_tier) {
    state.intelligence_tier = freshnessResult.downgraded_tier;
  }

  // STEP 3: Match Frame
  const step3 = await matchFrame(supabase, state);
  await logStep(supabase, step3, state);
  if (!step3.success) return buildResult(state, 3);

  // Post-frame freshness re-check
  if (freshnessResult.verdict === 'DOWNGRADE') {
    const recheck: FreshnessGateContext = {
      ...gateContexts.freshness,
      current_tier: state.intelligence_tier!,
      frame_required_fields: state.frame_required_fields,
      frame_fallback_id: state.frame_fallback_id,
    };
    const recheckResult = checkFreshness(recheck);
    if (recheckResult.verdict === 'BLOCK') {
      state.gate_results.push(recheckResult);
      state.failed = true;
      state.failure_reason = recheckResult.reason;
      await logGateBlock(supabase, state, recheckResult);
      return buildResult(state, 3);
    }
  }

  // STEP 4: Mint IDs
  const step4 = await mintIds(state);
  await logStep(supabase, step4, state);
  if (!step4.success) return buildResult(state, 4);

  // GATE: Suppression
  const suppressionResult = checkSuppression(gateContexts.suppression);
  state.gate_results.push(suppressionResult);
  if (suppressionResult.verdict === 'BLOCK') {
    state.failed = true;
    state.failure_reason = suppressionResult.reason;
    await logGateBlock(supabase, state, suppressionResult);
    return buildResult(state, 4);
  }

  // STEP 5: Resolve Audience + Domain Assignment
  const step5 = await resolveAudience(state, supabase);
  await logStep(supabase, step5, state);
  if (!step5.success) return buildResult(state, 5);

  // STEP 6: Call Adapter
  const step6 = await callAdapter(state, adapter);
  await logStep(supabase, step6, state);
  if (!step6.success) {
    await handleError(supabase, state);
    return buildResult(state, 6);
  }

  // Post-send: record domain send (increment sent_today)
  if (step6.success && state.domain_pool_id) {
    await recordDomainSend(supabase, state.domain_pool_id);
  }

  // STEP 7: Log Delivery
  const step7 = await logDelivery(state);
  await logStep(supabase, step7, state);

  // If delivery failed, trigger ORBT error handling
  if (state.adapter_response && !state.adapter_response.success) {
    await handleError(supabase, state);
  }

  return buildResult(state, 7);
}

// =====================================================================
// CONTEXT HYDRATION -- Builds gate contexts from DB
// =====================================================================

async function hydrateCapacityContext(
  supabase: SupabaseClient,
  signal: SignalInput,
  channel: Channel
): Promise<CapacityGateContext> {
  const founderAvailable = (Deno.env.get('FOUNDER_CALENDAR_AVAILABLE') ?? 'true') === 'true';

  // Query adapter_registry for the target channel adapter
  const { data: adapterData } = await supabase
    .schema('lcs')
    .from('adapter_registry')
    .select('health_status, daily_cap, sent_today')
    .eq('channel', channel)
    .eq('is_active', true)
    .limit(1)
    .single();

  return {
    founder_calendar_available: founderAvailable,
    agent_number: signal.agent_number ?? 'UNASSIGNED',
    agent_daily_cap: 50,        // Default territory cap
    agent_sent_today: 0,        // TODO: query CET for today's agent sends
    adapter_daily_cap: adapterData?.daily_cap ?? null,
    adapter_sent_today: adapterData?.sent_today ?? 0,
    adapter_health_status: adapterData?.health_status ?? 'HEALTHY',
  };
}

async function hydrateSuppressionContext(
  supabase: SupabaseClient,
  signal: SignalInput,
  channel: Channel,
  recipientEmail: string | null
): Promise<SuppressionContext> {
  // Default context: no suppression
  const ctx: SuppressionContext = {
    suppression_state: 'ACTIVE',
    last_contact_at: null,
    min_contact_interval_days: 14,
    company_sends_this_week: 0,
    company_weekly_cap: 3,
    never_contact: false,
    unsubscribed: false,
    hard_bounced: false,
    complained: false,
    lifecycle_phase: signal.lifecycle_phase,
    channel,
  };

  // Check lcs.suppression for this email
  if (recipientEmail) {
    const { data: suppData } = await supabase
      .schema('lcs')
      .from('suppression')
      .select('suppression_state, never_contact, unsubscribed, hard_bounced, complained')
      .eq('email', recipientEmail)
      .eq('suppression_state', 'SUPPRESSED')
      .limit(1)
      .maybeSingle();

    if (suppData) {
      ctx.suppression_state = suppData.suppression_state as SuppressionState;
      ctx.never_contact = suppData.never_contact ?? false;
      ctx.unsubscribed = suppData.unsubscribed ?? false;
      ctx.hard_bounced = suppData.hard_bounced ?? false;
      ctx.complained = suppData.complained ?? false;
    }
  }

  // Check last contact from v_latest_by_company
  const { data: latestData } = await supabase
    .schema('lcs')
    .from('v_latest_by_company')
    .select('created_at')
    .eq('sovereign_company_id', signal.sovereign_company_id)
    .limit(1)
    .maybeSingle();

  if (latestData) {
    ctx.last_contact_at = latestData.created_at;
  }

  // Count company sends this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { count } = await supabase
    .schema('lcs')
    .from('event')
    .select('*', { count: 'exact', head: true })
    .eq('sovereign_company_id', signal.sovereign_company_id)
    .in('event_type', ['DELIVERY_SENT', 'DELIVERY_SUCCESS'])
    .gte('created_at', weekAgo.toISOString());

  ctx.company_sends_this_week = count ?? 0;

  return ctx;
}

async function hydrateFreshnessContext(
  supabase: SupabaseClient,
  signal: SignalInput,
  intelligenceTier: IntelligenceTier
): Promise<Omit<FreshnessGateContext, 'frame_required_fields' | 'frame_fallback_id'>> {
  // Query intelligence snapshot for data freshness timestamps
  const { data: intel } = await supabase
    .schema('lcs')
    .from('v_company_intelligence')
    .select('ceo_data_fetched_at, plan_year_end, latest_post_date, snapshot_at')
    .eq('sovereign_company_id', signal.sovereign_company_id)
    .limit(1)
    .maybeSingle();

  // Build sub-hub freshness from intelligence snapshot
  const subHubFreshness: SubHubFreshness[] = [
    {
      sub_hub: 'PEOPLE',
      data_fetched_at: intel?.ceo_data_fetched_at ?? null,
      freshness_window_days: 90,
    },
    {
      sub_hub: 'DOL',
      data_fetched_at: intel?.plan_year_end ?? null,
      freshness_window_days: 365,
    },
    {
      sub_hub: 'BLOG',
      data_fetched_at: intel?.latest_post_date ?? null,
      freshness_window_days: 30,
    },
    {
      sub_hub: 'SITEMAP',
      data_fetched_at: intel?.snapshot_at ?? null,
      freshness_window_days: 30,
    },
  ];

  return {
    current_tier: intelligenceTier,
    sub_hub_freshness: subHubFreshness,
  };
}

// =====================================================================
// EDGE FUNCTION ENTRY POINT
// =====================================================================

serve(async (req: Request) => {
  // Accept both POST (manual trigger) and GET (cron trigger)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch pending signals
  const { data: signals, error: fetchError } = await supabase
    .schema('lcs')
    .from('signal_queue')
    .select('*')
    .eq('status', 'PENDING')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error('[Pipeline Runner] Signal fetch failed:', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!signals || signals.length === 0) {
    return new Response(JSON.stringify({ status: 'idle', processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Process each signal
  const results: Array<{ signal_id: string; status: string; communication_id?: string; reason?: string }> = [];

  for (const rawSignal of signals) {
    try {
      // Mark signal as PROCESSING
      await supabase
        .schema('lcs')
        .from('signal_queue')
        .update({ status: 'PROCESSING' })
        .eq('id', rawSignal.id);

      // Build SignalInput from queue row
      const signal: SignalInput = {
        spoke_id: rawSignal.source_hub ?? 'SPOKE-CL-QUEUE',
        signal_set_hash: rawSignal.signal_set_hash,
        signal_category: rawSignal.signal_category ?? 'MANUAL_TRIGGER',
        sovereign_company_id: rawSignal.sovereign_company_id,
        lifecycle_phase: rawSignal.lifecycle_phase as LifecyclePhase,
        preferred_channel: (rawSignal.signal_data?.preferred_channel as Channel) ?? undefined,
        preferred_lane: (rawSignal.signal_data?.preferred_lane as Lane) ?? undefined,
        agent_number: (rawSignal.signal_data?.agent_number as string) ?? undefined,
        signal_data: rawSignal.signal_data ?? {},
      };

      // Determine channel (from signal preference or default to MG)
      const channel: Channel = signal.preferred_channel ?? 'MG';

      // Hydrate gate contexts
      const capacityCtx = await hydrateCapacityContext(supabase, signal, channel);
      const freshnessCtx = await hydrateFreshnessContext(supabase, signal, 5);

      // Get recipient email for suppression check (quick lookup from intelligence)
      const { data: intelPreview } = await supabase
        .schema('lcs')
        .from('v_company_intelligence')
        .select('ceo_email, cfo_email, hr_email')
        .eq('sovereign_company_id', signal.sovereign_company_id)
        .limit(1)
        .maybeSingle();

      const recipientEmail = intelPreview?.ceo_email
        ?? intelPreview?.cfo_email
        ?? intelPreview?.hr_email
        ?? null;

      const suppressionCtx = await hydrateSuppressionContext(supabase, signal, channel, recipientEmail);

      // Resolve adapter
      const adapter = resolveAdapter(channel);

      // Run pipeline
      const pipelineResult = await runPipeline(supabase, signal, adapter, {
        capacity: capacityCtx,
        suppression: suppressionCtx,
        freshness: freshnessCtx,
      });

      // Update signal_queue status
      const newStatus = pipelineResult.success ? 'COMPLETED' : 'FAILED';
      await supabase
        .schema('lcs')
        .from('signal_queue')
        .update({
          status: newStatus,
          processed_at: new Date().toISOString(),
        })
        .eq('id', rawSignal.id);

      results.push({
        signal_id: rawSignal.id,
        status: newStatus,
        communication_id: pipelineResult.communication_id ?? undefined,
        reason: pipelineResult.failure_reason ?? undefined,
      });
    } catch (err) {
      console.error(`[Pipeline Runner] Signal ${rawSignal.id} failed:`, err);

      await supabase
        .schema('lcs')
        .from('signal_queue')
        .update({
          status: 'FAILED',
          processed_at: new Date().toISOString(),
        })
        .eq('id', rawSignal.id);

      results.push({
        signal_id: rawSignal.id,
        status: 'FAILED',
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // 3. Return summary
  const succeeded = results.filter(r => r.status === 'COMPLETED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  return new Response(JSON.stringify({
    status: 'completed',
    processed: results.length,
    succeeded,
    failed,
    results,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
