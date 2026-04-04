// Check error history - what was the original count?
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('ERROR COUNT HISTORY CHECK');
  console.log('='.repeat(70));

  // Total row count
  const total = await client.query(`SELECT COUNT(*) as cnt FROM cl.cl_errors`);
  console.log(`\nTotal rows in cl.cl_errors: ${total.rows[0].cnt}`);

  // Count distinct (company, pass, reason) combinations
  const distinctCombos = await client.query(`
    SELECT COUNT(*) as cnt FROM (
      SELECT DISTINCT company_unique_id, pass_name, failure_reason_code
      FROM cl.cl_errors
    ) x
  `);
  console.log(`Distinct (company, pass, reason) combos: ${distinctCombos.rows[0].cnt}`);

  // Check if all errors have unique combo (should be true if constraint worked)
  const dupeCheck = await client.query(`
    SELECT
      company_unique_id,
      pass_name,
      failure_reason_code,
      COUNT(*) as cnt
    FROM cl.cl_errors
    GROUP BY company_unique_id, pass_name, failure_reason_code
    HAVING COUNT(*) > 1
  `);
  console.log(`\nGroups with duplicates: ${dupeCheck.rows.length}`);

  // What are the null company_id errors?
  const nullCompany = await client.query(`
    SELECT pass_name, failure_reason_code, COUNT(*) as cnt
    FROM cl.cl_errors
    WHERE company_unique_id IS NULL
    GROUP BY pass_name, failure_reason_code
  `);
  console.log('\nErrors with NULL company_unique_id:');
  console.table(nullCompany.rows);

  // Timeline of when errors were created
  const timeline = await client.query(`
    SELECT
      DATE(created_at) as date,
      pass_name,
      COUNT(*) as created
    FROM cl.cl_errors
    GROUP BY DATE(created_at), pass_name
    ORDER BY date DESC, pass_name
  `);
  console.log('\nError creation timeline by pass:');
  console.table(timeline.rows);

  // Resolution timeline
  const resolutionTimeline = await client.query(`
    SELECT
      DATE(resolved_at) as date,
      pass_name,
      COUNT(*) as resolved
    FROM cl.cl_errors
    WHERE resolved_at IS NOT NULL
    GROUP BY DATE(resolved_at), pass_name
    ORDER BY date DESC, pass_name
  `);
  console.log('\nError resolution timeline by pass:');
  console.table(resolutionTimeline.rows);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const summary = await client.query(`
    SELECT
      pass_name,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved,
      COUNT(*) FILTER (WHERE company_unique_id IS NULL) as null_company
    FROM cl.cl_errors
    GROUP BY pass_name
    ORDER BY total DESC
  `);
  console.log('\nBy pass:');
  console.table(summary.rows);

  // The 11,000 number - what would that be?
  // Maybe it's unique companies, not total rows?
  const uniqueCompaniesUnresolved = await client.query(`
    SELECT COUNT(DISTINCT company_unique_id) as cnt
    FROM cl.cl_errors
    WHERE resolved_at IS NULL
  `);
  console.log(`\nUnique companies with UNRESOLVED errors: ${uniqueCompaniesUnresolved.rows[0].cnt}`);

  await client.end();
}

check().catch(console.error);
