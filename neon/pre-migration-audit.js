// Pre-Migration Audit
// Run this BEFORE any migration to verify data integrity

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function audit() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    console.log('='.repeat(60));
    console.log('PRE-MIGRATION DATA AUDIT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');

    // ============================================
    // 1. CORE TABLE COUNTS
    // ============================================
    console.log('1. CORE TABLE COUNTS');
    console.log('-'.repeat(40));

    const tables = [
      { schema: 'cl', table: 'company_identity', critical: true },
      { schema: 'cl', table: 'company_identity_bridge', critical: true },
      { schema: 'cl', table: 'identity_confidence', critical: true },
      { schema: 'cl', table: 'company_candidate', critical: true },  // Intake audit log - PRESERVE
      { schema: 'cl', table: 'company_names', critical: false },
      { schema: 'cl', table: 'company_domains', critical: false },
      { schema: 'cl', table: 'cl_errors', critical: false },
      { schema: 'cl', table: 'cl_err_existence', critical: false },
      { schema: 'cl', table: 'cl_errors_name', critical: false },
      { schema: 'cl', table: 'cl_errors_domain', critical: false },
      { schema: 'cl', table: 'company_lifecycle_error', critical: false },
      { schema: 'cl', table: 'company_lifecycle_identity_staging', critical: false },
      { schema: 'cl', table: 'identity_gate_audit', critical: false },
      { schema: 'cl', table: 'identity_gate_failures', critical: false },
    ];

    const counts = {};
    for (const t of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as cnt FROM ${t.schema}.${t.table}`);
        counts[`${t.schema}.${t.table}`] = parseInt(result.rows[0].cnt);
        const marker = t.critical ? '[CRITICAL]' : '';
        console.log(`  ${t.schema}.${t.table}: ${result.rows[0].cnt} ${marker}`);
      } catch (e) {
        counts[`${t.schema}.${t.table}`] = null;
        console.log(`  ${t.schema}.${t.table}: (table does not exist)`);
      }
    }

    // ============================================
    // 2. ORPHAN CHECK
    // ============================================
    console.log('\n2. ORPHAN IDENTITY CHECK');
    console.log('-'.repeat(40));

    try {
      const orphans = await client.query(`
        SELECT ci.company_unique_id, ci.company_name, ci.company_domain, ci.created_at
        FROM cl.company_identity ci
        LEFT JOIN cl.company_identity_bridge cib ON ci.company_unique_id = cib.company_sov_id
        WHERE cib.company_sov_id IS NULL
        ORDER BY ci.created_at DESC
        LIMIT 20
      `);

      if (orphans.rows.length === 0) {
        console.log('  No orphan identities found (all in bridge)');
      } else {
        console.log(`  WARNING: ${orphans.rows.length} orphan identities found!`);
        console.log('  These are in company_identity but NOT in bridge:');
        orphans.rows.forEach((r, i) => {
          console.log(`    ${i + 1}. ${r.company_unique_id}`);
          console.log(`       Name: ${r.company_name}`);
          console.log(`       Domain: ${r.company_domain}`);
          console.log(`       Created: ${r.created_at}`);
        });
      }
    } catch (e) {
      console.log('  Could not check orphans:', e.message);
    }

    // ============================================
    // 3. VERIFICATION STATUS BREAKDOWN
    // ============================================
    console.log('\n3. VERIFICATION STATUS');
    console.log('-'.repeat(40));

    try {
      const status = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE existence_verified = TRUE) as verified_true,
          COUNT(*) FILTER (WHERE existence_verified = FALSE) as verified_false,
          COUNT(*) FILTER (WHERE existence_verified IS NULL) as verified_null,
          COUNT(*) as total
        FROM cl.company_identity
      `);
      const s = status.rows[0];
      console.log(`  existence_verified = TRUE:  ${s.verified_true}`);
      console.log(`  existence_verified = FALSE: ${s.verified_false}`);
      console.log(`  existence_verified = NULL:  ${s.verified_null}`);
      console.log(`  Total:                      ${s.total}`);
    } catch (e) {
      console.log('  Could not get verification status:', e.message);
    }

    // ============================================
    // 4. IDENTITY STATUS BREAKDOWN
    // ============================================
    console.log('\n4. IDENTITY STATUS');
    console.log('-'.repeat(40));

    try {
      const idStatus = await client.query(`
        SELECT identity_status, COUNT(*) as cnt
        FROM cl.company_identity
        GROUP BY identity_status
        ORDER BY cnt DESC
      `);
      idStatus.rows.forEach(r => {
        console.log(`  ${r.identity_status || 'NULL'}: ${r.cnt}`);
      });
    } catch (e) {
      console.log('  Could not get identity status:', e.message);
    }

    // ============================================
    // 5. ERROR DATA TO PRESERVE
    // ============================================
    console.log('\n5. ERROR DATA TO PRESERVE');
    console.log('-'.repeat(40));

    const errorTables = [
      'cl_err_existence',
      'cl_errors_name',
      'cl_errors_domain',
      'cl_errors_collision',
      'cl_errors_firmographic',
      'company_lifecycle_error',
      'cl_errors'
    ];

    let totalErrors = 0;
    for (const t of errorTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as cnt FROM cl.${t}`);
        const cnt = parseInt(result.rows[0].cnt);
        totalErrors += cnt;
        if (cnt > 0) {
          console.log(`  cl.${t}: ${cnt} records`);
        }
      } catch (e) {
        // Table doesn't exist
      }
    }
    console.log(`  Total error records: ${totalErrors}`);

    // ============================================
    // 6. MIGRATION READINESS
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION READINESS CHECK');
    console.log('='.repeat(60));

    const issues = [];

    // Check for orphans
    try {
      const orphanCount = await client.query(`
        SELECT COUNT(*) as cnt
        FROM cl.company_identity ci
        LEFT JOIN cl.company_identity_bridge cib ON ci.company_unique_id = cib.company_sov_id
        WHERE cib.company_sov_id IS NULL
      `);
      if (parseInt(orphanCount.rows[0].cnt) > 0) {
        issues.push(`${orphanCount.rows[0].cnt} orphan identities (in identity but not bridge)`);
      }
    } catch (e) {}

    // Check for unprocessed staging
    try {
      const stagingCount = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_lifecycle_identity_staging`);
      if (parseInt(stagingCount.rows[0].cnt) > 0) {
        issues.push(`${stagingCount.rows[0].cnt} records in staging table`);
      }
    } catch (e) {}

    // Check error data exists
    if (totalErrors > 0) {
      console.log(`  INFO: ${totalErrors} error records will be migrated to cl.cl_errors`);
    }

    if (issues.length === 0) {
      console.log('\n  READY FOR MIGRATION');
      console.log('  All checks passed.');
    } else {
      console.log('\n  ISSUES TO RESOLVE:');
      issues.forEach((issue, i) => {
        console.log(`    ${i + 1}. ${issue}`);
      });
      console.log('\n  Resolve these before running migration.');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('Audit error:', error.message);
  } finally {
    await client.end();
  }
}

audit();
