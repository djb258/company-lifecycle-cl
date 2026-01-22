// Deep analysis of cl.cl_errors - WHY are these errors happening?
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function analyzeErrorCauses() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('ERROR ROOT CAUSE ANALYSIS');
    console.log('='.repeat(70));

    // =========================================================================
    // 1. COLLISION_DOMAIN (8,781) - Why are domains colliding?
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('[1] COLLISION_DOMAIN ANALYSIS (8,781 errors)');
    console.log('='.repeat(70));

    // Sample collision domains
    const collisionDomains = await client.query(`
      SELECT
        e.inputs_snapshot->>'domain' as colliding_domain,
        e.inputs_snapshot->>'collision_with' as collides_with_id,
        ci.company_name,
        ci.company_domain
      FROM cl.cl_errors e
      LEFT JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.failure_reason_code = 'COLLISION_DOMAIN'
      LIMIT 10
    `);
    console.log('\nSample domain collisions:');
    console.table(collisionDomains.rows);

    // Are these real collisions or false positives?
    const collisionCheck = await client.query(`
      SELECT
        ci.company_domain,
        COUNT(*) as companies_with_domain
      FROM cl.company_identity ci
      WHERE ci.company_domain IS NOT NULL
        AND ci.company_domain != ''
      GROUP BY ci.company_domain
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `);
    console.log('\nDomains actually shared by multiple companies:');
    console.table(collisionCheck.rows);

    // =========================================================================
    // 2. DOMAIN_FAIL (7,910) - Why are domains failing?
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('[2] DOMAIN_FAIL ANALYSIS (7,910 errors)');
    console.log('='.repeat(70));

    // What's in the inputs_snapshot for domain fails?
    const domainFailDetails = await client.query(`
      SELECT
        e.inputs_snapshot->>'domain' as domain,
        e.inputs_snapshot->>'domain_status_code' as status_code,
        e.inputs_snapshot->>'domain_error' as error_msg,
        ci.company_name
      FROM cl.cl_errors e
      LEFT JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.failure_reason_code = 'DOMAIN_FAIL'
      LIMIT 15
    `);
    console.log('\nSample domain failures:');
    console.table(domainFailDetails.rows);

    // Group by error type
    const domainFailGroups = await client.query(`
      SELECT
        COALESCE(e.inputs_snapshot->>'domain_error', 'unknown') as error_type,
        COUNT(*) as count
      FROM cl.cl_errors e
      WHERE e.failure_reason_code = 'DOMAIN_FAIL'
      GROUP BY e.inputs_snapshot->>'domain_error'
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('\nDomain failures by error type:');
    console.table(domainFailGroups.rows);

    // Check if these companies have NULL or empty domains
    const domainNullCheck = await client.query(`
      SELECT
        CASE
          WHEN ci.company_domain IS NULL THEN 'NULL domain'
          WHEN ci.company_domain = '' THEN 'Empty domain'
          WHEN ci.company_domain LIKE '%.%' THEN 'Has valid domain format'
          ELSE 'Invalid domain format'
        END as domain_status,
        COUNT(*) as count
      FROM cl.cl_errors e
      JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.failure_reason_code = 'DOMAIN_FAIL'
      GROUP BY 1
      ORDER BY count DESC
    `);
    console.log('\nDomain status of failed companies:');
    console.table(domainNullCheck.rows);

    // =========================================================================
    // 3. FIRMOGRAPHIC_STATE_MISMATCH (1,000) - What states are mismatching?
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('[3] FIRMOGRAPHIC_STATE_MISMATCH ANALYSIS (1,000 errors)');
    console.log('='.repeat(70));

    const stateMismatch = await client.query(`
      SELECT
        ci.state_verified,
        e.inputs_snapshot->>'expected_state' as expected,
        e.inputs_snapshot->>'actual_state' as actual,
        COUNT(*) as count
      FROM cl.cl_errors e
      JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.failure_reason_code = 'FIRMOGRAPHIC_STATE_MISMATCH'
      GROUP BY ci.state_verified, e.inputs_snapshot->>'expected_state', e.inputs_snapshot->>'actual_state'
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('\nState mismatch patterns:');
    console.table(stateMismatch.rows);

    // =========================================================================
    // 4. NAME_EMPTY (51) - Companies with empty names
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('[4] NAME_EMPTY ANALYSIS (51 errors)');
    console.log('='.repeat(70));

    const emptyNames = await client.query(`
      SELECT
        ci.company_unique_id,
        ci.company_name,
        ci.company_domain,
        ci.linkedin_company_url,
        ci.source_system
      FROM cl.cl_errors e
      JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.failure_reason_code = 'NAME_EMPTY'
      LIMIT 15
    `);
    console.log('\nCompanies with empty names:');
    console.table(emptyNames.rows);

    // =========================================================================
    // 5. COLLISION_NAME (35) - Name collisions
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('[5] COLLISION_NAME ANALYSIS (35 errors)');
    console.log('='.repeat(70));

    const nameCollisions = await client.query(`
      SELECT
        ci.company_name,
        ci.canonical_name,
        ci.company_domain,
        e.inputs_snapshot->>'collision_with' as collides_with
      FROM cl.cl_errors e
      JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.failure_reason_code = 'COLLISION_NAME'
      LIMIT 15
    `);
    console.log('\nName collision samples:');
    console.table(nameCollisions.rows);

    // =========================================================================
    // 6. CLEANUP OPPORTUNITIES
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('[6] CLEANUP OPPORTUNITIES');
    console.log('='.repeat(70));

    // Errors where company has been fixed (existence_verified = TRUE but has error)
    const resolvedButNotMarked = await client.query(`
      SELECT
        e.pass_name,
        e.failure_reason_code,
        COUNT(*) as potentially_resolved
      FROM cl.cl_errors e
      JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.resolved_at IS NULL
        AND ci.existence_verified = TRUE
        AND e.pass_name = 'existence'
      GROUP BY e.pass_name, e.failure_reason_code
    `);
    console.log('\nExistence errors where company now verified (can mark resolved):');
    console.table(resolvedButNotMarked.rows);

    // Collision errors for companies that no longer have collisions
    const orphanCollisions = await client.query(`
      WITH collision_companies AS (
        SELECT e.company_unique_id, ci.company_domain
        FROM cl.cl_errors e
        JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
        WHERE e.failure_reason_code = 'COLLISION_DOMAIN'
          AND e.resolved_at IS NULL
      ),
      domain_counts AS (
        SELECT company_domain, COUNT(*) as cnt
        FROM cl.company_identity
        WHERE company_domain IS NOT NULL AND company_domain != ''
        GROUP BY company_domain
      )
      SELECT
        'Collision errors for now-unique domains' as metric,
        COUNT(*) as count
      FROM collision_companies cc
      LEFT JOIN domain_counts dc ON cc.company_domain = dc.company_domain
      WHERE dc.cnt = 1 OR dc.cnt IS NULL
    `);
    console.log('\nCollision errors that may be resolvable:');
    console.table(orphanCollisions.rows);

    // Errors for companies that no longer exist
    const orphanErrors = await client.query(`
      SELECT
        'Errors for deleted companies' as metric,
        COUNT(*) as count
      FROM cl.cl_errors e
      LEFT JOIN cl.company_identity ci ON e.company_unique_id = ci.company_unique_id
      WHERE e.company_unique_id IS NOT NULL
        AND ci.company_unique_id IS NULL
    `);
    console.log('\nOrphan errors (company deleted):');
    console.table(orphanErrors.rows);

    console.log('\n' + '='.repeat(70));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

analyzeErrorCauses();
