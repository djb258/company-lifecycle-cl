import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type {
  LcsMidSequenceStateInsert, LcsSidOutputRow, LcsCidRow, LcsEventInsert,
  GateVerdict, ThrottleStatus, MidDeliveryStatus, MidSequenceType,
  Channel, LifecyclePhase
} from '@/data/lcs';
import { mintMessageRunId } from '../id-minter';
import { logCetEvent } from '../cet-logger';
import { logErr0, getNextStrikeNumber, getOrbtAction, checkAltChannelEligible } from '../err0-logger';
import { resolveAdapter } from '../adapters/adapter-resolver';
import type { AdapterPayload } from '../adapters/types';
import {
  checkCapacity, checkSuppression,
  type CapacityGateContext, type SuppressionContext
} from '@/sys/lcs/gates';

/**
 * MID Delivery Engine — Phase 4 of the CID→SID→MID pipeline.
 *
 * Reads CONSTRUCTED SID output rows, runs pre-delivery gates (capacity,
 * suppression), mints message_run_id, routes to adapter, writes
 * lcs.mid_sequence_state, and logs the final event to CET (lcs.event).
 *
 * Data flow:
 *   lcs.sid_output (CONSTRUCTED) → MID Engine → lcs.mid_sequence_state + lcs.event
 *
 * This replaces Steps 5-7 of the legacy monolithic orchestrator.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface DeliveryResult {
  communication_id: string;
  message_run_id: string | null;
  delivery_status: MidDeliveryStatus;
  gate_verdict: GateVerdict;
  reason: string | null;
}

interface MidEngineBatchResult {
  total: number;
  delivered: number;
  failed: number;
  blocked: number;
  results: DeliveryResult[];
}

// ═══════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════

/**
 * Process a batch of CONSTRUCTED SID rows through the delivery engine.
 *
 * @param batchSize - Max SID rows to process per invocation
 * @param defaultChannel - Default delivery channel if not specified
 */
