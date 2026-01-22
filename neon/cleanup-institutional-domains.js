// Cleanup institutional domains - keep main institution, delete subdivisions
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function analyzeInstitutionalDomains() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('INSTITUTIONAL DOMAIN ANALYSIS');
    console.log('='.repeat(70));

    // Get all domains with multiple companies (potential institutions)
    const multiCompanyDomains = await client.query(`
      SELECT
        company_domain,
        COUNT(*) as company_count
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL
        AND company_domain != ''
      GROUP BY company_domain
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 50
    `);

    console.log(`\nFound ${multiCompanyDomains.rows.length} domains with multiple companies`);
    console.log('\nTop collision domains:');
    console.table(multiCompanyDomains.rows.slice(0, 20));

    // For each major domain, show the companies
    const topDomains = multiCompanyDomains.rows.slice(0, 15);

    for (const row of topDomains) {
      const domain = row.company_domain;
      console.log('\n' + '-'.repeat(70));
      console.log(`DOMAIN: ${domain} (${row.company_count} companies)`);
      console.log('-'.repeat(70));

      const companies = await client.query(`
        SELECT
          company_unique_id,
          company_name,
          linkedin_company_url,
          created_at,
          LENGTH(company_name) as name_length
        FROM cl.company_identity
        WHERE company_domain = $1
        ORDER BY LENGTH(company_name) ASC, created_at ASC
        LIMIT 20
      `, [domain]);

      console.table(companies.rows.map(r => ({
        id: r.company_unique_id.substring(0, 8) + '...',
        name: r.company_name.substring(0, 60),
        name_length: r.name_length
      })));

      // Suggest which one to keep (shortest name usually = main institution)
      console.log(`  SUGGESTED KEEPER: "${companies.rows[0].company_name}"`);
    }

    // Summary stats
    const totalToDelete = await client.query(`
      WITH domain_counts AS (
        SELECT company_domain, COUNT(*) as cnt
        FROM cl.company_identity
        WHERE company_domain IS NOT NULL AND company_domain != ''
        GROUP BY company_domain
        HAVING COUNT(*) > 1
      )
      SELECT SUM(cnt - 1) as deletable_count
      FROM domain_counts
    `);

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total companies that would be deleted: ${parseInt(totalToDelete.rows[0].deletable_count).toLocaleString()}`);
    console.log(`(Keeping 1 per domain, deleting the rest)`);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

analyzeInstitutionalDomains();
