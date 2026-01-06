// Investigate cl.company_candidate table
// Understand its relationship to cl.company_identity

import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function investigate() {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    console.log('='.repeat(60));
    console.log('INVESTIGATING cl.company_candidate');
    console.log('='.repeat(60));
    console.log('');

    // ============================================
    // 1. TABLE SCHEMA
    // ============================================
    console.log('1. TABLE SCHEMA');
    console.log('-'.repeat(40));

    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = 'company_candidate'
      ORDER BY ordinal_position
    `);

    if (columns.rows.length === 0) {
      console.log('  Table cl.company_candidate does not exist!');
      return;
    }

    console.log('  Columns:');
    columns.rows.forEach(col => {
      console.log(`    - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

    // ============================================
    // 2. SAMPLE DATA
    // ============================================
    console.log('\n2. SAMPLE DATA (first 5 rows)');
    console.log('-'.repeat(40));

    const sample = await client.query(`
      SELECT * FROM cl.company_candidate LIMIT 5
    `);

    sample.rows.forEach((row, i) => {
      console.log(`\n  Row ${i + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        const displayValue = value === null ? 'NULL' :
          (typeof value === 'string' && value.length > 50) ? value.substring(0, 50) + '...' : value;
        console.log(`    ${key}: ${displayValue}`);
      });
    });

    // ============================================
    // 3. COUNT SUMMARY
    // ============================================
    console.log('\n3. COUNT SUMMARY');
    console.log('-'.repeat(40));

    const candidateCount = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_candidate`);
    const identityCount = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity`);
    const verifiedCount = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity WHERE existence_verified = TRUE`);

    console.log(`  cl.company_candidate:              ${candidateCount.rows[0].cnt}`);
    console.log(`  cl.company_identity:               ${identityCount.rows[0].cnt}`);
    console.log(`  cl.company_identity (verified):    ${verifiedCount.rows[0].cnt}`);

    // ============================================
    // 4. FIND JOIN KEY
    // ============================================
    console.log('\n4. LOOKING FOR JOIN KEY');
    console.log('-'.repeat(40));

    // Check if company_candidate has company_unique_id
    const hasUniqueId = columns.rows.some(c => c.column_name === 'company_unique_id');
    const hasDomain = columns.rows.some(c => c.column_name === 'company_domain' || c.column_name === 'domain');
    const hasFingerprint = columns.rows.some(c => c.column_name === 'company_fingerprint');

    console.log(`  Has company_unique_id: ${hasUniqueId}`);
    console.log(`  Has domain column: ${hasDomain}`);
    console.log(`  Has fingerprint: ${hasFingerprint}`);

    // ============================================
    // 5. OVERLAP ANALYSIS
    // ============================================
    console.log('\n5. OVERLAP ANALYSIS');
    console.log('-'.repeat(40));

    // Try to join on company_unique_id if it exists
    if (hasUniqueId) {
      const overlap = await client.query(`
        SELECT
          COUNT(*) as total_candidates,
          COUNT(ci.company_unique_id) as matched_to_identity,
          COUNT(*) - COUNT(ci.company_unique_id) as orphan_candidates
        FROM cl.company_candidate cc
        LEFT JOIN cl.company_identity ci ON cc.company_unique_id = ci.company_unique_id
      `);

      console.log('  Join on company_unique_id:');
      console.log(`    Total candidates:      ${overlap.rows[0].total_candidates}`);
      console.log(`    Matched to identity:   ${overlap.rows[0].matched_to_identity}`);
      console.log(`    Orphan candidates:     ${overlap.rows[0].orphan_candidates}`);
    }

    // Try domain-based matching
    const domainCol = columns.rows.find(c => c.column_name === 'company_domain' || c.column_name === 'domain');
    if (domainCol) {
      const domainOverlap = await client.query(`
        SELECT
          COUNT(DISTINCT cc.${domainCol.column_name}) as candidate_domains,
          COUNT(DISTINCT ci.company_domain) as identity_domains,
          COUNT(DISTINCT CASE WHEN ci.company_domain IS NOT NULL THEN cc.${domainCol.column_name} END) as matching_domains
        FROM cl.company_candidate cc
        LEFT JOIN cl.company_identity ci ON LOWER(cc.${domainCol.column_name}) = LOWER(ci.company_domain)
      `);

      console.log('\n  Join on domain:');
      console.log(`    Candidate domains:     ${domainOverlap.rows[0].candidate_domains}`);
      console.log(`    Identity domains:      ${domainOverlap.rows[0].identity_domains}`);
      console.log(`    Matching domains:      ${domainOverlap.rows[0].matching_domains}`);
    }

    // ============================================
    // 6. VERIFICATION STATUS OF CANDIDATES
    // ============================================
    console.log('\n6. CANDIDATE VERIFICATION STATUS');
    console.log('-'.repeat(40));

    if (hasUniqueId) {
      const statusBreakdown = await client.query(`
        SELECT
          COALESCE(ci.existence_verified::text, 'NOT IN IDENTITY') as status,
          COUNT(*) as cnt
        FROM cl.company_candidate cc
        LEFT JOIN cl.company_identity ci ON cc.company_unique_id = ci.company_unique_id
        GROUP BY ci.existence_verified
        ORDER BY cnt DESC
      `);

      console.log('  Candidates by identity verification status:');
      statusBreakdown.rows.forEach(row => {
        console.log(`    ${row.status}: ${row.cnt}`);
      });
    }

    // ============================================
    // 7. TIMELINE ANALYSIS
    // ============================================
    console.log('\n7. TIMELINE ANALYSIS');
    console.log('-'.repeat(40));

    const createdAtCol = columns.rows.find(c => c.column_name === 'created_at');
    if (createdAtCol) {
      const timeline = await client.query(`
        SELECT
          MIN(created_at) as earliest,
          MAX(created_at) as latest,
          COUNT(*) as total
        FROM cl.company_candidate
      `);

      console.log(`  Earliest record: ${timeline.rows[0].earliest}`);
      console.log(`  Latest record:   ${timeline.rows[0].latest}`);
    }

    // ============================================
    // 8. UNIQUE COLUMNS IN CANDIDATE
    // ============================================
    console.log('\n8. COLUMNS UNIQUE TO company_candidate');
    console.log('-'.repeat(40));

    const identityColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'cl' AND table_name = 'company_identity'
    `);

    const identityColNames = identityColumns.rows.map(r => r.column_name);
    const candidateColNames = columns.rows.map(r => r.column_name);

    const uniqueToCandidates = candidateColNames.filter(c => !identityColNames.includes(c));
    const uniqueToIdentity = identityColNames.filter(c => !candidateColNames.includes(c));

    console.log('  Columns only in company_candidate:');
    uniqueToCandidates.forEach(c => console.log(`    - ${c}`));

    console.log('\n  Columns only in company_identity:');
    uniqueToIdentity.forEach(c => console.log(`    - ${c}`));

    // ============================================
    // 9. RECOMMENDATION
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('ANALYSIS COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

investigate();
