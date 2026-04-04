// Cleanup domain collisions - two strategies:
// 1. BAD DATA domains (gov/mil/edu used by random companies): Clear the domain
// 2. TRUE INSTITUTIONAL domains: Keep main institution, delete subdivisions
import pg from 'pg';
import readline from 'readline';

const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

// Domains known to be bad data (random companies incorrectly assigned)
const BAD_DATA_DOMAINS = [
  'http://aeroleads.com',      // Lead scraper default
  'http://nih.gov',            // Random companies using NIH
  'http://navy.mil',           // Random companies using Navy
  'http://dot.gov',            // Trucking companies using DOT
  'http://ny.gov',             // Random companies
  'http://ohio.gov',
  'http://ca.gov',
  'http://virginia.gov',
  'http://justice.gov',
  'http://treasury.gov',
  'http://dol.gov',
  'http://irs.gov',
  'http://furnitureexpertsmovers.com',  // Spam domain
  'http://capitolhillmovers.com',       // Spam domain
  'http://visitingangels.com',          // Franchise misuse
];

// True institutional domains - keep the main one, delete subdivisions
const INSTITUTIONAL_DOMAINS = [
  'http://psu.edu',
  'http://osu.edu',
  'http://umd.edu',
  'http://kyschools.us',
  'http://marriott.com',
  'http://hilton.com',
];

