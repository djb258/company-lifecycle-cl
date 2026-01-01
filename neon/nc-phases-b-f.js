// NC Phases B-F: Full CL Pipeline Execution (OPTIMIZED WITH BATCH INSERTS)
// Loads NC companies and runs through hardened CL bootstrap

import XLSX from 'xlsx';
import pg from 'pg';

const { Client } = pg;

const SOURCE_FILE = 'C:/Users/CUSTOMER PC/Downloads/Companies NC.xlsx';
const connectionString = process.env.VITE_DATABASE_URL ||
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech/Marketing%20DB?sslmode=require';

const LIFECYCLE_RUN_ID = `RUN-NC-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const BATCH_SIZE = 500;

async function runNCPipeline() {
  const client = new Client({ connectionString });

  const audit = {
    lifecycle_run_id: LIFECYCLE_RUN_ID,
    timestamp: new Date().toISOString(),
    state: 'NC',
    counts: { file: 0, gateZeroPass: 0, gateZeroFail: 0, sourceLoaded: 0, staged: 0, minted: 0, bridged: 0, errors: 0 }
  };

  try {
    await client.connect();
    console.log('========================================');
    console.log('NC COMPANY LIFECYCLE PIPELINE (OPTIMIZED)');
    console.log('========================================');
    console.log('Lifecycle Run ID:', LIFECYCLE_RUN_ID);
    console.log('Batch size:', BATCH_SIZE);
    console.log('');

    // =============================================
    // LOAD AND VALIDATE EXCEL
    // =============================================
    console.log('Loading Excel file...');
    const workbook = XLSX.readFile(SOURCE_FILE);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    audit.counts.file = data.length;
    console.log('Total rows:', data.length);

    const passRows = [];
    const failRows = [];

    for (const row of data) {
      const companyName = row['Name'] ? String(row['Name']).trim() : null;
      const domain = row['Domain'] ? String(row['Domain']).trim() : null;
      const linkedin = row['LinkedIn URL'] ? String(row['LinkedIn URL']).trim() : null;
      const location = row['Location'] ? String(row['Location']).trim() : null;
      const industry = row['Primary Industry'] ? String(row['Primary Industry']).trim() : null;
      const size = row['Size'] ? String(row['Size']).trim() : null;

      const isNC = location && (/,\s*NC\b/i.test(location) || /NC$/i.test(location.trim()) ||
        location.toUpperCase().includes('NORTH CAROLINA'));
      const hasAnchor = domain || linkedin;
      const hasName = companyName && companyName.length > 0;

      const reasons = [];
      if (!hasName) reasons.push('MISSING_COMPANY_NAME');
      if (!isNC) reasons.push('STATE_NOT_NC');
      if (!hasAnchor) reasons.push('MISSING_IDENTITY_ANCHOR');

      const record = {
        company_name: companyName,
        company_domain: domain,
        linkedin_company_url: linkedin,
        location: location,
        industry: industry,
        employee_size: size,
        failure_reasons: reasons
      };

      if (reasons.length === 0) passRows.push(record);
      else failRows.push(record);
    }

    audit.counts.gateZeroPass = passRows.length;
    audit.counts.gateZeroFail = failRows.length;
    console.log('Gate Zero PASS:', passRows.length);
    console.log('Gate Zero FAIL:', failRows.length);

    // =============================================
    // PHASE B: BATCH SOURCE LOAD
    // =============================================
    console.log('\n========================================');
    console.log('PHASE B: Source Load (BATCH INSERT)');
    console.log('========================================');

    // Get existing domains/linkedins to skip duplicates
    const existingDomains = new Set();
    const existingLinkedins = new Set();

    const existingRes = await client.query(`
      SELECT website_url, linkedin_url FROM company.company_master
      WHERE state_abbrev = 'NC' OR import_batch_id LIKE 'nc_import_%'
    `);
    for (const r of existingRes.rows) {
      if (r.website_url) existingDomains.add(r.website_url.toLowerCase());
      if (r.linkedin_url) existingLinkedins.add(r.linkedin_url.toLowerCase());
    }
    console.log('Existing NC records to skip:', existingRes.rowCount);

    // Filter out duplicates and prepare batch
    const newRows = [];
    for (const row of passRows) {
      const domainUrl = row.company_domain ? `http://${row.company_domain.replace(/^https?:\/\//, '')}` : null;
      const linkedinUrl = row.linkedin_company_url;

      const domainExists = domainUrl && existingDomains.has(domainUrl.toLowerCase());
      const linkedinExists = linkedinUrl && existingLinkedins.has(linkedinUrl.toLowerCase());

      if (!domainExists && !linkedinExists) {
        newRows.push(row);
        if (domainUrl) existingDomains.add(domainUrl.toLowerCase());
        if (linkedinUrl) existingLinkedins.add(linkedinUrl.toLowerCase());
      }
    }
    console.log('New records to insert:', newRows.length);

    // Batch insert
    let sourceLoadedCount = 0;
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        // Format: 04.04.01.XX.XXXXX.XXX (state code 37 for NC)
        const globalIdx = i + j;
        const seqHigh = Math.floor(globalIdx / 1000).toString().padStart(5, '0');
        const seqLow = (globalIdx % 1000).toString().padStart(3, '0');
        const newSourceId = `04.04.01.37.${seqHigh}.${seqLow}`;

        let employeeCount = 50;
        if (row.employee_size) {
          const match = row.employee_size.match(/(\d+)/);
          if (match) employeeCount = Math.max(parseInt(match[1]), 50);
        }

        const domainUrl = row.company_domain ? `http://${row.company_domain.replace(/^https?:\/\//, '')}` : null;
        const city = row.location ? row.location.split(',')[0].trim() : null;

        values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6}, $${paramIdx+7}, $${paramIdx+8}, $${paramIdx+9}, $${paramIdx+10}, now(), now())`);
        params.push(newSourceId, row.company_name, domainUrl, row.linkedin_company_url, row.industry, employeeCount, 'NC', city, 'clay', `CLAY-NC-${i+j}`, `nc_import_${LIFECYCLE_RUN_ID}`);
        paramIdx += 11;
      }

      await client.query(`
        INSERT INTO company.company_master (
          company_unique_id, company_name, website_url, linkedin_url, industry,
          employee_count, address_state, address_city, source_system, source_record_id, import_batch_id, created_at, updated_at
        ) VALUES ${values.join(', ')}
      `, params);

      sourceLoadedCount += batch.length;
      console.log(`  Batch ${Math.floor(i/BATCH_SIZE) + 1}: inserted ${batch.length} (total: ${sourceLoadedCount})`);
    }

    audit.counts.sourceLoaded = sourceLoadedCount;
    console.log('Phase B complete:', sourceLoadedCount, 'records');

    // =============================================
    // PHASE C: CL STAGING (BULK)
    // =============================================
    console.log('\n========================================');
    console.log('PHASE C: CL Staging Copy (BULK)');
    console.log('========================================');

    const stagingResult = await client.query(`
      INSERT INTO cl.company_lifecycle_identity_staging (
        source_company_id, source_system, company_name, company_domain,
        linkedin_company_url, company_state, company_fingerprint,
        eligibility_status, lifecycle_run_id, staged_at
      )
      SELECT
        cm.company_unique_id, 'clay', cm.company_name,
        REGEXP_REPLACE(cm.website_url, '^https?://(www\\.)?', ''),
        cm.linkedin_url, 'NC',
        LOWER(COALESCE(TRIM(REGEXP_REPLACE(cm.website_url, '^https?://(www\\.)?', '')), '')) || '|' || LOWER(COALESCE(TRIM(cm.linkedin_url), '')),
        'ELIGIBLE', $1, now()
      FROM company.company_master cm
      WHERE cm.import_batch_id = $2
        AND cm.company_unique_id NOT IN (SELECT source_company_id FROM cl.company_lifecycle_identity_staging)
      RETURNING staging_id
    `, [LIFECYCLE_RUN_ID, `nc_import_${LIFECYCLE_RUN_ID}`]);

    audit.counts.staged = stagingResult.rowCount;
    console.log('Phase C complete:', stagingResult.rowCount, 'staged');

    // =============================================
    // PHASE D: SOVEREIGN ID MINT (BULK)
    // =============================================
    console.log('\n========================================');
    console.log('PHASE D: Sovereign ID Mint (BULK)');
    console.log('========================================');

    // Get existing fingerprints
    const existingFp = new Set();
    const fpRes = await client.query('SELECT company_fingerprint FROM cl.company_identity');
    for (const r of fpRes.rows) existingFp.add(r.company_fingerprint);

    // Get eligible staging rows
    const eligible = await client.query(`
      SELECT staging_id, source_company_id, company_name, company_domain,
             linkedin_company_url, company_fingerprint, source_system
      FROM cl.company_lifecycle_identity_staging
      WHERE eligibility_status = 'ELIGIBLE' AND lifecycle_run_id = $1 AND processed_at IS NULL
    `, [LIFECYCLE_RUN_ID]);

    console.log('Eligible for minting:', eligible.rowCount);

    // Batch mint new identities
    const toMint = eligible.rows.filter(r => !existingFp.has(r.company_fingerprint));
    console.log('New fingerprints to mint:', toMint.length);

    for (let i = 0; i < toMint.length; i += BATCH_SIZE) {
      const batch = toMint.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const row of batch) {
        values.push(`(gen_random_uuid(), $${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, now())`);
        params.push(row.company_name, row.company_domain, row.linkedin_company_url, row.company_fingerprint, row.source_system, LIFECYCLE_RUN_ID);
        paramIdx += 6;
      }

      await client.query(`
        INSERT INTO cl.company_identity (
          company_unique_id, company_name, company_domain, linkedin_company_url,
          company_fingerprint, source_system, lifecycle_run_id, created_at
        ) VALUES ${values.join(', ')}
      `, params);

      console.log(`  Mint batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} identities`);
    }

    audit.counts.minted = toMint.length;

    // Batch create bridges
    const bridgeResult = await client.query(`
      INSERT INTO cl.company_identity_bridge (source_company_id, company_sov_id, source_system, lifecycle_run_id, minted_at, minted_by)
      SELECT s.source_company_id, i.company_unique_id, s.source_system, $1, now(), 'nc_pipeline'
      FROM cl.company_lifecycle_identity_staging s
      JOIN cl.company_identity i ON s.company_fingerprint = i.company_fingerprint
      WHERE s.lifecycle_run_id = $1
        AND s.source_company_id NOT IN (SELECT source_company_id FROM cl.company_identity_bridge)
      RETURNING bridge_id
    `, [LIFECYCLE_RUN_ID]);

    audit.counts.bridged = bridgeResult.rowCount;
    console.log('Bridges created:', bridgeResult.rowCount);

    // Mark staging as processed
    await client.query(`
      UPDATE cl.company_lifecycle_identity_staging SET processed_at = now()
      WHERE lifecycle_run_id = $1 AND processed_at IS NULL
    `, [LIFECYCLE_RUN_ID]);

    console.log('Phase D complete');

    // =============================================
    // PHASE E: ERROR ROUTING (BATCH)
    // =============================================
    console.log('\n========================================');
    console.log('PHASE E: Error Routing (BATCH)');
    console.log('========================================');

    if (failRows.length > 0) {
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (let i = 0; i < failRows.length; i++) {
        const row = failRows[i];
        values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, now(), now())`);
        params.push(
          `NC-FAIL-${i}`, 'GATE_ZERO_INTAKE', row.failure_reasons.join(','),
          JSON.stringify({ company_name: row.company_name, domain: row.company_domain, linkedin: row.linkedin_company_url }),
          'ACTIVE', LIFECYCLE_RUN_ID
        );
        paramIdx += 6;
      }

      await client.query(`
        INSERT INTO cl.company_lifecycle_error (
          source_company_id, failure_stage, failure_reason, failure_details, status, lifecycle_run_id, created_at, updated_at
        ) VALUES ${values.join(', ')}
      `, params);
    }

    audit.counts.errors = failRows.length;
    console.log('Phase E complete:', failRows.length, 'errors routed');

    // =============================================
    // PHASE F: AUDIT & VERDICT
    // =============================================
    console.log('\n========================================');
    console.log('PHASE F: Audit & Verdict');
    console.log('========================================');

    const final = {
      source: (await client.query(`SELECT COUNT(*) FROM company.company_master WHERE import_batch_id = $1`, [`nc_import_${LIFECYCLE_RUN_ID}`])).rows[0].count,
      staged: (await client.query(`SELECT COUNT(*) FROM cl.company_lifecycle_identity_staging WHERE lifecycle_run_id = $1`, [LIFECYCLE_RUN_ID])).rows[0].count,
      identity: (await client.query(`SELECT COUNT(*) FROM cl.company_identity WHERE lifecycle_run_id = $1`, [LIFECYCLE_RUN_ID])).rows[0].count,
      bridge: (await client.query(`SELECT COUNT(*) FROM cl.company_identity_bridge WHERE lifecycle_run_id = $1`, [LIFECYCLE_RUN_ID])).rows[0].count,
      errors: (await client.query(`SELECT COUNT(*) FROM cl.company_lifecycle_error WHERE lifecycle_run_id = $1`, [LIFECYCLE_RUN_ID])).rows[0].count
    };

    console.log('\n┌─────────────────────────────────────────┐');
    console.log('│         NC PIPELINE AUDIT REPORT        │');
    console.log('├─────────────────────────────────────────┤');
    console.log(`│ Run ID: ${LIFECYCLE_RUN_ID}  │`);
    console.log('├──────────────────────┬──────────────────┤');
    console.log(`│ Excel File           │ ${String(audit.counts.file).padStart(16)} │`);
    console.log(`│ Gate Zero PASS       │ ${String(audit.counts.gateZeroPass).padStart(16)} │`);
    console.log(`│ Gate Zero FAIL       │ ${String(audit.counts.gateZeroFail).padStart(16)} │`);
    console.log(`│ Source Loaded        │ ${String(final.source).padStart(16)} │`);
    console.log(`│ Staged               │ ${String(final.staged).padStart(16)} │`);
    console.log(`│ Minted               │ ${String(final.identity).padStart(16)} │`);
    console.log(`│ Bridged              │ ${String(final.bridge).padStart(16)} │`);
    console.log(`│ Errors               │ ${String(final.errors).padStart(16)} │`);
    console.log('└──────────────────────┴──────────────────┘');

    const total = parseInt(final.staged) + parseInt(final.errors);
    console.log(total === audit.counts.file ? '\n✅ VERDICT: SUCCESS - All records accounted' : `\n⚠️ VERDICT: DELTA ${audit.counts.file - total}`);

    return audit;

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runNCPipeline();
