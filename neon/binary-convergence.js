// ============================================================================
// BINARY CONVERGENCE: Drain cl.cl_errors to ZERO
// ============================================================================
// Doctrine: Errors are a work queue, not storage.
//           Every row → PASS or FAIL → Archive.
//           No third state survives past TTL.
// ============================================================================
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function binaryConvergence() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('='.repeat(70));
    console.log('BINARY CONVERGENCE: DRAIN cl.cl_errors TO ZERO');
    console.log('='.repeat(70));
    console.log('Doctrine: Every row → PASS or FAIL → Archive\n');

    // Add final_outcome columns if needed
    await client.query(`ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS final_outcome TEXT`);
    await client.query(`ALTER TABLE cl.cl_errors ADD COLUMN IF NOT EXISTS final_reason TEXT`);
    await client.query(`ALTER TABLE cl.cl_errors_archive ADD COLUMN IF NOT EXISTS final_outcome TEXT`);
    await client.query(`ALTER TABLE cl.cl_errors_archive ADD COLUMN IF NOT EXISTS final_reason TEXT`);

    // Before count
    const before = await client.query('SELECT COUNT(*) as cnt FROM cl.cl_errors');
    console.log('[BEFORE] Active errors:', before.rows[0].cnt);

    // =========================================================================
    // 1) DOMAIN_FAIL - Categorize by verification result
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('1) DOMAIN_FAIL → Binary outcome by category');
    console.log('-'.repeat(60));

    // DOMAIN_DEAD → FAIL
    const domainDead = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'DOMAIN_DEAD',
          resolved_at = NOW()
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'error_category' = 'DOMAIN_DEAD'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  DOMAIN_DEAD → FAIL:', domainDead.rowCount);

    // DOMAIN_TRANSIENT → FAIL (exhausted)
    const domainTransient = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'DOMAIN_TRANSIENT_EXHAUSTED',
          resolved_at = NOW()
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'error_category' = 'DOMAIN_TRANSIENT'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  DOMAIN_TRANSIENT → FAIL:', domainTransient.rowCount);

    // DOMAIN_SSL_ISSUE → FAIL
    const domainSSL = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'DOMAIN_SSL_NEEDS_ESCALATION',
          resolved_at = NOW()
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'error_category' = 'DOMAIN_SSL_ISSUE'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  DOMAIN_SSL_ISSUE → FAIL:', domainSSL.rowCount);

    // DOMAIN_RATE_LIMITED → FAIL
    const domainRate = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'DOMAIN_RATE_LIMITED_NEEDS_ESCALATION',
          resolved_at = NOW()
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND inputs_snapshot->>'error_category' = 'DOMAIN_RATE_LIMITED'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  DOMAIN_RATE_LIMITED → FAIL:', domainRate.rowCount);

    // Remaining DOMAIN_FAIL → FAIL
    const domainOther = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'DOMAIN_VERIFICATION_FAILED',
          resolved_at = NOW()
      WHERE failure_reason_code = 'DOMAIN_FAIL'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  Other DOMAIN_FAIL → FAIL:', domainOther.rowCount);

    // =========================================================================
    // 2) COLLISION_AMBIGUOUS → FAIL
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('2) COLLISION_AMBIGUOUS → FAIL (manual review needed)');
    console.log('-'.repeat(60));

    const collisionAmbiguous = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'AMBIGUOUS_PARENT_NEEDS_REVIEW',
          resolved_at = NOW()
      WHERE failure_reason_code = 'COLLISION_AMBIGUOUS'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  COLLISION_AMBIGUOUS → FAIL:', collisionAmbiguous.rowCount);

    // =========================================================================
    // 3) NAME_EMPTY → FAIL
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('3) NAME_EMPTY → FAIL (data quality)');
    console.log('-'.repeat(60));

    const nameEmpty = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'DATA_QUALITY_NAME_MISSING',
          resolved_at = NOW()
      WHERE failure_reason_code = 'NAME_EMPTY'
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  NAME_EMPTY → FAIL:', nameEmpty.rowCount);

    // =========================================================================
    // 4) COLLISION_NAME & COLLISION_LINKEDIN → FAIL
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('4) COLLISION_NAME/LINKEDIN → FAIL (identity conflict)');
    console.log('-'.repeat(60));

    const collisionIdentity = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'FAIL',
          final_reason = 'IDENTITY_CONFLICT',
          resolved_at = NOW()
      WHERE failure_reason_code IN ('COLLISION_NAME', 'COLLISION_LINKEDIN')
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  COLLISION_NAME/LINKEDIN → FAIL:', collisionIdentity.rowCount);

    // =========================================================================
    // 5) STATE_NOT_NC & MISSING_LINKEDIN → PASS (expected filter)
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('5) STATE_NOT_NC & MISSING_LINKEDIN → PASS (expected filter)');
    console.log('-'.repeat(60));

    const expectedFilter = await client.query(`
      UPDATE cl.cl_errors
      SET final_outcome = 'PASS',
          final_reason = 'EXPECTED_FILTER',
          resolved_at = NOW()
      WHERE failure_reason_code IN ('STATE_NOT_NC', 'MISSING_LINKEDIN')
        AND resolved_at IS NULL
      RETURNING error_id
    `);
    console.log('  STATE_NOT_NC/MISSING_LINKEDIN → PASS:', expectedFilter.rowCount);

    // =========================================================================
    // ARCHIVE ALL RESOLVED ERRORS
    // =========================================================================
    console.log('\n' + '-'.repeat(60));
    console.log('6) ARCHIVE: Move all resolved to archive');
    console.log('-'.repeat(60));

    // Archive resolved errors
    const archived = await client.query(`
      WITH moved AS (
        INSERT INTO cl.cl_errors_archive (
          error_id, company_unique_id, lifecycle_run_id, pass_name,
          failure_reason_code, inputs_snapshot, created_at, resolved_at,
          retry_count, retry_ceiling, retry_after, tool_used, tool_tier, expires_at,
          final_outcome, final_reason, archived_at, archive_reason
        )
        SELECT
          error_id, company_unique_id, lifecycle_run_id, pass_name,
          failure_reason_code, inputs_snapshot, created_at, resolved_at,
          retry_count, retry_ceiling, retry_after, tool_used, tool_tier, expires_at,
          final_outcome, final_reason, NOW(), 'BINARY_CONVERGENCE'
        FROM cl.cl_errors
        WHERE resolved_at IS NOT NULL
        RETURNING error_id
      )
      SELECT COUNT(*) as cnt FROM moved
    `);
    console.log('  Archived:', archived.rows[0].cnt);

    const deleted = await client.query(`
      DELETE FROM cl.cl_errors
      WHERE resolved_at IS NOT NULL
      RETURNING error_id
    `);
    console.log('  Removed from active:', deleted.rowCount);

    // =========================================================================
    // ASSERT ZERO
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('ASSERTION: cl.cl_errors MUST BE ZERO');
    console.log('='.repeat(70));

    const after = await client.query('SELECT COUNT(*) as cnt FROM cl.cl_errors');
    const activeCount = parseInt(after.rows[0].cnt);

    if (activeCount === 0) {
      console.log('\n✓ SUCCESS: cl.cl_errors = 0 rows');
      console.log('  Error table is now a WORK QUEUE, not storage.');
    } else {
      console.log('\n⚠ WARNING: cl.cl_errors still has', activeCount, 'rows');
      const remaining = await client.query(`
        SELECT failure_reason_code, COUNT(*) as cnt
        FROM cl.cl_errors
        GROUP BY failure_reason_code
      `);
      console.log('  Remaining:');
      console.table(remaining.rows);
    }

    // Archive stats
    const archiveStats = await client.query(`
      SELECT final_outcome, final_reason, COUNT(*) as cnt
      FROM cl.cl_errors_archive
      WHERE final_outcome IS NOT NULL
      GROUP BY final_outcome, final_reason
      ORDER BY cnt DESC
    `);
    console.log('\n[ARCHIVE] Binary outcomes:');
    console.table(archiveStats.rows);

    const totalArchive = await client.query('SELECT COUNT(*) as cnt FROM cl.cl_errors_archive');
    console.log('Total in archive:', totalArchive.rows[0].cnt);

    console.log('\n' + '='.repeat(70));
    console.log('BINARY CONVERGENCE COMPLETE');
    console.log('='.repeat(70));

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

binaryConvergence();
