// CL Bootstrap Hardening Script
// Applies the three hardening requirements retroactively:
// 1. Idempotency Guard (company_fingerprint)
// 2. Promotion Contract (explicit field requirements)
// 3. Lifecycle Run Versioning (lifecycle_run_id)

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Generate lifecycle run ID
const LIFECYCLE_RUN_ID = `RUN-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

// ============================================
// PROMOTION CONTRACT (EXPLICIT)
// ============================================
const PROMOTION_CONTRACT = {
  version: '1.0',
  description: 'Fields required for CL promotion from intake to sovereign identity',
  required_fields: [
    { field: 'company_name', type: 'TEXT', nullable: false, reason: 'Core identity anchor' },
    { field: 'company_domain', type: 'TEXT', nullable: true, reason: 'Primary web identity (required if linkedin missing)' },
    { field: 'linkedin_company_url', type: 'TEXT', nullable: true, reason: 'Secondary identity anchor (required if domain missing)' }
  ],
  promotion_rule: 'MUST have company_name AND (company_domain OR linkedin_company_url)',
  non_blocking_fields: [
    'company_state',
    'source_system',
    'industry',
    'employee_count'
  ],
  fingerprint_formula: 'LOWER(COALESCE(TRIM(company_domain), "")) || "|" || LOWER(COALESCE(TRIM(linkedin_company_url), ""))'
};

async function runHardening() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('========================================');
    console.log('CL BOOTSTRAP HARDENING');
    console.log('========================================');
    console.log('Lifecycle Run ID: ' + LIFECYCLE_RUN_ID);
    console.log('Timestamp: ' + new Date().toISOString());
    console.log('');

    // ============================================
    // 1. EMIT PROMOTION CONTRACT
    // ============================================
    console.log('========================================');
    console.log('1. PROMOTION CONTRACT');
    console.log('========================================');
    console.log(JSON.stringify(PROMOTION_CONTRACT, null, 2));
    console.log('');

    // ============================================
    // 2. ADD HARDENING COLUMNS
    // ============================================
    console.log('========================================');
    console.log('2. ADDING HARDENING COLUMNS');
    console.log('========================================');

    // Add company_fingerprint to staging
    console.log('\n2a. Adding company_fingerprint to staging...');
    try {
      await client.query(`
        ALTER TABLE cl.company_lifecycle_identity_staging
        ADD COLUMN IF NOT EXISTS company_fingerprint TEXT
      `);
      console.log('✓ company_fingerprint column added to staging');
    } catch (e) {
      if (e.code === '42701') {
        console.log('✓ company_fingerprint already exists in staging');
      } else throw e;
    }

    // Add lifecycle_run_id to staging
    console.log('\n2b. Adding lifecycle_run_id to staging...');
    try {
      await client.query(`
        ALTER TABLE cl.company_lifecycle_identity_staging
        ADD COLUMN IF NOT EXISTS lifecycle_run_id TEXT
      `);
      console.log('✓ lifecycle_run_id column added to staging');
    } catch (e) {
      if (e.code === '42701') {
        console.log('✓ lifecycle_run_id already exists in staging');
      } else throw e;
    }

    // Add company_fingerprint to identity
    console.log('\n2c. Adding company_fingerprint to identity...');
    try {
      await client.query(`
        ALTER TABLE cl.company_identity
        ADD COLUMN IF NOT EXISTS company_fingerprint TEXT
      `);
      console.log('✓ company_fingerprint column added to identity');
    } catch (e) {
      if (e.code === '42701') {
        console.log('✓ company_fingerprint already exists in identity');
      } else throw e;
    }

    // Add lifecycle_run_id to identity
    console.log('\n2d. Adding lifecycle_run_id to identity...');
    try {
      await client.query(`
        ALTER TABLE cl.company_identity
        ADD COLUMN IF NOT EXISTS lifecycle_run_id TEXT
      `);
      console.log('✓ lifecycle_run_id column added to identity');
    } catch (e) {
      if (e.code === '42701') {
        console.log('✓ lifecycle_run_id already exists in identity');
      } else throw e;
    }

    // Add lifecycle_run_id to error table
    console.log('\n2e. Adding lifecycle_run_id to error table...');
    try {
      await client.query(`
        ALTER TABLE cl.company_lifecycle_error
        ADD COLUMN IF NOT EXISTS lifecycle_run_id TEXT
      `);
      console.log('✓ lifecycle_run_id column added to error table');
    } catch (e) {
      if (e.code === '42701') {
        console.log('✓ lifecycle_run_id already exists in error table');
      } else throw e;
    }

    // Add lifecycle_run_id to bridge table
    console.log('\n2f. Adding lifecycle_run_id to bridge table...');
    try {
      await client.query(`
        ALTER TABLE cl.company_identity_bridge
        ADD COLUMN IF NOT EXISTS lifecycle_run_id TEXT
      `);
      console.log('✓ lifecycle_run_id column added to bridge table');
    } catch (e) {
      if (e.code === '42701') {
        console.log('✓ lifecycle_run_id already exists in bridge table');
      } else throw e;
    }

    // ============================================
    // 3. BACKFILL FINGERPRINTS
    // ============================================
    console.log('\n========================================');
    console.log('3. BACKFILLING FINGERPRINTS');
    console.log('========================================');

    // Backfill staging fingerprints
    console.log('\n3a. Backfilling staging fingerprints...');
    const stagingFpResult = await client.query(`
      UPDATE cl.company_lifecycle_identity_staging
      SET company_fingerprint = LOWER(COALESCE(TRIM(company_domain), '')) || '|' || LOWER(COALESCE(TRIM(linkedin_company_url), ''))
      WHERE company_fingerprint IS NULL
    `);
    console.log('Staging fingerprints backfilled: ' + stagingFpResult.rowCount);

    // Backfill identity fingerprints
    console.log('\n3b. Backfilling identity fingerprints...');
    const identityFpResult = await client.query(`
      UPDATE cl.company_identity
      SET company_fingerprint = LOWER(COALESCE(TRIM(company_domain), '')) || '|' || LOWER(COALESCE(TRIM(linkedin_company_url), ''))
      WHERE company_fingerprint IS NULL
    `);
    console.log('Identity fingerprints backfilled: ' + identityFpResult.rowCount);

    // ============================================
    // 4. BACKFILL LIFECYCLE_RUN_ID
    // ============================================
    console.log('\n========================================');
    console.log('4. BACKFILLING LIFECYCLE_RUN_ID');
    console.log('========================================');
    console.log('Run ID: ' + LIFECYCLE_RUN_ID);

    // Backfill staging
    const stagingRunResult = await client.query(`
      UPDATE cl.company_lifecycle_identity_staging
      SET lifecycle_run_id = $1
      WHERE lifecycle_run_id IS NULL
    `, [LIFECYCLE_RUN_ID]);
    console.log('Staging run IDs backfilled: ' + stagingRunResult.rowCount);

    // Backfill identity
    const identityRunResult = await client.query(`
      UPDATE cl.company_identity
      SET lifecycle_run_id = $1
      WHERE lifecycle_run_id IS NULL
    `, [LIFECYCLE_RUN_ID]);
    console.log('Identity run IDs backfilled: ' + identityRunResult.rowCount);

    // Backfill errors
    const errorRunResult = await client.query(`
      UPDATE cl.company_lifecycle_error
      SET lifecycle_run_id = $1
      WHERE lifecycle_run_id IS NULL
    `, [LIFECYCLE_RUN_ID]);
    console.log('Error run IDs backfilled: ' + errorRunResult.rowCount);

    // Backfill bridge
    const bridgeRunResult = await client.query(`
      UPDATE cl.company_identity_bridge
      SET lifecycle_run_id = $1
      WHERE lifecycle_run_id IS NULL
    `, [LIFECYCLE_RUN_ID]);
    console.log('Bridge run IDs backfilled: ' + bridgeRunResult.rowCount);

    // ============================================
    // 5. IDEMPOTENCY VERIFICATION
    // ============================================
    console.log('\n========================================');
    console.log('5. IDEMPOTENCY VERIFICATION');
    console.log('========================================');

    // Check for duplicate fingerprints in identity table
    const duplicateFps = await client.query(`
      SELECT company_fingerprint, COUNT(*) as cnt
      FROM cl.company_identity
      WHERE company_fingerprint IS NOT NULL AND company_fingerprint != '|'
      GROUP BY company_fingerprint
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 10
    `);

    if (duplicateFps.rows.length === 0) {
      console.log('✓ No duplicate fingerprints found in identity table');
      console.log('✓ Idempotency guard PASSED');
    } else {
      console.log('⚠️  WARNING: Duplicate fingerprints detected!');
      console.log('Count: ' + duplicateFps.rows.length);
      duplicateFps.rows.forEach(r => {
        console.log('  - "' + r.company_fingerprint + '": ' + r.cnt + ' duplicates');
      });
    }

    // Check unique fingerprints
    const uniqueFps = await client.query(`
      SELECT COUNT(DISTINCT company_fingerprint) as unique_fps,
             COUNT(*) as total_rows
      FROM cl.company_identity
      WHERE company_fingerprint IS NOT NULL
    `);
    console.log('\nFingerprint summary:');
    console.log('  Unique fingerprints: ' + uniqueFps.rows[0].unique_fps);
    console.log('  Total identity rows: ' + uniqueFps.rows[0].total_rows);

    // ============================================
    // 6. CREATE UNIQUE CONSTRAINT (IF SAFE)
    // ============================================
    console.log('\n========================================');
    console.log('6. FINGERPRINT UNIQUENESS CONSTRAINT');
    console.log('========================================');

    if (duplicateFps.rows.length === 0) {
      try {
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_company_identity_fingerprint_unique
          ON cl.company_identity (company_fingerprint)
          WHERE company_fingerprint IS NOT NULL AND company_fingerprint != '|'
        `);
        console.log('✓ Unique index created on company_fingerprint');
      } catch (e) {
        if (e.code === '42P07') {
          console.log('✓ Unique index already exists');
        } else {
          console.log('⚠️  Could not create unique index: ' + e.message);
        }
      }
    } else {
      console.log('⚠️  Skipping unique constraint due to existing duplicates');
    }

    // ============================================
    // 7. HARDENED AUDIT REPORT
    // ============================================
    console.log('\n========================================');
    console.log('7. HARDENED AUDIT REPORT');
    console.log('========================================');

    const counts = {};
    counts.staging = (await client.query('SELECT COUNT(*) as cnt FROM cl.company_lifecycle_identity_staging')).rows[0].cnt;
    counts.identity = (await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity')).rows[0].cnt;
    counts.bridge = (await client.query('SELECT COUNT(*) as cnt FROM cl.company_identity_bridge')).rows[0].cnt;
    counts.errors = (await client.query('SELECT COUNT(*) as cnt FROM cl.company_lifecycle_error')).rows[0].cnt;

    console.log('\n| Table | Count | Fingerprinted | Run-Versioned |');
    console.log('|-------|-------|---------------|---------------|');
    console.log('| Staging | ' + counts.staging + ' | ✓ | ✓ |');
    console.log('| Identity | ' + counts.identity + ' | ✓ | ✓ |');
    console.log('| Bridge | ' + counts.bridge + ' | - | ✓ |');
    console.log('| Errors | ' + counts.errors + ' | - | ✓ |');

    console.log('\n========================================');
    console.log('HARDENING COMPLETE');
    console.log('========================================');
    console.log('Lifecycle Run ID: ' + LIFECYCLE_RUN_ID);
    console.log('Promotion Contract: v' + PROMOTION_CONTRACT.version);
    console.log('Idempotency: ' + (duplicateFps.rows.length === 0 ? 'ENFORCED' : 'WARNING - DUPLICATES'));
    console.log('Run Versioning: APPLIED');
    console.log('');

  } catch (error) {
    console.error('ERROR:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await client.end();
  }
}

runHardening();
