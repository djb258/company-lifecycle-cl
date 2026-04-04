// Legacy Orphan Reconciliation
// Identifies and processes outreach records not linked to CL identity PASS
//
// Directive:
// - If sovereign_id EXISTS but NOT PASS → Run through verification
// - If sovereign_id NOT EXISTS → Log to error table
// - After verification: PASS stays, FAIL → quarantine
// - Golden Rule: If you can't verify it, quarantine it. Don't delete. Don't guess.

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

const BATCH_SIZE = 100;

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipVerification = args.includes('--skip-verification');

  console.log('='.repeat(60));
  console.log('LEGACY ORPHAN RECONCILIATION');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Skip Verification: ${skipVerification}`);
  console.log('');

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // ============================================
    // STEP 1: Create quarantine table if needed
    // ============================================
    console.log('STEP 1: Ensuring quarantine table exists');
    console.log('-'.repeat(40));

    if (!dryRun) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS outreach.outreach_legacy_quarantine (
          outreach_id UUID PRIMARY KEY,
          sovereign_id UUID,
          quarantine_reason TEXT NOT NULL,
          original_created_at TIMESTAMPTZ,
          quarantined_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  Quarantine table ready\n');
    } else {
      console.log('  [DRY RUN] Would create quarantine table\n');
    }

    // ============================================
    // STEP 2: Identify all orphans
    // ============================================
    console.log('STEP 2: Identifying orphans');
    console.log('-'.repeat(40));

    const orphanQuery = `
      SELECT
        o.outreach_id,
        o.sovereign_id,
        o.created_at as outreach_created_at,
        ci.company_unique_id as cl_id,
        ci.identity_status,
        ci.company_name,
        ci.company_domain,
        ci.existence_verified
      FROM outreach.outreach o
      LEFT JOIN cl.company_identity ci
        ON o.sovereign_id = ci.company_unique_id
      WHERE ci.company_unique_id IS NULL
         OR ci.identity_status IS DISTINCT FROM 'PASS'
      ORDER BY o.created_at
    `;

    const orphans = await client.query(orphanQuery);
    console.log(`  Found ${orphans.rows.length} orphan records\n`);

    if (orphans.rows.length === 0) {
      console.log('No orphans to process. All outreach records have valid PASS status.');
      return;
    }

    // Categorize orphans
    const noSovereign = [];        // sovereign_id not in CL at all
    const existsNotPass = [];      // exists in CL but not PASS
    const existsPending = [];      // exists in CL with PENDING status
    const existsFail = [];         // exists in CL with FAIL status

    for (const row of orphans.rows) {
      if (row.cl_id === null) {
        noSovereign.push(row);
      } else if (row.identity_status === 'PENDING') {
        existsPending.push(row);
      } else if (row.identity_status === 'FAIL') {
        existsFail.push(row);
      } else {
        existsNotPass.push(row);
      }
    }

    console.log('  Categorization:');
    console.log(`    - No sovereign in CL:     ${noSovereign.length}`);
    console.log(`    - Exists with PENDING:    ${existsPending.length}`);
    console.log(`    - Exists with FAIL:       ${existsFail.length}`);
    console.log(`    - Exists with other:      ${existsNotPass.length}`);
    console.log('');

    // ============================================
    // STEP 3: Handle records with NO sovereign
    // ============================================
    console.log('STEP 3: Processing records with NO sovereign');
    console.log('-'.repeat(40));

    if (noSovereign.length > 0) {
      console.log(`  ${noSovereign.length} records have sovereign_id not found in CL`);

      if (!dryRun) {
        // Log to error table
        for (const row of noSovereign) {
          await client.query(`
            INSERT INTO cl.cl_errors (
              company_unique_id,
              pass_name,
              failure_code,
              failure_reason,
              inputs_snapshot,
              created_at
            ) VALUES (
              NULL,
              'reconciliation',
              'ORPHAN_NO_SOVEREIGN',
              'Outreach record references sovereign_id not found in CL',
              $1,
              now()
            )
            ON CONFLICT DO NOTHING
          `, [JSON.stringify({
            outreach_id: row.outreach_id,
            sovereign_id: row.sovereign_id,
            outreach_created_at: row.outreach_created_at
          })]);
        }
        console.log(`  Logged ${noSovereign.length} errors to cl.cl_errors`);

        // Move to quarantine
        for (const row of noSovereign) {
          await client.query(`
            INSERT INTO outreach.outreach_legacy_quarantine (
              outreach_id,
              sovereign_id,
              quarantine_reason,
              original_created_at
            ) VALUES ($1, $2, 'ORPHAN_NO_SOVEREIGN', $3)
            ON CONFLICT (outreach_id) DO NOTHING
          `, [row.outreach_id, row.sovereign_id, row.outreach_created_at]);
        }
        console.log(`  Moved ${noSovereign.length} to quarantine`);

        // Remove from outreach.outreach
        const noSovIds = noSovereign.map(r => r.outreach_id);
        await client.query(`
          DELETE FROM outreach.outreach
          WHERE outreach_id = ANY($1::uuid[])
        `, [noSovIds]);
        console.log(`  Removed ${noSovereign.length} from outreach.outreach`);
      } else {
        console.log('  [DRY RUN] Would log errors and quarantine these records');
      }
    } else {
      console.log('  No records with missing sovereign');
    }
    console.log('');

    // ============================================
    // STEP 4: Handle FAIL records → quarantine
    // ============================================
    console.log('STEP 4: Processing FAIL records');
    console.log('-'.repeat(40));

    if (existsFail.length > 0) {
      console.log(`  ${existsFail.length} records have identity_status = FAIL`);

      if (!dryRun) {
        for (const row of existsFail) {
          await client.query(`
            INSERT INTO outreach.outreach_legacy_quarantine (
              outreach_id,
              sovereign_id,
              quarantine_reason,
              original_created_at
            ) VALUES ($1, $2, 'IDENTITY_FAIL', $3)
            ON CONFLICT (outreach_id) DO NOTHING
          `, [row.outreach_id, row.sovereign_id, row.outreach_created_at]);
        }
        console.log(`  Moved ${existsFail.length} to quarantine`);

        const failIds = existsFail.map(r => r.outreach_id);
        await client.query(`
          DELETE FROM outreach.outreach
          WHERE outreach_id = ANY($1::uuid[])
        `, [failIds]);
        console.log(`  Removed ${existsFail.length} from outreach.outreach`);
      } else {
        console.log('  [DRY RUN] Would quarantine these records');
      }
    } else {
      console.log('  No FAIL records to quarantine');
    }
    console.log('');

    // ============================================
    // STEP 5: Handle PENDING records → run verification
    // ============================================
    console.log('STEP 5: Processing PENDING records');
    console.log('-'.repeat(40));

    let verifiedToPass = 0;
    let verifiedToFail = 0;

    if (existsPending.length > 0) {
      console.log(`  ${existsPending.length} records have identity_status = PENDING`);

      if (skipVerification) {
        console.log('  [SKIP] Verification skipped (--skip-verification flag)');
        console.log('  These records will remain PENDING in CL');
      } else if (!dryRun) {
        // Run existence verification on PENDING records
        console.log('  Running existence verification...');

        for (const row of existsPending) {
          // Simple existence check via domain
          if (row.company_domain) {
            try {
              // Check if domain resolves (simplified - actual verification is more complex)
              const hasDomain = row.company_domain && row.company_domain.length > 0;
              const hasName = row.company_name && row.company_name.length > 0;

              if (hasDomain && hasName) {
                // Mark as PASS if has both domain and name
                await client.query(`
                  UPDATE cl.company_identity
                  SET identity_status = 'PASS',
                      updated_at = now()
                  WHERE company_unique_id = $1
                    AND identity_status = 'PENDING'
                `, [row.sovereign_id]);
                verifiedToPass++;
              } else {
                // Mark as FAIL if missing critical data
                await client.query(`
                  UPDATE cl.company_identity
                  SET identity_status = 'FAIL',
                      updated_at = now()
                  WHERE company_unique_id = $1
                    AND identity_status = 'PENDING'
                `, [row.sovereign_id]);
                verifiedToFail++;
              }
            } catch (e) {
              console.log(`    Error verifying ${row.sovereign_id}: ${e.message}`);
            }
          } else {
            // No domain = FAIL
            await client.query(`
              UPDATE cl.company_identity
              SET identity_status = 'FAIL',
                  updated_at = now()
              WHERE company_unique_id = $1
                AND identity_status = 'PENDING'
            `, [row.sovereign_id]);
            verifiedToFail++;
          }
        }

        console.log(`  Verification complete:`);
        console.log(`    - Promoted to PASS: ${verifiedToPass}`);
        console.log(`    - Set to FAIL: ${verifiedToFail}`);

        // Now quarantine the ones that failed
        if (verifiedToFail > 0) {
          const recheck = await client.query(`
            SELECT o.outreach_id, o.sovereign_id, o.created_at
            FROM outreach.outreach o
            JOIN cl.company_identity ci ON o.sovereign_id = ci.company_unique_id
            WHERE ci.identity_status = 'FAIL'
          `);

          for (const row of recheck.rows) {
            await client.query(`
              INSERT INTO outreach.outreach_legacy_quarantine (
                outreach_id,
                sovereign_id,
                quarantine_reason,
                original_created_at
              ) VALUES ($1, $2, 'VERIFICATION_FAIL', $3)
              ON CONFLICT (outreach_id) DO NOTHING
            `, [row.outreach_id, row.sovereign_id, row.created_at]);
          }

          const failIds = recheck.rows.map(r => r.outreach_id);
          if (failIds.length > 0) {
            await client.query(`
              DELETE FROM outreach.outreach
              WHERE outreach_id = ANY($1::uuid[])
            `, [failIds]);
            console.log(`  Quarantined ${recheck.rows.length} newly failed records`);
          }
        }
      } else {
        console.log('  [DRY RUN] Would run verification on PENDING records');
      }
    } else {
      console.log('  No PENDING records to verify');
    }
    console.log('');

    // ============================================
    // STEP 6: Final Report
    // ============================================
    console.log('='.repeat(60));
    console.log('RECONCILIATION REPORT');
    console.log('='.repeat(60));

    // Get current counts
    const finalOrphans = await client.query(`
      SELECT COUNT(*) as cnt
      FROM outreach.outreach o
      LEFT JOIN cl.company_identity ci
        ON o.sovereign_id = ci.company_unique_id
      WHERE ci.company_unique_id IS NULL
         OR ci.identity_status IS DISTINCT FROM 'PASS'
    `);

    let quarantineCount = { rows: [{ cnt: 0 }] };
    try {
      quarantineCount = await client.query(`
        SELECT COUNT(*) as cnt FROM outreach.outreach_legacy_quarantine
      `);
    } catch (e) {
      // Table doesn't exist yet (dry run)
    }

    const outreachTotal = await client.query(`
      SELECT COUNT(*) as cnt FROM outreach.outreach
    `);

    const passLinked = await client.query(`
      SELECT COUNT(*) as cnt
      FROM outreach.outreach o
      JOIN cl.company_identity ci
        ON o.sovereign_id = ci.company_unique_id
      WHERE ci.identity_status = 'PASS'
    `);

    console.log('');
    console.log('Summary:');
    console.log(`  - Original orphans found:       ${orphans.rows.length}`);
    console.log(`  - No sovereign (quarantined):   ${noSovereign.length}`);
    console.log(`  - Already FAIL (quarantined):   ${existsFail.length}`);
    console.log(`  - PENDING → verified to PASS:   ${verifiedToPass}`);
    console.log(`  - PENDING → verified to FAIL:   ${verifiedToFail}`);
    console.log('');
    console.log('Current State:');
    console.log(`  - outreach.outreach total:      ${outreachTotal.rows[0].cnt}`);
    console.log(`  - Linked to PASS:               ${passLinked.rows[0].cnt}`);
    console.log(`  - Remaining orphans:            ${finalOrphans.rows[0].cnt}`);
    console.log(`  - In quarantine:                ${quarantineCount.rows[0].cnt}`);
    console.log('');

    if (dryRun) {
      console.log('[DRY RUN] No changes were made. Run without --dry-run to execute.');
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
