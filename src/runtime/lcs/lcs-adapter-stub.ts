/**
 * LCS Adapter Stub — Phase 3
 *
 * Simulates delivery execution without sending anything.
 * Selects APPROVED ledger rows whose scheduled_for has passed,
 * marks them SENT, and logs each transition.
 *
 * Run: npx tsx src/runtime/lcs/lcs-adapter-stub.ts
 * Env: DATABASE_URL or VITE_DATABASE_URL
 *
 * Not long-running — processes one batch, prints summary, exits.
 * Designed for cron invocation.
 */

import pg from 'pg';
const { Pool } = pg;

type PgPool = InstanceType<typeof Pool>;

interface LedgerRow {
  ledger_id: string;
  sovereign_company_id: string;
  communication_id: string;
  message_id: string;
  step_number: number | null;
  cadence_instance_id: string | null;
}

const BATCH_SIZE = parseInt(process.env.LCS_ADAPTER_BATCH_SIZE || '20', 10);

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

  let sent = 0;
  let errored = 0;

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Select APPROVED rows due for execution, locking to prevent double-send
      const { rows } = await client.query(
        `SELECT ledger_id, sovereign_company_id, communication_id,
                message_id, step_number, cadence_instance_id
           FROM cl.lcs_communication_ledger
          WHERE status = 'APPROVED'
            AND scheduled_for <= NOW()
          ORDER BY scheduled_for
          LIMIT $1
            FOR UPDATE SKIP LOCKED`,
        [BATCH_SIZE]
      );

      console.log(`[LCS Adapter Stub] Found ${rows.length} rows ready for execution (batch=${BATCH_SIZE})`);

      for (const row of rows as LedgerRow[]) {
        try {
          await client.query(
            `UPDATE cl.lcs_communication_ledger
                SET status = 'SENT',
                    execution_attempts = execution_attempts + 1,
                    last_attempt_at = NOW(),
                    sent_at = NOW()
              WHERE ledger_id = $1`,
            [row.ledger_id]
          );

          sent++;
          console.log(
            `[LCS Adapter Stub] SENT ledger=${row.ledger_id}`
            + ` company=${row.sovereign_company_id}`
            + ` comm=${row.communication_id}`
            + ` msg=${row.message_id}`
            + (row.step_number ? ` step=${row.step_number}` : '')
          );
        } catch (err: unknown) {
          errored++;
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[LCS Adapter Stub] FAILED ledger=${row.ledger_id}: ${message}`);
        }
      }

      await client.query('COMMIT');
    } catch (txErr: unknown) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    console.log(`[LCS Adapter Stub] Done. sent=${sent} errored=${errored}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[LCS Adapter Stub] Fatal:', err);
  process.exit(1);
});
