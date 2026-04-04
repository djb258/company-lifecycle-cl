// Analyze cl.cl_errors for duplicates
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function analyze() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('ERROR TABLE DUPLICATE ANALYSIS');
  console.log('='.repeat(70));

  // Total count
  const total = await client.query(`SELECT COUNT(*) as cnt FROM cl.cl_errors`);
  console.log(`\nTotal errors: ${total.rows[0].cnt}`);

  // Check for duplicates by company + pass + reason
  const duplicates = await client.query(`
    SELECT
      company_unique_id,
      pass_name,
      failure_reason_code,
      COUNT(*) as cnt
    FROM cl.cl_errors
    GROUP BY company_unique_id, pass_name, failure_reason_code
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.log(`\nDuplicate groups (company + pass + reason): ${duplicates.rows.length}`);
  if (duplicates.rows.length > 0) {
    console.table(duplicates.rows.slice(0, 10));
  }

  // Total extra rows from duplicates
  const totalDupes = await client.query(`
    WITH dupe_counts AS (
      SELECT
        company_unique_id,
        pass_name,
        failure_reason_code,
        COUNT(*) as cnt
      FROM cl.cl_errors
      GROUP BY company_unique_id, pass_name, failure_reason_code
      HAVING COUNT(*) > 1
    )
    SELECT SUM(cnt - 1) as extra_rows FROM dupe_counts
  `);
  console.log(`\nTotal extra duplicate rows: ${totalDupes.rows[0].extra_rows || 0}`);

  // Check unique constraint
  const constraints = await client.query(`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_schema = 'cl' AND table_name = 'cl_errors'
  `);
  console.log('\nConstraints on cl.cl_errors:');
  console.table(constraints.rows);

  // Count by created_at date
  const byDate = await client.query(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as count
    FROM cl.cl_errors
    GROUP BY DATE(created_at)
    ORDER BY date DESC
    LIMIT 10
  `);
  console.log('\nErrors by creation date:');
  console.table(byDate.rows);

  // Unique companies with errors
  const uniqueCompanies = await client.query(`
    SELECT COUNT(DISTINCT company_unique_id) as cnt FROM cl.cl_errors
  `);
  console.log(`\nUnique companies with errors: ${uniqueCompanies.rows[0].cnt}`);

  // By pass and resolution status
  const byPassStatus = await client.query(`
    SELECT
      pass_name,
      COUNT(DISTINCT company_unique_id) as unique_companies,
      COUNT(*) as total_rows,
      COUNT(*) FILTER (WHERE resolved_at IS NULL) as unresolved_rows,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved_rows
    FROM cl.cl_errors
    GROUP BY pass_name
    ORDER BY total_rows DESC
  `);
  console.log('\nBy pass (companies vs rows):');
  console.table(byPassStatus.rows);

  // Sample duplicate - what does it look like?
  if (duplicates.rows.length > 0) {
    const sample = duplicates.rows[0];
    const sampleRows = await client.query(`
      SELECT error_id, created_at, resolved_at, inputs_snapshot->>'domain_error' as domain_error
      FROM cl.cl_errors
      WHERE company_unique_id = $1
        AND pass_name = $2
        AND failure_reason_code = $3
      ORDER BY created_at
    `, [sample.company_unique_id, sample.pass_name, sample.failure_reason_code]);
    console.log(`\nSample duplicate group (${sample.cnt} rows):`);
    console.table(sampleRows.rows);
  }

  await client.end();
}

analyze().catch(console.error);
