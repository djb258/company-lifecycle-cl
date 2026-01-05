// ============================================================================
// DEPRECATED: DO NOT USE
// ============================================================================
throw new Error("DEPRECATED: phase-d-error-routing.js is retired. Errors are now recorded in cl.company_candidate.verification_error.");

// Phase D: ERROR Routing
// Routes non-eligible staging rows to cl.company_lifecycle_error

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function runPhaseD() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('========================================');
    console.log('PHASE D: ERROR Routing');
    console.log('========================================\n');

    // Check failures
    console.log('1. Analyzing failures in staging...');
    const failureAnalysis = await client.query(`
      SELECT eligibility_status, COUNT(*) as cnt
      FROM cl.company_lifecycle_identity_staging
      WHERE eligibility_status != 'ELIGIBLE'
      GROUP BY eligibility_status
    `);
    console.log('Failures by status:');
    failureAnalysis.rows.forEach(r => console.log('  - ' + r.eligibility_status + ': ' + r.cnt));

    // Show the failures
    const failures = await client.query(`
      SELECT staging_id, source_company_id, company_name, company_domain, linkedin_company_url, company_state, eligibility_status
      FROM cl.company_lifecycle_identity_staging
      WHERE eligibility_status != 'ELIGIBLE'
    `);
    console.log('\nFailure details:');
    failures.rows.forEach((r, i) => {
      console.log('  ' + (i+1) + '. ' + r.company_name);
      console.log('     Source ID: ' + r.source_company_id);
      console.log('     Domain: ' + (r.company_domain || 'NULL'));
      console.log('     LinkedIn: ' + (r.linkedin_company_url || 'NULL'));
      console.log('     State: ' + (r.company_state || 'NULL'));
      console.log('     Status: ' + r.eligibility_status);
    });

    // Route to error table
    console.log('\n2. Routing failures to error table...');
    const errorResult = await client.query(`
      INSERT INTO cl.company_lifecycle_error (
        source_company_id,
        staging_id,
        failure_stage,
        failure_reason,
        failure_details,
        repair_hint,
        status
      )
      SELECT
        s.source_company_id,
        s.staging_id,
        'GATE_ZERO_INTAKE',
        CASE
          WHEN s.linkedin_company_url IS NULL THEN 'MISSING_LINKEDIN'
          WHEN s.company_domain IS NULL THEN 'MISSING_DOMAIN'
          WHEN s.company_state IS NULL THEN 'MISSING_STATE'
          ELSE 'INCOMPLETE_IDENTITY_ANCHORS'
        END,
        jsonb_build_object(
          'company_name', s.company_name,
          'has_domain', s.company_domain IS NOT NULL,
          'has_linkedin', s.linkedin_company_url IS NOT NULL,
          'has_state', s.company_state IS NOT NULL
        ),
        CASE
          WHEN s.linkedin_company_url IS NULL THEN 'Add LinkedIn company URL'
          WHEN s.company_domain IS NULL THEN 'Add company domain/website'
          WHEN s.company_state IS NULL THEN 'Add company state'
          ELSE 'Complete identity anchors'
        END,
        'ACTIVE'
      FROM cl.company_lifecycle_identity_staging s
      WHERE s.eligibility_status != 'ELIGIBLE'
        AND NOT EXISTS (
          SELECT 1 FROM cl.company_lifecycle_error e
          WHERE e.source_company_id = s.source_company_id
        )
      RETURNING error_id
    `);
    console.log('Errors routed: ' + errorResult.rowCount);

    // Mark staging rows as processed (with rejection)
    console.log('\n3. Marking failed staging rows...');
    const updateResult = await client.query(`
      UPDATE cl.company_lifecycle_identity_staging
      SET
        processed_at = now(),
        rejection_reason = 'Routed to error table'
      WHERE eligibility_status != 'ELIGIBLE' AND processed_at IS NULL
    `);
    console.log('Failed staging rows marked: ' + updateResult.rowCount);

    // Verify error table
    console.log('\n4. Error table summary...');
    const errorSummary = await client.query(`
      SELECT failure_reason, COUNT(*) as cnt
      FROM cl.company_lifecycle_error
      GROUP BY failure_reason
    `);
    console.log('Errors by reason:');
    errorSummary.rows.forEach(r => console.log('  - ' + r.failure_reason + ': ' + r.cnt));

    console.log('\n========================================');
    console.log('PHASE D: COMPLETE');
    console.log('========================================');

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runPhaseD();
