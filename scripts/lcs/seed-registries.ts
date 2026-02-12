/**
 * LCS Registry Seed Runner
 *
 * Usage: npx ts-node scripts/lcs/seed-registries.ts
 *
 * Reads and executes 002_lcs_seed_registries.sql against Neon.
 * Requires NEON_CONNECTION_STRING or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Authority: HUB-CL-001, SUBHUB-CL-LCS
 * Version: 2.2.0
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATION_FILE = resolve(
  __dirname,
  '../../migrations/lcs/002_lcs_seed_registries.sql'
);

async function main(): Promise<void> {
  const connectionString = process.env.NEON_CONNECTION_STRING;
  if (!connectionString) {
    console.error('ERROR: NEON_CONNECTION_STRING environment variable is required.');
    console.error('Set it via Doppler or export directly.');
    process.exit(1);
  }

  const sql = readFileSync(MIGRATION_FILE, 'utf-8');
  console.log(`Read ${sql.length} bytes from ${MIGRATION_FILE}`);

  // Dynamic import to avoid bundling pg in non-script contexts
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Neon.');

    const result = await client.query(sql);
    console.log('Seed migration executed successfully.');
    console.log(`Result: ${Array.isArray(result) ? result.length + ' statements' : 'OK'}`);
  } catch (err) {
    console.error('Seed migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

main();
