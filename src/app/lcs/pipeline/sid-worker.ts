import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type {
  LcsSidOutputInsert, LcsCidRow, ConstructionStatus
} from '@/data/lcs';
import pg from 'pg';

/**
 * SID Worker — Phase 3 of the CID→SID→MID pipeline.
 *
 * Two execution modes:
 *   1. Batch (cron): runSidWorker() — polls COMPILED CID rows on schedule
 *   2. LISTEN (real-time): startSidWorkerListener() — receives pg_notify
 *      from trg_lcs_cid_notify_sid_worker when a COMPILED CID is inserted
 *
 * The DB trigger (lcs.notify_sid_worker) fires pg_notify('lcs_sid_worker', ...)
 * on every COMPILED CID insert. The listener processes CIDs in near-real-time.
 * The cron batch acts as a catch-all for any notifications missed during downtime.
 *
 * Data flow:
 *   lcs.cid (COMPILED) → SID Worker → lcs.sid_output (CONSTRUCTED|FAILED|BLOCKED)
 *
 * This replaces Step 5 + composition portion of Step 6 from the legacy orchestrator.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ConstructionResult {
  sid_id: string | null;
  communication_id: string;
  construction_status: ConstructionStatus;
  construction_reason: string | null;
}

interface SidWorkerBatchResult {
  total: number;
  constructed: number;
  failed: number;
  blocked: number;
  results: ConstructionResult[];
}

// ═══════════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════════

/**
 * Process a batch of COMPILED CID rows into SID output rows.
 *
 * @param batchSize - Max CID rows to process per invocation
 */
