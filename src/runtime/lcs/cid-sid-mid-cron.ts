import { runCidCompiler } from '@/app/lcs/pipeline/cid-compiler';
import { runSidWorker } from '@/app/lcs/pipeline/sid-worker';
import { runMidEngine } from '@/app/lcs/pipeline/mid-engine';
import { lcsClient } from '@/data/integrations/supabase/lcs-client';
import type { Channel } from '@/data/lcs';

/**
 * CID→SID→MID Cron Runner — orchestrates the three-phase pipeline.
 *
 * Runs CID compiler, then SID worker, then MID engine in sequence.
 * Each phase processes a batch of its input and produces output for the next phase.
 *
 * DRY_RUN mode: Validates handoff field completeness across all three phases
 * without executing delivery. Logs PASS/FAIL per field against the Lovable
 * delivery contract.
 *
 * Scheduling (pg_cron or external):
 *   - Business hours: Every 15 minutes, Mon-Fri
 *   - Matches existing lcs-signal-bridge schedule
 *
 * This replaces the legacy cron-runner.ts which called the monolithic orchestrator.
 */

interface PipelineCronResult {
  cid: { total: number; compiled: number; failed: number; blocked: number };
  sid: { total: number; constructed: number; failed: number; blocked: number };
  mid: { total: number; delivered: number; failed: number; blocked: number };
  duration_ms: number;
}

// ═══════════════════════════════════════════════════════════════
// DRY_RUN Mode
// ═══════════════════════════════════════════════════════════════

/** Fields required by the Lovable delivery contract */
const LOVABLE_CONTRACT_FIELDS = [
  'communication_id',
  'message_run_id',
  'channel',
  'recipient_email',
  'recipient_linkedin_url',
  'subject_line',
  'body_plain',
  'body_html',
  'sender_identity',
  'frame_id',
  'lifecycle_phase',
  'sovereign_company_id',
  'company_name',
  'agent_number',
  'metadata',
] as const;

interface FieldCheck {
  field: string;
  status: 'PASS' | 'FAIL';
  value_present: boolean;
}

interface DryRunRecord {
  communication_id: string;
  phase: 'CID' | 'SID' | 'MID_HANDOFF';
  fields: FieldCheck[];
  overall: 'PASS' | 'FAIL';
}

interface DryRunResult {
  mode: 'DRY_RUN';
  records: DryRunRecord[];
  summary: { total: number; pass: number; fail: number };
  duration_ms: number;
}

/**
 * Run CID→SID→MID pipeline in DRY_RUN mode.
 * Reads current CID and SID rows, assembles what the MID handoff payload
 * would look like, and checks field completeness against the Lovable contract.
 * No delivery occurs.
 */
export async function runCidSidMidDryRun(
  batchSize: number = 50
): Promise<DryRunResult> {
  const start = Date.now();
  const records: DryRunRecord[] = [];

  console.log('[CID-SID-MID DRY_RUN] Starting field completeness check...');

  // Fetch recent COMPILED CIDs
  const { data: cidRows } = await lcsClient
    .from('cid')
    .select('*')
    .eq('compilation_status', 'COMPILED')
    .order('created_at', { ascending: false })
    .limit(batchSize);

  if (!cidRows || cidRows.length === 0) {
    console.log('[CID-SID-MID DRY_RUN] No COMPILED CID rows to check.');
    return {
      mode: 'DRY_RUN',
      records: [],
      summary: { total: 0, pass: 0, fail: 0 },
      duration_ms: Date.now() - start,
    };
  }

  for (const rawCid of cidRows) {
    const cid = rawCid as Record<string, unknown>;
    const commId = cid.communication_id as string;

    // Check CID-level fields
    const cidFields = checkFields({
      communication_id: cid.communication_id,
      frame_id: cid.frame_id,
      lifecycle_phase: cid.lifecycle_phase,
      sovereign_company_id: cid.sovereign_company_id,
      agent_number: cid.agent_number,
    });
    records.push({
      communication_id: commId,
      phase: 'CID',
      fields: cidFields,
      overall: cidFields.every(f => f.status === 'PASS') ? 'PASS' : 'FAIL',
    });

    // Look up matching SID row
    const { data: sidData } = await lcsClient
      .from('sid_output')
      .select('*')
      .eq('communication_id', commId)
      .eq('construction_status', 'CONSTRUCTED')
      .limit(1)
      .single();

    if (!sidData) {
      records.push({
        communication_id: commId,
        phase: 'SID',
        fields: [{ field: 'sid_row', status: 'FAIL', value_present: false }],
        overall: 'FAIL',
      });
      continue;
    }

    const sid = sidData as Record<string, unknown>;

    // Check SID-level fields
    const sidFields = checkFields({
      recipient_email: sid.recipient_email,
      subject_line: sid.subject_line,
      body_plain: sid.body_plain,
      body_html: sid.body_html,
      sender_identity: sid.sender_identity,
    });
    records.push({
      communication_id: commId,
      phase: 'SID',
      fields: sidFields,
      overall: sidFields.every(f => f.status === 'PASS') ? 'PASS' : 'FAIL',
    });

    // Check full MID handoff completeness
    const handoffFields: FieldCheck[] = LOVABLE_CONTRACT_FIELDS.map(field => {
      const value = resolveHandoffField(field, cid, sid);
      return {
        field,
        status: value !== null && value !== undefined ? 'PASS' as const : 'FAIL' as const,
        value_present: value !== null && value !== undefined,
      };
    });
    records.push({
      communication_id: commId,
      phase: 'MID_HANDOFF',
      fields: handoffFields,
      overall: handoffFields.every(f => f.status === 'PASS') ? 'PASS' : 'FAIL',
    });
  }

  const midHandoffs = records.filter(r => r.phase === 'MID_HANDOFF');
  const summary = {
    total: midHandoffs.length,
    pass: midHandoffs.filter(r => r.overall === 'PASS').length,
    fail: midHandoffs.filter(r => r.overall === 'FAIL').length,
  };

  const duration = Date.now() - start;

  console.log(
    `[CID-SID-MID DRY_RUN] Complete in ${duration}ms: ` +
    `${summary.pass} PASS, ${summary.fail} FAIL out of ${summary.total} handoffs`
  );

  for (const rec of records) {
    const failedFields = rec.fields.filter(f => f.status === 'FAIL').map(f => f.field);
    if (failedFields.length > 0) {
      console.log(
        `  [${rec.overall}] ${rec.communication_id} (${rec.phase}): ` +
        `missing: ${failedFields.join(', ')}`
      );
    } else {
      console.log(`  [${rec.overall}] ${rec.communication_id} (${rec.phase}): all fields present`);
    }
  }

  return { mode: 'DRY_RUN', records, summary, duration_ms: duration };
}

