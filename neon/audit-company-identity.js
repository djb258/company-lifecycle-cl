// Audit company_identity for records that shouldn't exist
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function audit() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('COMPANY_IDENTITY AUDIT - WHAT SHOULD BE CLEANED?');
  console.log('='.repeat(70));

  // 1. Source system breakdown
  console.log('\n1. SOURCE SYSTEM BREAKDOWN');
  console.log('-'.repeat(50));
  const sourceSystems = await client.query(`
    SELECT source_system, COUNT(*) as count
    FROM cl.company_identity
    GROUP BY source_system
    ORDER BY count DESC
  `);
  console.table(sourceSystems.rows);

  // 2. Records with no domain AND no linkedin
  console.log('\n2. RECORDS WITH NO DOMAIN AND NO LINKEDIN');
  console.log('-'.repeat(50));
  const noIdentifiers = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity
    WHERE (company_domain IS NULL OR company_domain = '')
      AND (linkedin_company_url IS NULL OR linkedin_company_url = '')
  `);
  console.log('No domain AND no linkedin:', noIdentifiers.rows[0].count);

  // 3. Records with empty/null company name
  console.log('\n3. RECORDS WITH EMPTY COMPANY NAME');
  console.log('-'.repeat(50));
  const emptyNames = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity
    WHERE company_name IS NULL OR TRIM(company_name) = ''
  `);
  console.log('Empty company names:', emptyNames.rows[0].count);

  // 4. Duplicate domains (same domain, multiple records)
  console.log('\n4. DUPLICATE DOMAINS');
  console.log('-'.repeat(50));
  const dupeDomains = await client.query(`
    SELECT company_domain, COUNT(*) as count
    FROM cl.company_identity
    WHERE company_domain IS NOT NULL AND company_domain != ''
    GROUP BY company_domain
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 10
  `);
  const totalDupes = await client.query(`
    SELECT COUNT(*) as domains_with_dupes, SUM(cnt) as total_dupe_records
    FROM (
      SELECT company_domain, COUNT(*) as cnt
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL AND company_domain != ''
      GROUP BY company_domain
      HAVING COUNT(*) > 1
    ) x
  `);
  console.log('Domains with multiple records:', totalDupes.rows[0].domains_with_dupes);
  console.log('Total records in duplicate domains:', totalDupes.rows[0].total_dupe_records);
  console.log('\nTop duplicate domains:');
  console.table(dupeDomains.rows);

  // 5. Records not linked to outreach.company_target
  console.log('\n5. ORPHAN CHECK - CL vs OUTREACH');
  console.log('-'.repeat(50));
  const inCLOnly = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity ci
    WHERE NOT EXISTS (
      SELECT 1 FROM outreach.company_target ct
      WHERE ct.company_unique_id = ci.company_unique_id::text
    )
  `);
  const inOutreachOnly = await client.query(`
    SELECT COUNT(*) as count
    FROM outreach.company_target ct
    WHERE NOT EXISTS (
      SELECT 1 FROM cl.company_identity ci
      WHERE ct.company_unique_id = ci.company_unique_id::text
    )
  `);
  const inBoth = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity ci
    WHERE EXISTS (
      SELECT 1 FROM outreach.company_target ct
      WHERE ct.company_unique_id = ci.company_unique_id::text
    )
  `);
  console.log('In CL only (not in Outreach):', inCLOnly.rows[0].count);
  console.log('In Outreach only (not in CL):', inOutreachOnly.rows[0].count);
  console.log('In both:', inBoth.rows[0].count);

  // 6. Eligibility status breakdown
  console.log('\n6. ELIGIBILITY STATUS BREAKDOWN');
  console.log('-'.repeat(50));
  const eligibility = await client.query(`
    SELECT eligibility_status, COUNT(*) as count
    FROM cl.company_identity
    GROUP BY eligibility_status
    ORDER BY count DESC
  `);
  console.table(eligibility.rows);

  // 7. Entity role breakdown
  console.log('\n7. ENTITY ROLE BREAKDOWN');
  console.log('-'.repeat(50));
  const roles = await client.query(`
    SELECT entity_role, COUNT(*) as count
    FROM cl.company_identity
    GROUP BY entity_role
    ORDER BY count DESC
  `);
  console.table(roles.rows);

  // 8. What SHOULD be in CL?
  console.log('\n8. CANDIDATE RECORDS FOR CLEANUP');
  console.log('-'.repeat(50));

  // Records that are FAIL and have no presence in outreach
  const failOrphans = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity ci
    WHERE ci.final_outcome = 'FAIL'
      AND NOT EXISTS (
        SELECT 1 FROM outreach.company_target ct
        WHERE ct.company_unique_id = ci.company_unique_id::text
      )
  `);
  console.log('FAIL records not in Outreach (potential cleanup):', failOrphans.rows[0].count);

  // Records with BLOCKED_NO_DOMAIN
  const blockedNoDomain = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity
    WHERE final_reason = 'BLOCKED_NO_DOMAIN'
  `);
  console.log('BLOCKED_NO_DOMAIN records:', blockedNoDomain.rows[0].count);

  // Records with EXCLUDED_POLICY (.edu/.gov/.mil)
  const excludedPolicy = await client.query(`
    SELECT COUNT(*) as count
    FROM cl.company_identity
    WHERE final_reason = 'EXCLUDED_POLICY'
  `);
  console.log('EXCLUDED_POLICY records:', excludedPolicy.rows[0].count);

  await client.end();
}

audit().catch(console.error);
