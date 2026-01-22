// Explore outreach.company_target structure for reconciliation
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

async function explore() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('='.repeat(70));
  console.log('OUTREACH.COMPANY_TARGET EXPLORATION');
  console.log('='.repeat(70));

  // Get company_target columns
  const columns = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'outreach' AND table_name = 'company_target'
    ORDER BY ordinal_position
  `);
  console.log('\noutreach.company_target columns:');
  console.table(columns.rows);

  // Get row count
  const count = await client.query(`SELECT COUNT(*) as cnt FROM outreach.company_target`);
  console.log('\nTotal rows in outreach.company_target:', count.rows[0].cnt);

  // Check if sovereign_company_id or CL link exists
  const clLinkCheck = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'outreach' AND table_name = 'company_target'
      AND column_name ILIKE '%sovereign%' OR column_name ILIKE '%cl_%'
  `);
  console.log('\nSovereign/CL link columns:');
  if (clLinkCheck.rows.length === 0) {
    console.log('  (None found - will need to add)');
  } else {
    console.table(clLinkCheck.rows);
  }

  // Sample data
  const sample = await client.query(`
    SELECT * FROM outreach.company_target LIMIT 3
  `);
  console.log('\nSample rows:');
  console.table(sample.rows);

  // Check for any lifecycle_state column
  const lifecycleCol = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'outreach' AND table_name = 'company_target'
      AND column_name ILIKE '%lifecycle%' OR column_name ILIKE '%state%' OR column_name ILIKE '%status%'
  `);
  console.log('\nLifecycle/state columns:');
  console.table(lifecycleCol.rows);

  // Check for common ID columns that might match CL
  const idColumns = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'outreach' AND table_name = 'company_target'
      AND (column_name ILIKE '%id%' OR column_name ILIKE '%domain%' OR column_name ILIKE '%linkedin%')
  `);
  console.log('\nID/Domain/LinkedIn columns:');
  console.table(idColumns.rows);

  // Compare with CL promotable view
  const promotable = await client.query(`SELECT COUNT(*) as cnt FROM cl.v_company_promotable`);
  console.log('\nCL promotable companies:', promotable.rows[0].cnt);

  // Check domain overlap
  const domainOverlap = await client.query(`
    SELECT COUNT(DISTINCT ct.company_domain) as overlap_count
    FROM outreach.company_target ct
    JOIN cl.v_company_promotable vp ON LOWER(ct.company_domain) = LOWER(vp.company_domain)
    WHERE ct.company_domain IS NOT NULL AND ct.company_domain != ''
  `);
  console.log('Domain overlap between Outreach and CL promotable:', domainOverlap.rows[0].overlap_count);

  await client.end();
}

explore().catch(console.error);