async function cleanupDomainCollisions() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('DOMAIN COLLISION CLEANUP');
    console.log('='.repeat(70));

    // Get before counts
    const beforeCompanies = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity`);
    const beforeCollisions = await client.query(`
      SELECT COUNT(*) as cnt FROM (
        SELECT company_domain FROM cl.company_identity
        WHERE company_domain IS NOT NULL AND company_domain != ''
        GROUP BY company_domain HAVING COUNT(*) > 1
      ) x
    `);
    console.log(`\n[BEFORE] Companies: ${parseInt(beforeCompanies.rows[0].cnt).toLocaleString()}`);
    console.log(`[BEFORE] Collision domains: ${parseInt(beforeCollisions.rows[0].cnt).toLocaleString()}`);

    // =========================================================================
    // PHASE 1: Clean BAD DATA domains (clear the domain field)
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('PHASE 1: BAD DATA DOMAINS (clearing invalid domain assignments)');
    console.log('='.repeat(70));

    let totalDomainCleared = 0;
    for (const domain of BAD_DATA_DOMAINS) {
      const count = await client.query(`
        SELECT COUNT(*) as cnt FROM cl.company_identity WHERE company_domain = $1
      `, [domain]);

      if (parseInt(count.rows[0].cnt) > 0) {
        console.log(`\n  ${domain}: ${count.rows[0].cnt} companies`);

        // Clear the domain for these companies (keep the companies, just remove bad domain)
        const updated = await client.query(`
          UPDATE cl.company_identity
          SET company_domain = NULL
          WHERE company_domain = $1
          RETURNING company_unique_id
        `, [domain]);

        console.log(`    -> Cleared domain for ${updated.rowCount} companies`);
        totalDomainCleared += updated.rowCount;
      }
    }
    console.log(`\n[PHASE 1 COMPLETE] Cleared bad domains from ${totalDomainCleared} companies`);

    // =========================================================================
    // PHASE 2: Clean INSTITUTIONAL domains (keep main, delete subdivisions)
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('PHASE 2: INSTITUTIONAL DOMAINS (keeping main institution)');
    console.log('='.repeat(70));

    let totalDeleted = 0;
    for (const domain of INSTITUTIONAL_DOMAINS) {
      const companies = await client.query(`
        SELECT company_unique_id, company_name, created_at
        FROM cl.company_identity
        WHERE company_domain = $1
        ORDER BY LENGTH(company_name) ASC, created_at ASC
      `, [domain]);

      if (companies.rows.length > 1) {
        const keeper = companies.rows[0];
        const toDelete = companies.rows.slice(1);

        console.log(`\n  ${domain}: ${companies.rows.length} companies`);
        console.log(`    KEEPING: "${keeper.company_name}"`);
        console.log(`    DELETING: ${toDelete.length} subdivisions`);

        // Delete the subdivisions
        const deleteIds = toDelete.map(r => r.company_unique_id);

        // First delete related errors
        await client.query(`
          DELETE FROM cl.cl_errors WHERE company_unique_id = ANY($1)
        `, [deleteIds]);

        // Delete from sidecar tables
        await client.query(`DELETE FROM cl.company_names WHERE company_unique_id = ANY($1)`, [deleteIds]);
        await client.query(`DELETE FROM cl.company_domains WHERE company_unique_id = ANY($1)`, [deleteIds]);
        await client.query(`DELETE FROM cl.identity_confidence WHERE company_unique_id = ANY($1)`, [deleteIds]);

        // Delete the companies
        const deleted = await client.query(`
          DELETE FROM cl.company_identity WHERE company_unique_id = ANY($1)
          RETURNING company_unique_id
        `, [deleteIds]);

        console.log(`    -> Deleted ${deleted.rowCount} companies`);
        totalDeleted += deleted.rowCount;
      }
    }
    console.log(`\n[PHASE 2 COMPLETE] Deleted ${totalDeleted} subdivision companies`);

    // =========================================================================
    // PHASE 3: Handle remaining collision domains (>= 2 companies)
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('PHASE 3: REMAINING COLLISION DOMAINS');
    console.log('='.repeat(70));

    const remaining = await client.query(`
      SELECT company_domain, COUNT(*) as cnt
      FROM cl.company_identity
      WHERE company_domain IS NOT NULL AND company_domain != ''
      GROUP BY company_domain
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 30
    `);

    if (remaining.rows.length > 0) {
      console.log(`\n  ${remaining.rows.length} domains still have collisions:`);
      console.table(remaining.rows.slice(0, 15));

      // Ask if user wants to clean these too (keep shortest name per domain)
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise(resolve => {
        rl.question('\nClean remaining collisions (keep shortest name per domain)? (yes/no): ', resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'yes') {
        // For each remaining collision domain, keep the one with shortest name
        const allCollisionDomains = await client.query(`
          SELECT company_domain
          FROM cl.company_identity
          WHERE company_domain IS NOT NULL AND company_domain != ''
          GROUP BY company_domain
          HAVING COUNT(*) > 1
        `);

        let phase3Deleted = 0;
        for (const row of allCollisionDomains.rows) {
          const domain = row.company_domain;
          const companies = await client.query(`
            SELECT company_unique_id, company_name
            FROM cl.company_identity
            WHERE company_domain = $1
            ORDER BY LENGTH(company_name) ASC, created_at ASC
          `, [domain]);

          if (companies.rows.length > 1) {
            const deleteIds = companies.rows.slice(1).map(r => r.company_unique_id);

            // Delete related data
            await client.query(`DELETE FROM cl.cl_errors WHERE company_unique_id = ANY($1)`, [deleteIds]);
            await client.query(`DELETE FROM cl.company_names WHERE company_unique_id = ANY($1)`, [deleteIds]);
            await client.query(`DELETE FROM cl.company_domains WHERE company_unique_id = ANY($1)`, [deleteIds]);
            await client.query(`DELETE FROM cl.identity_confidence WHERE company_unique_id = ANY($1)`, [deleteIds]);

            const deleted = await client.query(`
              DELETE FROM cl.company_identity WHERE company_unique_id = ANY($1)
            `, [deleteIds]);

            phase3Deleted += deleted.rowCount;
          }
        }
        console.log(`\n[PHASE 3 COMPLETE] Deleted ${phase3Deleted} additional companies`);
        totalDeleted += phase3Deleted;
      }
    } else {
      console.log('\n  No remaining collision domains!');
    }

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '='.repeat(70));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(70));

    const afterCompanies = await client.query(`SELECT COUNT(*) as cnt FROM cl.company_identity`);
    const afterCollisions = await client.query(`
      SELECT COUNT(*) as cnt FROM (
        SELECT company_domain FROM cl.company_identity
        WHERE company_domain IS NOT NULL AND company_domain != ''
        GROUP BY company_domain HAVING COUNT(*) > 1
      ) x
    `);
    const afterErrors = await client.query(`SELECT COUNT(*) as cnt FROM cl.cl_errors WHERE resolved_at IS NULL`);

    console.log(`\n  Companies: ${parseInt(beforeCompanies.rows[0].cnt).toLocaleString()} -> ${parseInt(afterCompanies.rows[0].cnt).toLocaleString()}`);
    console.log(`  Collision domains: ${parseInt(beforeCollisions.rows[0].cnt).toLocaleString()} -> ${parseInt(afterCollisions.rows[0].cnt).toLocaleString()}`);
    console.log(`  Domains cleared (bad data): ${totalDomainCleared}`);
    console.log(`  Companies deleted: ${totalDeleted}`);
    console.log(`  Remaining unresolved errors: ${parseInt(afterErrors.rows[0].cnt).toLocaleString()}`);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

cleanupDomainCollisions();