export async function runSidWorker(batchSize: number = 50): Promise<SidWorkerBatchResult> {
  const result: SidWorkerBatchResult = {
    total: 0,
    constructed: 0,
    failed: 0,
    blocked: 0,
    results: [],
  };

  // Fetch COMPILED CID rows that don't yet have a SID output
  // Left-join approach: fetch CID rows and check existence in sid_output
  const { data: cidRows, error: fetchError } = await lcsClient
    .from('cid')
    .select('*')
    .eq('compilation_status', 'COMPILED')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (fetchError || !cidRows) {
    console.error('[SID Worker] Failed to fetch compiled CIDs:', fetchError?.message);
    return result;
  }

  // Filter out CIDs that already have SID output
  const cidIds = cidRows.map((r: Record<string, unknown>) => r.communication_id as string);
  const { data: existingSids } = await lcsClient
    .from('sid_output')
    .select('communication_id')
    .in('communication_id', cidIds);

  const processedSet = new Set(
    (existingSids ?? []).map((s: Record<string, unknown>) => s.communication_id as string)
  );

  const unprocessedCids = cidRows.filter(
    (r: Record<string, unknown>) => !processedSet.has(r.communication_id as string)
  );

  result.total = unprocessedCids.length;

  if (unprocessedCids.length === 0) {
    console.log('[SID Worker] No unprocessed COMPILED CIDs.');
    return result;
  }

  for (const raw of unprocessedCids) {
    const cid = raw as unknown as LcsCidRow;
    const constructResult = await constructSingleMessage(cid);
    result.results.push(constructResult);

    switch (constructResult.construction_status) {
      case 'CONSTRUCTED': result.constructed++; break;
      case 'FAILED': result.failed++; break;
      case 'BLOCKED': result.blocked++; break;
    }
  }

  console.log(
    `[SID Worker] Batch complete: ${result.constructed} constructed, ` +
    `${result.failed} failed, ${result.blocked} blocked out of ${result.total}`
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════
// LISTEN Mode (Real-Time via pg_notify)
// ═══════════════════════════════════════════════════════════════

interface SidListenerHandle {
  stop: () => Promise<void>;
}

/**
 * Start a persistent LISTEN connection for near-real-time SID processing.
 *
 * Listens on pg_notify channel 'lcs_sid_worker' fired by
 * trg_lcs_cid_notify_sid_worker when a COMPILED CID is inserted.
 *
 * @param connectionString - PostgreSQL connection string (from Doppler VITE_DATABASE_URL)
 * @returns Handle with stop() to cleanly disconnect
 */
export async function startSidWorkerListener(
  connectionString: string
): Promise<SidListenerHandle> {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query('LISTEN lcs_sid_worker');
  console.log('[SID Worker] LISTEN mode active on channel lcs_sid_worker');

  client.on('notification', async (msg) => {
    if (msg.channel !== 'lcs_sid_worker' || !msg.payload) return;

    try {
      const payload = JSON.parse(msg.payload) as {
        communication_id: string;
        signal_queue_id: string | null;
        sovereign_company_id: string;
        created_at: string;
      };

      console.log(`[SID Worker] Notify received for ${payload.communication_id}`);

      // Fetch the full CID row
      const { data: cidRow } = await lcsClient
        .from('cid')
        .select('*')
        .eq('communication_id', payload.communication_id)
        .single();

      if (!cidRow) {
        console.error(`[SID Worker] CID not found: ${payload.communication_id}`);
        return;
      }

      // Check if SID already exists (idempotency guard)
      const { data: existingSid } = await lcsClient
        .from('sid_output')
        .select('sid_id')
        .eq('communication_id', payload.communication_id)
        .limit(1);

      if (existingSid && existingSid.length > 0) {
        console.log(`[SID Worker] SID already exists for ${payload.communication_id}, skipping`);
        return;
      }

      const cid = cidRow as unknown as LcsCidRow;
      const result = await constructSingleMessage(cid);
      console.log(
        `[SID Worker] Notify processed ${payload.communication_id}: ${result.construction_status}`
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown listener error';
      console.error(`[SID Worker] Listener error:`, reason);
    }
  });

  return {
    stop: async () => {
      await client.query('UNLISTEN lcs_sid_worker');
      await client.end();
      console.log('[SID Worker] LISTEN mode stopped');
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Single Message Construction
// ═══════════════════════════════════════════════════════════════

async function constructSingleMessage(cid: LcsCidRow): Promise<ConstructionResult> {
  try {
    // --- Read frame for template info ---
    const { data: frame } = await lcsClient
      .from('frame_registry')
      .select('*')
      .eq('frame_id', cid.frame_id)
      .single();

    if (!frame) {
      return await writeSidRow(cid, 'FAILED', 'Frame not found in registry', {});
    }

    const templateId = (frame.sid_template_id as string) ?? null;

    // --- Collect intelligence for recipient resolution ---
    const { data: intel } = await lcsClient
      .from('v_company_intelligence')
      .select('*')
      .eq('sovereign_company_id', cid.sovereign_company_id)
      .single();

    // --- Resolve recipient ---
    let recipientEmail: string | null = null;
    let recipientName: string | null = null;

    if (intel) {
      if (intel.ceo_email) {
        recipientEmail = intel.ceo_email as string;
        recipientName = intel.ceo_name as string ?? null;
      } else if (intel.cfo_email) {
        recipientEmail = intel.cfo_email as string;
        recipientName = intel.cfo_name as string ?? null;
      } else if (intel.hr_email) {
        recipientEmail = intel.hr_email as string;
        recipientName = intel.hr_name as string ?? null;
      }
    }

    if (!recipientEmail) {
      return await writeSidRow(cid, 'FAILED', 'No recipient email resolved from intelligence', {
        template_id: templateId,
      });
    }

    // --- Resolve sender ---
    const senderIdentity = `${cid.lifecycle_phase.toLowerCase()}-sender`;
    const senderEmail: string | null = null; // Resolved by adapter from identity

    // --- Construct message content ---
    // Template resolution is deterministic: frame_type + template_id → subject + body
    // Actual template engine would resolve variables here.
    // For now, we produce the construction record with resolved fields.
    const companyName = intel?.company_name as string ?? 'Company';
    const frameName = frame.frame_name as string ?? cid.frame_id;

    const subjectLine = `[${frameName}] Communication for ${companyName}`;
    const bodyPlain = `This is a ${cid.lifecycle_phase} communication ` +
      `via frame ${cid.frame_id} for ${companyName}.`;
    const bodyHtml: string | null = null; // HTML template rendering (future)

    // --- Write SID output ---
    return await writeSidRow(cid, 'CONSTRUCTED', null, {
      template_id: templateId,
      subject_line: subjectLine,
      body_plain: bodyPlain,
      body_html: bodyHtml,
      sender_identity: senderIdentity,
      sender_email: senderEmail,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Unhandled construction error';
    console.error(`[SID Worker] Error constructing message for ${cid.communication_id}:`, reason);
    return await writeSidRow(cid, 'FAILED', reason, {});
  }
}

// ═══════════════════════════════════════════════════════════════
// SID Row Writer
// ═══════════════════════════════════════════════════════════════

interface SidFields {
  template_id?: string | null;
  subject_line?: string | null;
  body_plain?: string | null;
  body_html?: string | null;
  sender_identity?: string | null;
  sender_email?: string | null;
  recipient_email?: string | null;
  recipient_name?: string | null;
}

async function writeSidRow(
  cid: LcsCidRow,
  status: ConstructionStatus,
  reason: string | null,
  fields: SidFields
): Promise<ConstructionResult> {
  const row: LcsSidOutputInsert = {
    communication_id: cid.communication_id,
    frame_id: cid.frame_id,
    template_id: fields.template_id ?? null,
    subject_line: fields.subject_line ?? null,
    body_plain: fields.body_plain ?? null,
    body_html: fields.body_html ?? null,
    sender_identity: fields.sender_identity ?? null,
    sender_email: fields.sender_email ?? null,
    recipient_email: fields.recipient_email ?? null,
    recipient_name: fields.recipient_name ?? null,
    construction_status: status,
    construction_reason: reason,
  };

  const { data, error } = await lcsClient
    .from('sid_output')
    .insert(row as Record<string, unknown>)
    .select('sid_id')
    .single();

  if (error) {
    console.error('[SID Worker] Failed to write SID row:', error.message);
  }

  return {
    sid_id: (data?.sid_id as string) ?? null,
    communication_id: cid.communication_id,
    construction_status: status,
    construction_reason: reason,
  };
}
