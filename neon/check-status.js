// Quick verification status check
const { Client } = require('pg');

async function checkStatus() {
  const client = new Client({
    connectionString: process.env.VITE_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const status = await client.query(`
      SELECT
        CASE
          WHEN existence_verified IS NULL THEN 'PENDING'
          WHEN existence_verified = TRUE THEN 'PASS'
          ELSE 'FAIL'
        END as status,
        COUNT(*) as count
      FROM cl.company_identity
      GROUP BY 1
      ORDER BY 1
    `);

    console.log('\n=== EXISTENCE VERIFICATION STATUS ===\n');
    console.table(status.rows);

    const total = status.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    const pending = status.rows.find(r => r.status === 'PENDING');
    const pass = status.rows.find(r => r.status === 'PASS');
    const fail = status.rows.find(r => r.status === 'FAIL');

    const pendingCount = pending ? parseInt(pending.count) : 0;
    const passCount = pass ? parseInt(pass.count) : 0;
    const failCount = fail ? parseInt(fail.count) : 0;
    const processed = passCount + failCount;
    const percentComplete = ((processed / total) * 100).toFixed(1);

    console.log(`Total: ${total.toLocaleString()}`);
    console.log(`Processed: ${processed.toLocaleString()} (${percentComplete}%)`);
    console.log(`Remaining: ${pendingCount.toLocaleString()}`);
    console.log(`Pass Rate: ${passCount > 0 ? ((passCount / processed) * 100).toFixed(1) : 0}%`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkStatus();
