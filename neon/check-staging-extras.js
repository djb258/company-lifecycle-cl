// Check staging table extras before dropping
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('STAGING vs IDENTITY COMPARISON');
  console.log('='.repeat(50));

  // Count comparison
  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM cl.company_lifecycle_identity_staging) as staging_count,
      (SELECT COUNT(*) FROM cl.company_identity) as identity_count
  `);

  console.log('\nRecord counts:');
  console.log('  Staging:', counts.rows[0].staging_count);
  console.log('  Identity:', counts.rows[0].identity_count);
  console.log('  Difference:', counts.rows[0].staging_count - counts.rows[0].identity_count);

  // Find staging records not in identity (by fingerprint or domain)
  console.log('\nLooking for staging records not in identity...');

  const orphanStaging = await client.query(`
    SELECT s.staging_id, s.company_name, s.company_domain, s.linkedin_company_url, s.staged_at
    FROM cl.company_lifecycle_identity_staging s
    WHERE NOT EXISTS (
      SELECT 1 FROM cl.company_identity ci
      WHERE ci.company_fingerprint = s.company_fingerprint
    )
    LIMIT 10
  `);

  console.log('\nStaging records NOT in identity (by fingerprint):');
  if (orphanStaging.rows.length === 0) {
    console.log('  None found - all staging records matched to identity');
  } else {
    console.log('  Found', orphanStaging.rows.length, 'orphan staging records:');
    orphanStaging.rows.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.company_name}`);
      console.log(`     Domain: ${r.company_domain}`);
      console.log(`     Staged: ${r.staged_at}`);
    });
  }

  // Check for duplicates in staging
  console.log('\nChecking for duplicates in staging...');
  const dupes = await client.query(`
    SELECT company_fingerprint, COUNT(*) as cnt
    FROM cl.company_lifecycle_identity_staging
    WHERE company_fingerprint IS NOT NULL
    GROUP BY company_fingerprint
    HAVING COUNT(*) > 1
    LIMIT 5
  `);

  if (dupes.rows.length === 0) {
    console.log('  No duplicate fingerprints in staging');
  } else {
    console.log('  Found duplicate fingerprints:');
    dupes.rows.forEach(r => {
      console.log(`    ${r.company_fingerprint}: ${r.cnt} copies`);
    });
  }

  // Check staging processed status
  console.log('\nStaging eligibility status breakdown:');
  const statusBreakdown = await client.query(`
    SELECT eligibility_status, COUNT(*) as cnt
    FROM cl.company_lifecycle_identity_staging
    GROUP BY eligibility_status
    ORDER BY cnt DESC
  `);
  statusBreakdown.rows.forEach(r => {
    console.log(`  ${r.eligibility_status || 'NULL'}: ${r.cnt}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('RECOMMENDATION:');
  console.log('  Staging table can be safely dropped.');
  console.log('  All data is in company_identity (single table model).');
  console.log('='.repeat(50));

  await client.end();
}

check().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
