// Audit Runner - Data quality checks

import { getClient } from '../lib/db.js';

export class AuditRunner {
  async run(options) {
    console.log('='.repeat(60));
    console.log('NEON AGENT: DATA AUDIT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');

    const client = await getClient();

    try {
      if (options.schema) {
        await this.auditSchema(client, options.schema);
      } else if (options.countsOnly) {
        await this.auditCounts(client);
      } else {
        await this.fullAudit(client);
      }
    } finally {
      await client.end();
    }
  }

  async auditCounts(client) {
    console.log('TABLE COUNTS');
    console.log('-'.repeat(40));

    const tables = [
      { schema: 'cl', table: 'company_identity' },
      { schema: 'cl', table: 'company_identity_bridge' },
      { schema: 'cl', table: 'identity_confidence' },
      { schema: 'cl', table: 'company_candidate' },
      { schema: 'cl', table: 'company_names' },
      { schema: 'cl', table: 'company_domains' },
      { schema: 'cl', table: 'cl_errors' },
      { schema: 'outreach', table: 'company_target' },
      { schema: 'outreach', table: 'people' },
    ];

    for (const t of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as cnt FROM ${t.schema}.${t.table}`);
        console.log(`  ${t.schema}.${t.table}: ${result.rows[0].cnt}`);
      } catch (e) {
        console.log(`  ${t.schema}.${t.table}: (not found)`);
      }
    }
  }

  async auditSchema(client, schemaName) {
    console.log(`SCHEMA AUDIT: ${schemaName}`);
    console.log('-'.repeat(40));

    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `, [schemaName]);

    for (const row of tables.rows) {
      const count = await client.query(`SELECT COUNT(*) as cnt FROM ${schemaName}.${row.table_name}`);
      console.log(`  ${row.table_name}: ${count.rows[0].cnt} records`);
    }
  }

  async fullAudit(client) {
    console.log('FULL DATA AUDIT');
    console.log('='.repeat(60));

    // 1. Table counts
    console.log('\n1. TABLE COUNTS');
    console.log('-'.repeat(40));
    await this.auditCounts(client);

    // 2. Identity status breakdown
    console.log('\n2. IDENTITY STATUS');
    console.log('-'.repeat(40));
    const status = await client.query(`
      SELECT identity_status, COUNT(*) as cnt
      FROM cl.company_identity
      GROUP BY identity_status
      ORDER BY cnt DESC
    `);
    status.rows.forEach(r => {
      console.log(`  ${r.identity_status || 'NULL'}: ${r.cnt}`);
    });

    // 3. Gate summary
    console.log('\n3. GATE SUMMARY');
    console.log('-'.repeat(40));
    try {
      const gate = await client.query('SELECT * FROM cl.v_identity_gate_summary');
      const g = gate.rows[0];
      console.log(`  Total: ${g.total_companies}`);
      console.log(`  Pass: ${g.pass_count} (${g.pass_pct}%)`);
      console.log(`  Pending: ${g.pending_count}`);
      console.log(`  Fail: ${g.fail_count}`);
    } catch (e) {
      console.log('  (gate summary view not available)');
    }

    // 4. Error breakdown
    console.log('\n4. ERROR BREAKDOWN');
    console.log('-'.repeat(40));
    try {
      const errors = await client.query(`
        SELECT pass_name, COUNT(*) as cnt
        FROM cl.cl_errors
        GROUP BY pass_name
        ORDER BY cnt DESC
      `);
      errors.rows.forEach(r => {
        console.log(`  ${r.pass_name}: ${r.cnt}`);
      });
    } catch (e) {
      console.log('  (no errors table)');
    }

    // 5. Orphan check
    console.log('\n5. ORPHAN CHECK');
    console.log('-'.repeat(40));
    const orphans = await client.query(`
      SELECT COUNT(*) as cnt
      FROM cl.company_identity ci
      LEFT JOIN cl.company_identity_bridge cib ON ci.company_unique_id = cib.company_sov_id
      WHERE cib.company_sov_id IS NULL
    `);
    console.log(`  Orphan identities (not in bridge): ${orphans.rows[0].cnt}`);

    console.log('\n' + '='.repeat(60));
    console.log('AUDIT COMPLETE');
    console.log('='.repeat(60));
  }
}
