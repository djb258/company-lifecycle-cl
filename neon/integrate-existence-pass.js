// Integrate Existence Verification into Lean Schema
// Migrates verified data into cl.company_domains and cl.cl_errors

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function integrate() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('==========================================');
  console.log('INTEGRATE EXISTENCE PASS INTO LEAN SCHEMA');
  console.log('==========================================\n');

  try {
    // 1. Check current state
    console.log('1. Current state...');
    const verified = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.company_identity WHERE existence_verified = TRUE
    `);
    const failed = await client.query(`
      SELECT COUNT(*) as cnt FROM cl.cl_err_existence
    `);
    console.log(`   Verified: ${verified.rows[0].cnt}`);
    console.log(`   Failed: ${failed.rows[0].cnt}`);

    // 2. Populate cl.company_domains from verified companies
    console.log('\n2. Populating cl.company_domains...');

    const domainResult = await client.query(`
      INSERT INTO cl.company_domains (company_unique_id, domain, domain_health, domain_name_confidence, checked_at)
      SELECT
        company_unique_id,
        company_domain,
        CASE
          WHEN domain_status_code BETWEEN 200 AND 399 THEN 'LIVE'
          WHEN domain_status_code = 403 THEN 'LIVE'
          WHEN domain_status_code >= 400 THEN 'DEAD'
          ELSE 'UNKNOWN'
        END,
        name_match_score,
        verified_at
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
        AND existence_verified IS NOT NULL
        AND company_unique_id NOT IN (SELECT company_unique_id FROM cl.company_domains)
      ON CONFLICT (company_unique_id, domain) DO NOTHING
      RETURNING domain_id
    `);
    console.log(`   Inserted: ${domainResult.rowCount} domain records`);

    // 3. Migrate errors to unified cl.cl_errors
    console.log('\n3. Migrating errors to cl.cl_errors...');

    const errorResult = await client.query(`
      INSERT INTO cl.cl_errors (company_unique_id, lifecycle_run_id, pass_name, failure_reason_code, inputs_snapshot, created_at)
      SELECT
        company_unique_id,
        verification_run_id,
        'existence',
        reason_code,
        jsonb_build_object(
          'company_name', company_name,
          'domain', company_domain,
          'linkedin', linkedin_company_url,
          'domain_error', domain_error,
          'status_code', domain_status_code
        ),
        created_at
      FROM cl.cl_err_existence
      WHERE NOT EXISTS (
        SELECT 1 FROM cl.cl_errors e
        WHERE e.company_unique_id = cl_err_existence.company_unique_id
          AND e.pass_name = 'existence'
      )
      RETURNING error_id
    `);
    console.log(`   Migrated: ${errorResult.rowCount} errors`);

    // 4. Seed confidence envelope for verified companies
    console.log('\n4. Seeding cl.identity_confidence...');

    const confResult = await client.query(`
      INSERT INTO cl.identity_confidence (company_unique_id, confidence_score, confidence_bucket, computed_at)
      SELECT
        company_unique_id,
        CASE
          WHEN existence_verified = TRUE AND name_match_score >= 70 THEN 80
          WHEN existence_verified = TRUE AND name_match_score >= 40 THEN 60
          WHEN existence_verified = TRUE THEN 50
          ELSE 20
        END,
        CASE
          WHEN existence_verified = TRUE AND name_match_score >= 70 THEN 'HIGH'
          WHEN existence_verified = TRUE AND name_match_score >= 40 THEN 'MEDIUM'
          WHEN existence_verified = TRUE THEN 'LOW'
          ELSE 'UNVERIFIED'
        END,
        verified_at
      FROM cl.company_identity
      WHERE existence_verified IS NOT NULL
        AND company_unique_id NOT IN (SELECT company_unique_id FROM cl.identity_confidence)
      RETURNING company_unique_id
    `);
    console.log(`   Seeded: ${confResult.rowCount} confidence records`);

    // 5. Summary
    console.log('\n==========================================');
    console.log('INTEGRATION COMPLETE');
    console.log('==========================================\n');

    const summary = {
      domains: (await client.query('SELECT COUNT(*) FROM cl.company_domains')).rows[0].count,
      errors: (await client.query("SELECT COUNT(*) FROM cl.cl_errors WHERE pass_name = 'existence'")).rows[0].count,
      confidence: (await client.query('SELECT COUNT(*) FROM cl.identity_confidence')).rows[0].count,
      high: (await client.query("SELECT COUNT(*) FROM cl.identity_confidence WHERE confidence_bucket = 'HIGH'")).rows[0].count,
      medium: (await client.query("SELECT COUNT(*) FROM cl.identity_confidence WHERE confidence_bucket = 'MEDIUM'")).rows[0].count,
      low: (await client.query("SELECT COUNT(*) FROM cl.identity_confidence WHERE confidence_bucket = 'LOW'")).rows[0].count
    };

    console.log('┌─────────────────────────┬──────────┐');
    console.log('│ Table                   │ Records  │');
    console.log('├─────────────────────────┼──────────┤');
    console.log(`│ cl.company_domains      │ ${String(summary.domains).padStart(8)} │`);
    console.log(`│ cl.cl_errors (existence)│ ${String(summary.errors).padStart(8)} │`);
    console.log(`│ cl.identity_confidence  │ ${String(summary.confidence).padStart(8)} │`);
    console.log('├─────────────────────────┼──────────┤');
    console.log(`│   HIGH confidence       │ ${String(summary.high).padStart(8)} │`);
    console.log(`│   MEDIUM confidence     │ ${String(summary.medium).padStart(8)} │`);
    console.log(`│   LOW confidence        │ ${String(summary.low).padStart(8)} │`);
    console.log('└─────────────────────────┴──────────┘');

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

integrate().catch(console.error);
