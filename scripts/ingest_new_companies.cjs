#!/usr/bin/env node
/**
 * Ingest NEW_COMPANIES_FOR_CLAY.csv into Company Lifecycle
 *
 * This script:
 * 1. Reads the CSV with multi-state companies
 * 2. Filters out duplicates (already in CL)
 * 3. Ingests new companies into cl.company_candidate
 * 4. Maps Source State to state_code
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Use Doppler for secrets: doppler run -- node scripts/ingest_new_companies.cjs
const CONNECTION_STRING = process.env.VITE_DATABASE_URL;

if (!CONNECTION_STRING) {
  console.error('ERROR: VITE_DATABASE_URL not set. Run with: doppler run -- node scripts/ingest_new_companies.cjs');
  process.exit(1);
}

// State name to code mapping
const STATE_MAP = {
  'Delaware': 'DE',
  'Virginia': 'VA',
  'Maryland': 'MD',
  'Pennsylvania': 'PA',
  'Ohio': 'OH',
  'North Carolina': 'NC',
  'Kentucky': 'KY',
  'West Virginia': 'WV',
  'Oklahoma': 'OK',
};

function getStateCode(sourceState) {
  if (!sourceState) return null;
  const normalized = sourceState.trim();
  return STATE_MAP[normalized] || null;
}

function normalizeDomain(domain) {
  if (!domain) return null;
  let normalized = String(domain).trim().toLowerCase();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^www\./, '');
  normalized = normalized.split('/')[0];
  return normalized.includes('.') ? normalized : null;
}

async function main() {
  const csvPath = process.argv[2] || 'c:/Users/CUSTOM PC/Desktop/Clay Tables/NEW_COMPANIES_FOR_CLAY.csv';
  const dryRun = process.argv.includes('--dry-run');

  console.log('═'.repeat(70));
  console.log('COMPANY LIFECYCLE - MULTI-STATE INGESTION');
  console.log('═'.repeat(70));
  console.log(`File: ${csvPath}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('═'.repeat(70));

  // Read CSV
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  });

  console.log(`\nTotal rows in CSV: ${rows.length}`);

  // Connect to database
  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  const ingestionRunId = `RUN-MULTI-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  console.log(`Ingestion Run ID: ${ingestionRunId}`);

  const results = {
    total: rows.length,
    skippedDuplicate: 0,
    skippedNoState: 0,
    skippedContract: 0,
    inserted: 0,
    errors: [],
    byState: {},
  };

  try {
    // Get existing LinkedIn URLs to filter duplicates
    console.log('\nFetching existing LinkedIn URLs from CL...');
    const existingLinkedIn = await pool.query(
      'SELECT linkedin_company_url FROM cl.company_identity WHERE linkedin_company_url IS NOT NULL'
    );
    const existingLinkedInSet = new Set(existingLinkedIn.rows.map(r => r.linkedin_company_url));
    console.log(`Found ${existingLinkedInSet.size} existing LinkedIn URLs`);

    // Get existing domains
    const existingDomains = await pool.query(
      'SELECT company_domain FROM cl.company_identity WHERE company_domain IS NOT NULL'
    );
    const existingDomainSet = new Set(existingDomains.rows.map(r => r.company_domain));
    console.log(`Found ${existingDomainSet.size} existing domains`);

    console.log('\n' + '─'.repeat(70));
    console.log('INGESTING COMPANIES');
    console.log('─'.repeat(70));

    let processed = 0;
    for (const row of rows) {
      processed++;

      const companyName = row['Company Name'] || row['Name'];
      const domain = normalizeDomain(row['Domain']);
      const linkedin = row['LinkedIn URL'];
      const sourceState = row['Source State'];
      const stateCode = getStateCode(sourceState);

      // Contract validation
      if (!companyName || companyName.trim().length === 0) {
        results.skippedContract++;
        results.errors.push({ row: processed, reason: 'Missing company name' });
        continue;
      }

      if (!domain && !linkedin) {
        results.skippedContract++;
        results.errors.push({ row: processed, name: companyName, reason: 'Missing both domain and LinkedIn' });
        continue;
      }

      // State validation
      if (!stateCode) {
        results.skippedNoState++;
        results.errors.push({ row: processed, name: companyName, reason: `Unknown state: ${sourceState}` });
        continue;
      }

      // Duplicate check
      if (linkedin && existingLinkedInSet.has(linkedin)) {
        results.skippedDuplicate++;
        continue;
      }

      if (domain && existingDomainSet.has(domain)) {
        results.skippedDuplicate++;
        continue;
      }

      // Generate source record ID
      let sourceRecordId;
      if (domain) {
        sourceRecordId = `${stateCode}-DOM-${domain.replace(/\./g, '-')}`;
      } else if (linkedin) {
        const slug = linkedin.split('/company/')[1]?.replace(/\/$/, '') || '';
        sourceRecordId = `${stateCode}-LI-${slug}`;
      } else {
        sourceRecordId = `${stateCode}-ROW-${processed}`;
      }

      // Build raw payload
      const rawPayload = {
        company_name: companyName.trim(),
        company_domain: domain,
        linkedin_url: linkedin,
        primary_industry: row['Primary Industry'] || null,
        size: row['Size'] || null,
        location: row['Location'] || null,
        source_state: sourceState,
      };

      if (!dryRun) {
        try {
          const insertQuery = `
            INSERT INTO cl.company_candidate (
              source_system,
              source_record_id,
              state_code,
              raw_payload,
              ingestion_run_id,
              verification_status
            )
            VALUES ($1, $2, $3, $4, $5, 'PENDING')
            ON CONFLICT (source_system, source_record_id) DO NOTHING
            RETURNING candidate_id
          `;

          const result = await pool.query(insertQuery, [
            `CLAY_MULTI_${stateCode}`,
            sourceRecordId,
            stateCode,
            JSON.stringify(rawPayload),
            ingestionRunId,
          ]);

          if (result.rows.length > 0) {
            results.inserted++;
            results.byState[stateCode] = (results.byState[stateCode] || 0) + 1;

            // Add to sets to prevent duplicates within this run
            if (domain) existingDomainSet.add(domain);
            if (linkedin) existingLinkedInSet.add(linkedin);
          }
        } catch (err) {
          results.errors.push({ row: processed, name: companyName, reason: err.message });
        }
      } else {
        results.inserted++;
        results.byState[stateCode] = (results.byState[stateCode] || 0) + 1;
      }

      // Progress logging
      if (processed % 500 === 0) {
        console.log(`Progress: ${processed}/${rows.length} processed, ${results.inserted} inserted`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('INGESTION COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\n📊 SUMMARY`);
    console.log(`   Total in CSV:          ${results.total}`);
    console.log(`   Skipped (duplicate):   ${results.skippedDuplicate}`);
    console.log(`   Skipped (no state):    ${results.skippedNoState}`);
    console.log(`   Skipped (contract):    ${results.skippedContract}`);
    console.log(`   ────────────────────────────────`);
    console.log(`   INSERTED:              ${results.inserted}`);

    console.log(`\n📍 BY STATE:`);
    for (const [state, count] of Object.entries(results.byState).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${state}: ${count}`);
    }

    if (results.errors.length > 0 && results.errors.length <= 20) {
      console.log(`\n⚠ Errors (${results.errors.length}):`);
      results.errors.forEach((e, i) => {
        console.log(`   ${i + 1}. Row ${e.row}: ${e.name || '(no name)'} - ${e.reason}`);
      });
    } else if (results.errors.length > 20) {
      console.log(`\n⚠ Errors: ${results.errors.length} (showing first 10)`);
      results.errors.slice(0, 10).forEach((e, i) => {
        console.log(`   ${i + 1}. Row ${e.row}: ${e.name || '(no name)'} - ${e.reason}`);
      });
    }

    console.log('\n' + '═'.repeat(70));
    if (!dryRun) {
      console.log(`\nNEXT STEP: Run verification and minting:`);
      console.log(`   node scripts/verify_and_mint.cjs "${ingestionRunId}"`);
    } else {
      console.log(`\nDRY RUN COMPLETE - No data was written`);
      console.log(`To run for real, remove --dry-run flag`);
    }
    console.log('═'.repeat(70));

    return results;

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
