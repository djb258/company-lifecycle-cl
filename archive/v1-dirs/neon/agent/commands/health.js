// Health Checker - System health checks

import { getClient } from '../db.js';

export class HealthChecker {
  async run(options) {
    console.log('='.repeat(60));
    console.log('NEON AGENT: HEALTH CHECK');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');

    const results = {
      connection: null,
      schemas: null,
      gates: null,
    };

    const client = await getClient();

    try {
      // Connection check
      if (options.connection || !Object.values(options).some(v => v)) {
        results.connection = await this.checkConnection(client);
      }

      // Schema integrity
      if (options.schemas || !Object.values(options).some(v => v)) {
        results.schemas = await this.checkSchemas(client);
      }

      // Gate constraints
      if (options.gates || !Object.values(options).some(v => v)) {
        results.gates = await this.checkGates(client);
      }

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('HEALTH SUMMARY');
      console.log('='.repeat(60));

      const allPassed = Object.values(results).every(r => r === true || r === null);
      if (allPassed) {
        console.log('  Status: HEALTHY');
      } else {
        console.log('  Status: DEGRADED');
        Object.entries(results).forEach(([key, value]) => {
          if (value === false) {
            console.log(`  - ${key}: FAILED`);
          }
        });
      }

    } finally {
      await client.end();
    }
  }

  async checkConnection(client) {
    console.log('1. CONNECTION CHECK');
    console.log('-'.repeat(40));

    try {
      const result = await client.query('SELECT NOW() as time, current_database() as db');
      console.log(`  Database: ${result.rows[0].db}`);
      console.log(`  Server time: ${result.rows[0].time}`);
      console.log('  ✓ Connection OK');
      return true;
    } catch (error) {
      console.log(`  ✗ Connection FAILED: ${error.message}`);
      return false;
    }
  }

  async checkSchemas(client) {
    console.log('\n2. SCHEMA INTEGRITY');
    console.log('-'.repeat(40));

    const requiredTables = [
      { schema: 'cl', table: 'company_identity', required: true },
      { schema: 'cl', table: 'company_identity_bridge', required: true },
      { schema: 'cl', table: 'identity_confidence', required: true },
      { schema: 'cl', table: 'cl_errors', required: true },
      { schema: 'cl', table: 'company_candidate', required: false },
    ];

    let allPresent = true;

    for (const t of requiredTables) {
      const exists = await client.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = $1 AND table_name = $2
      `, [t.schema, t.table]);

      if (exists.rows.length > 0) {
        console.log(`  ✓ ${t.schema}.${t.table}`);
      } else if (t.required) {
        console.log(`  ✗ ${t.schema}.${t.table} MISSING (required)`);
        allPresent = false;
      } else {
        console.log(`  - ${t.schema}.${t.table} (optional, not present)`);
      }
    }

    // Check views
    const views = ['v_company_identity_eligible', 'v_identity_gate_summary'];
    for (const view of views) {
      const exists = await client.query(`
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'cl' AND table_name = $1
      `, [view]);

      if (exists.rows.length > 0) {
        console.log(`  ✓ cl.${view} (view)`);
      } else {
        console.log(`  ✗ cl.${view} MISSING (view)`);
        allPresent = false;
      }
    }

    return allPresent;
  }

  async checkGates(client) {
    console.log('\n3. GATE CONSTRAINTS');
    console.log('-'.repeat(40));

    // Check identity_status constraint
    const statusConstraint = await client.query(`
      SELECT 1 FROM pg_constraint
      WHERE conname = 'cl_identity_status_check'
    `);

    if (statusConstraint.rows.length > 0) {
      console.log('  ✓ identity_status constraint exists');
    } else {
      console.log('  ✗ identity_status constraint MISSING');
      return false;
    }

    // Check for any PENDING records (should be 0 after migration)
    const pending = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.company_identity
      WHERE identity_status = 'PENDING'
    `);

    if (parseInt(pending.rows[0].cnt) === 0) {
      console.log('  ✓ No PENDING records (all synced)');
    } else {
      console.log(`  ! ${pending.rows[0].cnt} PENDING records (may need sync)`);
    }

    // Check gate consistency
    const inconsistent = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.company_identity
      WHERE (existence_verified = TRUE AND identity_status != 'PASS')
         OR (existence_verified = FALSE AND identity_status != 'FAIL')
    `);

    if (parseInt(inconsistent.rows[0].cnt) === 0) {
      console.log('  ✓ Status consistent with verification');
    } else {
      console.log(`  ! ${inconsistent.rows[0].cnt} records with status/verification mismatch`);
    }

    return true;
  }
}