export async function runMidEngine(
  batchSize: number = 50,
  defaultChannel: Channel = 'MG'
): Promise<MidEngineBatchResult> {
  const result: MidEngineBatchResult = {
    total: 0,
    delivered: 0,
    failed: 0,
    blocked: 0,
    results: [],
  };

  // Fetch CONSTRUCTED SID rows that don't yet have a MID sequence state
  const { data: sidRows, error: fetchError } = await lcsClient
    .from('sid_output')
    .select('*')
    .eq('construction_status', 'CONSTRUCTED')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError || !sidRows) {
    console.error('[MID Engine] Failed to fetch constructed SIDs:', fetchError?.message);
    return result;
  }

  // Filter out SIDs that already have a MID entry
  const commIds = sidRows.map((r: Record<string, unknown>) => r.communication_id as string);
  const { data: existingMids } = await lcsClient
    .from('mid_sequence_state')
    .select('communication_id')
    .in('communication_id', commIds);

  const processedSet = new Set(
    (existingMids ?? []).map((m: Record<string, unknown>) => m.communication_id as string)
  );

  const unprocessedSids = sidRows.filter(
    (r: Record<string, unknown>) => !processedSet.has(r.communication_id as string)
  );

  result.total = unprocessedSids.length;

  if (unprocessedSids.length === 0) {
    console.log('[MID Engine] No unprocessed CONSTRUCTED SIDs.');
    return result;
  }

  for (const raw of unprocessedSids) {
    const sid = raw as unknown as LcsSidOutputRow;
    const deliveryResult = await deliverSingleMessage(sid, defaultChannel);
    result.results.push(deliveryResult);

    if (deliveryResult.gate_verdict === 'FAIL') {
      result.blocked++;
    } else if (deliveryResult.delivery_status === 'FAILED' || deliveryResult.delivery_status === 'BOUNCED') {
      result.failed++;
    } else {
      result.delivered++;
    }
  }

  console.log(
    `[MID Engine] Batch complete: ${result.delivered} delivered, ` +
    `${result.failed} failed, ${result.blocked} blocked out of ${result.total}`
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════
// Single Message Delivery
// ═══════════════════════════════════════════════════════════════

async function deliverSingleMessage(
  sid: LcsSidOutputRow,
  defaultChannel: Channel
): Promise<DeliveryResult> {
  try {
    // --- Fetch CID row for pipeline context ---
    const { data: cidData } = await lcsClient
      .from('cid')
      .select('*')
      .eq('communication_id', sid.communication_id)
      .single();

    if (!cidData) {
      const midRow = await writeMidRow(sid.communication_id, {
        messageRunId: 'UNRESOLVED',
        adapterType: defaultChannel,
        channel: defaultChannel,
        sequencePosition: 1,
        attemptNumber: 1,
        gateVerdict: 'FAIL',
        gateReason: 'CID row not found',
        throttleStatus: null,
        deliveryStatus: 'FAILED',
      });
      return midRow;
    }

    const cid = cidData as unknown as LcsCidRow;

    // --- Determine channel and sequence type ---
    const channel: Channel = defaultChannel;
    const sequenceType: MidSequenceType =
      (await getFrameSequenceType(cid.frame_id)) ?? 'IMMEDIATE';

    // Handle DELAYED sequences
    if (sequenceType === 'DELAYED') {
      const delayHours = await getFrameDelayHours(cid.frame_id);
      return await writeMidRow(sid.communication_id, {
        messageRunId: 'PENDING-DELAYED',
        adapterType: channel,
        channel,
        sequencePosition: 1,
        attemptNumber: 1,
        gateVerdict: 'PASS',
        gateReason: null,
        throttleStatus: 'CLEAR',
        deliveryStatus: 'QUEUED',
        scheduledAt: new Date(Date.now() + (delayHours ?? 0) * 3600_000).toISOString(),
      });
    }

    // --- Capacity gate ---
    const capacityCtx = await assembleCapacityCtx(cid.agent_number, channel);
    const capacityResult = checkCapacity(capacityCtx);
    if (capacityResult.verdict === 'BLOCK') {
      return await writeMidRow(sid.communication_id, {
        messageRunId: 'GATE-BLOCKED',
        adapterType: channel,
        channel,
        sequencePosition: 1,
        attemptNumber: 1,
        gateVerdict: 'FAIL',
        gateReason: `Capacity: ${capacityResult.reason}`,
        throttleStatus: 'THROTTLED_ADAPTER',
        deliveryStatus: 'FAILED',
      });
    }

    // --- Suppression gate ---
    const suppressionCtx = await assembleSuppressionCtx(
      cid.entity_id, cid.sovereign_company_id, cid.lifecycle_phase, channel
    );
    const suppressionResult = checkSuppression(suppressionCtx);
    if (suppressionResult.verdict === 'BLOCK') {
      return await writeMidRow(sid.communication_id, {
        messageRunId: 'GATE-BLOCKED',
        adapterType: channel,
        channel,
        sequencePosition: 1,
        attemptNumber: 1,
        gateVerdict: 'FAIL',
        gateReason: `Suppression: ${suppressionResult.reason}`,
        throttleStatus: 'THROTTLED_RECIPIENT',
        deliveryStatus: 'FAILED',
      });
    }

    // --- Mint message_run_id ---
    const attemptNumber = 1;
    const messageRunId = mintMessageRunId(sid.communication_id, channel, attemptNumber);

    // --- Call adapter ---
    const adapter = resolveAdapter(channel);
    if (!adapter) {
      return await writeMidRow(sid.communication_id, {
        messageRunId,
        adapterType: channel,
        channel,
        sequencePosition: 1,
        attemptNumber,
        gateVerdict: 'PASS',
        gateReason: null,
        throttleStatus: 'CLEAR',
        deliveryStatus: 'FAILED',
      });
    }

    const payload: AdapterPayload = {
      message_run_id: messageRunId,
      communication_id: sid.communication_id,
      channel,
      recipient_email: sid.recipient_email,
      recipient_linkedin_url: null,
      subject: sid.subject_line,
      body_html: sid.body_html,
      body_text: sid.body_plain,
      sender_identity: sid.sender_identity ?? 'default-sender',
      sender_email: sid.sender_email,
      sender_domain: null,
      metadata: { frame_id: sid.frame_id },
    };

    const adapterResponse = await adapter.send(payload);

    // --- Determine delivery status ---
    const deliveryStatus: MidDeliveryStatus = adapterResponse.success
      ? (adapterResponse.delivery_status === 'DELIVERED' ? 'DELIVERED' : 'SENT')
      : (adapterResponse.delivery_status === 'BOUNCED' ? 'BOUNCED' : 'FAILED');

    // --- Write MID row ---
    const midResult = await writeMidRow(sid.communication_id, {
      messageRunId,
      adapterType: channel,
      channel,
      sequencePosition: 1,
      attemptNumber,
      gateVerdict: 'PASS',
      gateReason: null,
      throttleStatus: 'CLEAR',
      deliveryStatus,
      attemptedAt: new Date().toISOString(),
    });

    // --- Log to CET ---
    await logCetEventFromMid(cid, sid, messageRunId, channel, deliveryStatus, adapterResponse);

    // --- Handle ORBT on failure ---
    if (!adapterResponse.success) {
      await handleOrbtError(cid, sid, messageRunId, channel, adapterResponse);
    }

    return midResult;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unhandled delivery error';
    console.error(`[MID Engine] Error delivering ${sid.communication_id}:`, reason);

    return await writeMidRow(sid.communication_id, {
      messageRunId: 'ERROR',
      adapterType: defaultChannel,
      channel: defaultChannel,
      sequencePosition: 1,
      attemptNumber: 1,
      gateVerdict: 'FAIL',
      gateReason: reason,
      throttleStatus: null,
      deliveryStatus: 'FAILED',
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// MID Row Writer
// ═══════════════════════════════════════════════════════════════

interface MidFields {
  messageRunId: string;
  adapterType: string;
  channel: Channel;
  sequencePosition: number;
  attemptNumber: number;
  gateVerdict: GateVerdict;
  gateReason: string | null;
  throttleStatus: ThrottleStatus | null;
  deliveryStatus: MidDeliveryStatus;
  scheduledAt?: string | null;
  attemptedAt?: string | null;
}

async function writeMidRow(
  communicationId: string,
  fields: MidFields
): Promise<DeliveryResult> {
  const row: LcsMidSequenceStateInsert = {
    message_run_id: fields.messageRunId,
    communication_id: communicationId,
    adapter_type: fields.adapterType,
    channel: fields.channel,
    sequence_position: fields.sequencePosition,
    attempt_number: fields.attemptNumber,
    gate_verdict: fields.gateVerdict,
    gate_reason: fields.gateReason,
    throttle_status: fields.throttleStatus,
    delivery_status: fields.deliveryStatus,
    scheduled_at: fields.scheduledAt ?? null,
    attempted_at: fields.attemptedAt ?? null,
  };

  const { error } = await lcsClient
    .from('mid_sequence_state')
    .insert(row as Record<string, unknown>);

  if (error) {
    console.error('[MID Engine] Failed to write MID row:', error.message);
  }

  return {
    communication_id: communicationId,
    message_run_id: fields.messageRunId,
    delivery_status: fields.deliveryStatus,
    gate_verdict: fields.gateVerdict,
    reason: fields.gateReason,
  };
}

// ═══════════════════════════════════════════════════════════════
// CET Event Logger
// ═══════════════════════════════════════════════════════════════

async function logCetEventFromMid(
  cid: LcsCidRow,
  sid: LcsSidOutputRow,
  messageRunId: string,
  channel: Channel,
  deliveryStatus: MidDeliveryStatus,
  adapterResponse: { success: boolean; delivery_status: string; raw_response: Record<string, unknown> | null }
): Promise<void> {
  const eventType = adapterResponse.success
    ? (deliveryStatus === 'DELIVERED' ? 'DELIVERY_SUCCESS' : 'DELIVERY_SENT')
    : (deliveryStatus === 'BOUNCED' ? 'DELIVERY_BOUNCED' : 'DELIVERY_FAILED');

  const event: LcsEventInsert = {
    communication_id: cid.communication_id,
    message_run_id: messageRunId,
    sovereign_company_id: cid.sovereign_company_id,
    entity_type: cid.entity_type,
    entity_id: cid.entity_id,
    signal_set_hash: cid.signal_set_hash,
    frame_id: cid.frame_id,
    adapter_type: channel,
    channel,
    delivery_status: deliveryStatus as string as LcsEventInsert['delivery_status'],
    lifecycle_phase: cid.lifecycle_phase,
    event_type: eventType,
    lane: cid.lane,
    agent_number: cid.agent_number,
    step_number: 7,
    step_name: 'MID Delivery',
    payload: { sid_id: sid.sid_id, template_id: sid.template_id },
    adapter_response: adapterResponse.raw_response,
    intelligence_tier: cid.intelligence_tier,
    sender_identity: sid.sender_identity,
  };

  await logCetEvent(event);
}

// ═══════════════════════════════════════════════════════════════
// ORBT Error Handler
// ═══════════════════════════════════════════════════════════════

async function handleOrbtError(
  cid: LcsCidRow,
  sid: LcsSidOutputRow,
  messageRunId: string,
  channel: Channel,
  adapterResponse: { error_message?: string }
): Promise<void> {
  const strikeNumber = await getNextStrikeNumber(cid.communication_id);
  const orbtAction = getOrbtAction(strikeNumber);
  const altChannel = checkAltChannelEligible(channel);

  await logErr0({
    message_run_id: messageRunId,
    communication_id: cid.communication_id,
    sovereign_company_id: cid.sovereign_company_id,
    failure_type: 'ADAPTER_ERROR',
    failure_message: adapterResponse.error_message ?? 'Adapter delivery failed',
    lifecycle_phase: cid.lifecycle_phase,
    adapter_type: channel,
    orbt_strike_number: strikeNumber,
    orbt_action_taken: orbtAction,
    orbt_alt_channel_eligible: altChannel.eligible,
    orbt_alt_channel_reason: altChannel.reason,
  });
}

// ═══════════════════════════════════════════════════════════════
// Frame Helpers
// ═══════════════════════════════════════════════════════════════

async function getFrameSequenceType(frameId: string): Promise<MidSequenceType | null> {
  const { data } = await lcsClient
    .from('frame_registry')
    .select('mid_sequence_type')
    .eq('frame_id', frameId)
    .single();

  return (data?.mid_sequence_type as MidSequenceType) ?? null;
}

async function getFrameDelayHours(frameId: string): Promise<number | null> {
  const { data } = await lcsClient
    .from('frame_registry')
    .select('mid_delay_hours')
    .eq('frame_id', frameId)
    .single();

  return (data?.mid_delay_hours as number) ?? null;
}

// ═══════════════════════════════════════════════════════════════
// Context Assemblers
// ═══════════════════════════════════════════════════════════════

async function assembleCapacityCtx(
  agentNumber: string,
  channel: Channel
): Promise<CapacityGateContext> {
  const { data: adapter } = await lcsClient
    .from('adapter_registry')
    .select('daily_cap, sent_today, health_status')
    .eq('adapter_type', channel)
    .single();

  return {
    founder_calendar_clear: true,
    agent_daily_cap: 200,
    agent_sent_today: 0,
    adapter_daily_cap: adapter?.daily_cap as number ?? 150,
    adapter_sent_today: adapter?.sent_today as number ?? 0,
    adapter_health: (adapter?.health_status as string) ?? 'HEALTHY',
  };
}

async function assembleSuppressionCtx(
  entityId: string,
  companyId: string,
  phase: LifecyclePhase,
  channel: Channel
): Promise<SuppressionContext> {
  return {
    entity_id: entityId,
    company_id: companyId,
    lifecycle_phase: phase,
    channel,
    never_contact: false,
    unsubscribed: false,
    hard_bounced: false,
    complained: false,
  };
}
