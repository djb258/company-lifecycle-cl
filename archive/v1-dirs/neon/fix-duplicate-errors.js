// cl.cl_errors Deduplication Fix
// Purpose: Remove duplicate errors, keeping the oldest occurrence per company+pass+reason
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function fixDuplicateErrors() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(70));
    console.log('CL.CL_ERRORS DEDUPLICATION FIX');
    console.log('='.repeat(70));

    // 1. Count before
    const before = await client.query(`SELECT COUNT(*) as total FROM cl.cl_errors`);
    console.log(`\n[BEFORE] Total errors: ${parseInt(before.rows[0].total).toLocaleString()}`);

    // 2. Count duplicates to be removed
    const dupCount = await client.query(`
      SELECT COUNT(*) as excess_rows FROM (
        SELECT error_id,
               ROW_NUMBER() OVER (
                 PARTITION BY company_unique_id, pass_name, failure_reason_code
                 ORDER BY created_at ASC, error_id ASC
               ) as rn
        FROM cl.cl_errors
        WHERE company_unique_id IS NOT NULL
      ) ranked
      WHERE rn > 1
    `);
    console.log(`[ANALYSIS] Duplicate rows to remove: ${parseInt(dupCount.rows[0].excess_rows).toLocaleString()}`);

    // 3. Preview what will be kept vs removed by pass
    console.log('\n[PREVIEW] After deduplication by pass:');
    const preview = await client.query(`
      WITH deduped AS (
        SELECT DISTINCT ON (company_unique_id, pass_name, failure_reason_code)
               error_id, pass_name
        FROM cl.cl_errors
        WHERE company_unique_id IS NOT NULL
        ORDER BY company_unique_id, pass_name, failure_reason_code, created_at ASC
      )
      SELECT pass_name, COUNT(*) as unique_errors
      FROM deduped
      GROUP BY pass_name
      ORDER BY unique_errors DESC
    `);
    console.table(preview.rows);

    // Also count NULL company_unique_id errors (these won't be deduped)
    const nullCount = await client.query(`
      SELECT COUNT(*) as count FROM cl.cl_errors WHERE company_unique_id IS NULL
    `);
    console.log(`Errors with NULL company_unique_id (kept as-is): ${nullCount.rows[0].count}`);

    // 4. Ask for confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\nProceed with deduplication? (yes/no): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('Aborted. No changes made.');
      return;
    }

    // 5. Execute deduplication - DELETE duplicates, keep oldest
    console.log('\n[EXECUTING] Removing duplicates...');

    const deleteResult = await client.query(`
      WITH duplicates AS (
        SELECT error_id,
               ROW_NUMBER() OVER (
                 PARTITION BY company_unique_id, pass_name, failure_reason_code
                 ORDER BY created_at ASC, error_id ASC
               ) as rn
        FROM cl.cl_errors
        WHERE company_unique_id IS NOT NULL
      )
      DELETE FROM cl.cl_errors
      WHERE error_id IN (
        SELECT error_id FROM duplicates WHERE rn > 1
      )
    `);

    console.log(`[DELETED] ${deleteResult.rowCount.toLocaleString()} duplicate rows removed`);

    // 6. Count after
    const after = await client.query(`SELECT COUNT(*) as total FROM cl.cl_errors`);
    console.log(`\n[AFTER] Total errors: ${parseInt(after.rows[0].total).toLocaleString()}`);

    // 7. Final breakdown
    console.log('\n[FINAL] Errors by pass:');
    const finalBreakdown = await client.query(`
      SELECT pass_name, COUNT(*) as count
      FROM cl.cl_errors
      GROUP BY pass_name
      ORDER BY count DESC
    `);
    console.table(finalBreakdown.rows);

    console.log('\n' + '='.repeat(70));
    console.log('DEDUPLICATION COMPLETE');
    console.log('='.repeat(70) + '\n');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await client.end();
  }
}

fixDuplicateErrors();
