// CL Funnel Schema v2 - LEAN
// 4 tables total, not 15
// Core spine + 2 sidecars + 1 error table

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('==========================================');
  console.log('CL FUNNEL SCHEMA v2 (LEAN)');
  console.log('==========================================\n');

  try {
    // ================================================
    // 1. CORE IDENTITY SPINE (extend existing)
    // ================================================
    console.log('1. Core spine: cl.company_identity');

    const spineColumns = [
      { name: 'canonical_name', type: 'TEXT' },
      { name: 'state_verified', type: 'TEXT' },
      { name: 'employee_count_band', type: 'TEXT' }
    ];

    for (const col of spineColumns) {
      await client.query(`
        ALTER TABLE cl.company_identity
        ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
      `).catch(() => {});
    }
    console.log('   ✓ Spine extended');

    // ================================================
    // 2a. SIDECAR: NAMES & ALIASES
    // ================================================
    console.log('2a. Sidecar: cl.company_names');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.company_names (
        name_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_unique_id UUID NOT NULL REFERENCES cl.company_identity(company_unique_id),
        name_value TEXT NOT NULL,
        name_type TEXT NOT NULL CHECK (name_type IN ('canonical', 'legal', 'dba', 'brand', 'normalized')),
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(company_unique_id, name_value, name_type)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_company_names_lookup
      ON cl.company_names(company_unique_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_company_names_search
      ON cl.company_names(LOWER(name_value))
    `);
    console.log('   ✓ company_names created');

    // ================================================
    // 2b. SIDECAR: DOMAINS & HEALTH
    // ================================================
    console.log('2b. Sidecar: cl.company_domains');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.company_domains (
        domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_unique_id UUID NOT NULL REFERENCES cl.company_identity(company_unique_id),
        domain TEXT NOT NULL,
        domain_health TEXT CHECK (domain_health IN ('LIVE', 'DEAD', 'REDIRECT', 'PARKED', 'UNKNOWN')),
        mx_present BOOLEAN,
        domain_name_confidence INT,
        checked_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(company_unique_id, domain)
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_company_domains_lookup
      ON cl.company_domains(company_unique_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_company_domains_search
      ON cl.company_domains(LOWER(domain))
    `);
    console.log('   ✓ company_domains created');

    // ================================================
    // 3. CONFIDENCE ENVELOPE
    // ================================================
    console.log('3. Confidence: cl.identity_confidence');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.identity_confidence (
        company_unique_id UUID PRIMARY KEY REFERENCES cl.company_identity(company_unique_id),
        confidence_score INT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
        confidence_bucket TEXT NOT NULL CHECK (confidence_bucket IN ('HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED')),
        computed_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_confidence_bucket
      ON cl.identity_confidence(confidence_bucket)
    `);
    console.log('   ✓ identity_confidence created');

    // ================================================
    // 4. UNIFIED ERROR TABLE (1, not 6)
    // ================================================
    console.log('4. Errors: cl.cl_errors (unified)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cl.cl_errors (
        error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_unique_id UUID,
        lifecycle_run_id TEXT NOT NULL,
        pass_name TEXT NOT NULL CHECK (pass_name IN ('existence', 'name', 'domain', 'collision', 'firmographic')),
        failure_reason_code TEXT NOT NULL,
        inputs_snapshot JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        resolved_at TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_errors_pass
      ON cl.cl_errors(pass_name)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_errors_run
      ON cl.cl_errors(lifecycle_run_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_errors_unresolved
      ON cl.cl_errors(resolved_at) WHERE resolved_at IS NULL
    `);
    console.log('   ✓ cl_errors created');

    // ================================================
    // CLEANUP: Drop bloated tables from v1
    // ================================================
    console.log('\n5. Cleanup: Dropping v1 bloat...');

    const dropTables = [
      'cl.cl_errors_existence',
      'cl.cl_errors_name',
      'cl.cl_errors_domain',
      'cl.cl_errors_collision',
      'cl.cl_errors_firmographic',
      'cl.company_aliases',
      'cl.domain_facts',
      'cl.identity_collisions',
      'cl.funnel_runs'
    ];

    for (const t of dropTables) {
      await client.query(`DROP TABLE IF EXISTS ${t} CASCADE`).catch(() => {});
    }
    console.log('   ✓ v1 tables dropped');

    // ================================================
    // VERIFY
    // ================================================
    console.log('\n==========================================');
    console.log('SCHEMA v2 VERIFIED');
    console.log('==========================================\n');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'cl' ORDER BY table_name
    `);

    console.log('CL Schema (lean):');
    tables.rows.forEach(r => console.log('  - cl.' + r.table_name));

    console.log('\n4 new tables:');
    console.log('  1. cl.company_identity (spine)');
    console.log('  2. cl.company_names (sidecar)');
    console.log('  3. cl.company_domains (sidecar)');
    console.log('  4. cl.cl_errors (unified)');
    console.log('  + cl.identity_confidence (envelope)');

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
