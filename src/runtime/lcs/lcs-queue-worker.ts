/**
 * LCS Queue Worker — Phase 1
 *
 * Minimal cron-style worker that drains cl.lcs_signal_queue
 * by calling cl.lcs_attempt_send() for each QUEUED signal.
 *
 * Run: npx tsx src/runtime/lcs/lcs-queue-worker.ts
 * Env: DATABASE_URL or VITE_DATABASE_URL
 *
 * Not long-running — processes one batch, prints summary, exits.
 * Designed for cron invocation.
 */

import pg from 'pg';
const { Pool } = pg;

type PgPool = InstanceType<typeof Pool>;

interface AttemptResult {
  decision: string;
  ledger_id: string | null;
  message_id: string | null;
  reason: string;
}

interface WorkerSummary {
  total: number;
  approved: number;
  blocked: number;
  errored: number;
}

const BATCH_SIZE = parseInt(process.env.LCS_BATCH_SIZE || '10', 10);

function getConnectionString(): string {
  const url = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL or VITE_DATABASE_URL must be set');
  }
  return url;
}

async function main(): Promise<void> {
  const pool: PgPool = new Pool({
    connectionString: getConnectionString(),
    ssl: { rejectUnauthorized: false },
  });

  const summary: WorkerSummary = { total: 0, approved: 0, blocked: 0, errored: 0 };

  try {
    // Select N oldest QUEUED signals
    const { rows: signals } = await pool.query(
      `SELECT signal_id FROM cl.lcs_signal_queue
        WHERE status = 'QUEUED'
        ORDER BY created_at ASC
        LIMIT $1`,
      [BATCH_SIZE]
    );

    summary.total = signals.length;
    console.log(`[LCS Worker] Found ${signals.length} QUEUED signals (batch=${BATCH_SIZE})`);

    for (const signal of signals) {
      const signalId = signal.signal_id as string;

      try {
        const { rows } = await pool.query(
          `SELECT cl.lcs_attempt_send($1) AS result`,
          [signalId]
        );

        const result = rows[0].result as AttemptResult;
        const decision = result.decision;

        if (decision === 'APPROVED') {
          summary.approved++;
          console.log(`[LCS Worker] APPROVED signal=${signalId} ledger=${result.ledger_id} msg=${result.message_id}`);
        } else if (decision === 'BLOCKED') {
          summary.blocked++;
          console.log(`[LCS Worker] BLOCKED  signal=${signalId} reason=${result.reason}`);
        } else {
          summary.errored++;
          console.log(`[LCS Worker] ERROR    signal=${signalId} reason=${result.reason}`);
        }
      } catch (err: unknown) {
        summary.errored++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[LCS Worker] EXCEPTION signal=${signalId}: ${message}`);

        // Write to lcs_errors + mark signal ERROR
        try {
          await pool.query(
            `INSERT INTO cl.lcs_errors (sovereign_company_id, source_signal_id, error_code, error_detail)
             SELECT sovereign_company_id, signal_id, 'WORKER_EXCEPTION', $2::jsonb
               FROM cl.lcs_signal_queue WHERE signal_id = $1`,
            [signalId, JSON.stringify({ error: message })]
          );
          await pool.query(
            `UPDATE cl.lcs_signal_queue SET status = 'ERROR', processed_at = NOW() WHERE signal_id = $1`,
            [signalId]
          );
        } catch (innerErr: unknown) {
          const innerMsg = innerErr instanceof Error ? innerErr.message : String(innerErr);
          console.error(`[LCS Worker] Failed to write error row for signal=${signalId}: ${innerMsg}`);
        }
      }
    }

    console.log(`[LCS Worker] Done. total=${summary.total} approved=${summary.approved} blocked=${summary.blocked} errored=${summary.errored}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[LCS Worker] Fatal:', err);
  process.exit(1);
});