function checkFields(obj: Record<string, unknown>): FieldCheck[] {
  return Object.entries(obj).map(([field, value]) => ({
    field,
    status: value !== null && value !== undefined ? 'PASS' as const : 'FAIL' as const,
    value_present: value !== null && value !== undefined,
  }));
}

function resolveHandoffField(
  field: string,
  cid: Record<string, unknown>,
  sid: Record<string, unknown>
): unknown {
  switch (field) {
    case 'communication_id':       return cid.communication_id;
    case 'message_run_id':         return 'DRY_RUN_PLACEHOLDER';
    case 'channel':                return 'MG'; // default channel
    case 'recipient_email':        return sid.recipient_email;
    case 'recipient_linkedin_url': return sid.recipient_linkedin_url ?? null;
    case 'subject_line':           return sid.subject_line;
    case 'body_plain':             return sid.body_plain;
    case 'body_html':              return sid.body_html;
    case 'sender_identity':        return sid.sender_identity;
    case 'frame_id':               return cid.frame_id;
    case 'lifecycle_phase':        return cid.lifecycle_phase;
    case 'sovereign_company_id':   return cid.sovereign_company_id;
    case 'company_name':           return cid.company_name ?? null;
    case 'agent_number':           return cid.agent_number;
    case 'metadata':               return { frame_id: sid.frame_id };
    default:                       return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// Standard Pipeline Execution
// ═══════════════════════════════════════════════════════════════

/**
 * Run the full CID→SID→MID pipeline cron cycle.
 *
 * @param batchSize - Max items per phase
 * @param defaultChannel - Default delivery channel
 */
export async function runCidSidMidCron(
  batchSize: number = 50,
  defaultChannel: Channel = 'MG'
): Promise<PipelineCronResult> {
  const start = Date.now();

  console.log('[CID-SID-MID Cron] Starting pipeline cycle...');

  // Phase 1: CID Compiler — signal_queue → lcs.cid
  const cidResult = await runCidCompiler(batchSize);

  // Phase 2: SID Worker — lcs.cid (COMPILED) → lcs.sid_output
  const sidResult = await runSidWorker(batchSize);

  // Phase 3: MID Engine — lcs.sid_output (CONSTRUCTED) → lcs.mid_sequence_state + lcs.event
  const midResult = await runMidEngine(batchSize, defaultChannel);

  const duration = Date.now() - start;

  console.log(
    `[CID-SID-MID Cron] Cycle complete in ${duration}ms: ` +
    `CID=${cidResult.compiled}/${cidResult.total}, ` +
    `SID=${sidResult.constructed}/${sidResult.total}, ` +
    `MID=${midResult.delivered}/${midResult.total}`
  );

  return {
    cid: {
      total: cidResult.total,
      compiled: cidResult.compiled,
      failed: cidResult.failed,
      blocked: cidResult.blocked,
    },
    sid: {
      total: sidResult.total,
      constructed: sidResult.constructed,
      failed: sidResult.failed,
      blocked: sidResult.blocked,
    },
    mid: {
      total: midResult.total,
      delivered: midResult.delivered,
      failed: midResult.failed,
      blocked: midResult.blocked,
    },
    duration_ms: duration,
  };
}
