#!/usr/bin/env node
/**
 * Hunter DOL Enrichment Ingestion
 *
 * Standalone ingestion for multi-state DOL Form 5500 data enriched with Hunter domains.
 * Federal source — state_code read from each CSV row (not adapter-fixed).
 *
 * WHY STANDALONE:
 *   StateCsvSourceAdapter enforces one fixed state_code per adapter.
 *   DOL Form 5500 is a federal dataset spanning multiple states.
 *   This script uses IntakeService directly — same table, same downstream pipeline.
 *
 * FLOW:
 *   1. Load existing domains from cl.company_identity (skip set)
 *   2. Parse CSV
 *   3. For each row: skip if duplicate domain match, else insert into cl.company_candidate
 *   4. After: run node pipeline/orchestrator.js to verify and mint
 *
 * USAGE:
 *   node pipeline/ingest_hunter_dol.js --file path/to/hunter_enrichment.csv
 *   node pipeline/ingest_hunter_dol.js --file data.csv --dry-run
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { IntakeService } = require('./intake_service');
const { v4: uuidv4 } = require('uuid');

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SOURCE_SYSTEM = 'HUNTER_DOL_SS003';

// Generic email domains — reject as company_domain
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'aol.com', 'icloud.com', 'live.com', 'msn.com', 'mail.com',
]);

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize a domain string.
 * Strips protocol, www, trailing paths. Lowercases.
 * Returns null if invalid or generic.
 */
function normalizeDomain(domain) {
  if (!domain || typeof domain !== 'string') return null;

  let d = domain.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/^www\./, '');
  d = d.split('/')[0];

  if (!d.includes('.')) return null;
  if (GENERIC_DOMAINS.has(d)) return null;

  return d;
}

/**
 * Build source_record_id from EIN.
 * EIN is a federal unique identifier — ideal natural key.
 */
function buildSourceRecordId(ein) {
  if (!ein) return null;
  return `DOL-EIN-${String(ein).trim()}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// DUPLICATE DETECTION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Load existing company domains from cl.company_identity for skip-set.
 * Returns a Set of normalized domain strings.
 */
async function loadExistingDomains(pool) {
  console.log('[DedupLoader] Loading existing domains from cl.company_identity...');

  const result = await pool.query(`
    SELECT DISTINCT LOWER(TRIM(company_domain)) AS domain
    FROM cl.company_identity
    WHERE company_domain IS NOT NULL
      AND TRIM(company_domain) != ''
  `);

  const domains = new Set();
  for (const row of result.rows) {
    const d = normalizeDomain(row.domain);
    if (d) domains.add(d);
  }

  console.log(`[DedupLoader] Loaded ${domains.size} unique existing domains`);
  return domains;
}

/**
 * Load existing company names from cl.company_identity for name-based dedup.
 * Returns a Set of normalized name strings.
 */
async function loadExistingNames(pool) {
  console.log('[DedupLoader] Loading existing company names from cl.company_identity...');

  const result = await pool.query(`
    SELECT DISTINCT LOWER(TRIM(company_name)) AS name
    FROM cl.company_identity
    WHERE company_name IS NOT NULL
      AND TRIM(company_name) != ''
  `);

  const names = new Set();
  for (const row of result.rows) {
    names.add(row.name);
  }

  console.log(`[DedupLoader] Loaded ${names.size} unique existing names`);
  return names;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const dryRun = args.includes('--dry-run');
  let filePath = null;

  const fileIdx = args.indexOf('--file');
  if (fileIdx !== -1 && args[fileIdx + 1]) {
    filePath = args[fileIdx + 1];
  }

  if (!filePath) {
    console.error('ERROR: --file is required');
    console.error('USAGE: node pipeline/ingest_hunter_dol.js --file path/to/csv [--dry-run]');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('═'.repeat(60));
  console.log('HUNTER DOL ENRICHMENT — INGESTION');
  console.log('═'.repeat(60));
  console.log(`Source System: ${SOURCE_SYSTEM}`);
  console.log(`File: ${filePath}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('═'.repeat(60));

  // Initialize intake service
  const intake = new IntakeService({ dryRun });
  const pool = await intake.connect();
  const ingestionRunId = uuidv4();

  console.log(`\nIngestion Run ID: ${ingestionRunId}`);

  try {
    // Step 1: Load duplicate skip-sets
    const existingDomains = await loadExistingDomains(pool);
    const existingNames = await loadExistingNames(pool);

    // Step 2: Parse CSV
    console.log('\n[Parser] Reading CSV...');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });
    console.log(`[Parser] Parsed ${rows.length} rows`);

    // Step 3: Process rows
    const stats = {
      total: rows.length,
      inserted: 0,
      skipped_duplicate_domain: 0,
      skipped_duplicate_name: 0,
      skipped_no_ein: 0,
      skipped_no_name: 0,
      skipped_db_conflict: 0,
      errors: 0,
      states: {},
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Extract fields
      const ein = (row.ein || '').trim();
      const companyName = (row.company_name || '').trim();
      const domain = normalizeDomain(row.known_domain);
      const stateCode = (row.state || '').trim().toUpperCase();

      // Validate EIN
      if (!ein) {
        stats.skipped_no_ein++;
        continue;
      }

      // Validate company name
      if (!companyName) {
        stats.skipped_no_name++;
        continue;
      }

      // Validate state_code format
      if (!/^[A-Z]{2}$/.test(stateCode)) {
        stats.errors++;
        if (stats.errors <= 10) {
          console.warn(`[Row ${i}] Invalid state_code: "${stateCode}" — skipping`);
        }
        continue;
      }

      // Duplicate check: domain match
      if (domain && existingDomains.has(domain)) {
        stats.skipped_duplicate_domain++;
        continue;
      }

      // Duplicate check: name match (only for domain-less rows)
      if (!domain) {
        const normalizedName = companyName.toLowerCase();
        if (existingNames.has(normalizedName)) {
          stats.skipped_duplicate_name++;
          continue;
        }
      }

      // Build candidate record (matches CandidateRecord typedef)
      const candidate = {
        source_system: SOURCE_SYSTEM,
        source_record_id: buildSourceRecordId(ein),
        state_code: stateCode,
        raw_payload: {
          ...row,
          company_name: companyName,
          company_domain: domain,
          linkedin_url: null,
        },
        company_name: companyName,
        company_domain: domain,
        linkedin_url: null,
      };

      try {
        const inserted = await intake.insertCandidate(candidate, ingestionRunId);
        if (inserted) {
          stats.inserted++;
          // Track state distribution
          stats.states[stateCode] = (stats.states[stateCode] || 0) + 1;
        } else {
          stats.skipped_db_conflict++;
        }
      } catch (error) {
        stats.errors++;
        if (stats.errors <= 10) {
          console.warn(`[Row ${i}] Insert error: ${error.message}`);
        }
      }

      // Progress
      if ((i + 1) % 500 === 0) {
        console.log(`[Progress] ${i + 1}/${rows.length} processed, ${stats.inserted} inserted`);
      }
    }

    // Step 4: Report
    console.log('\n' + '═'.repeat(60));
    console.log('INGESTION COMPLETE');
    console.log('═'.repeat(60));
    console.log(`Ingestion Run ID: ${ingestionRunId}`);
    console.log(`Source System: ${SOURCE_SYSTEM}`);
    console.log(`Total CSV Rows: ${stats.total}`);
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Skipped (domain duplicate): ${stats.skipped_duplicate_domain}`);
    console.log(`Skipped (name duplicate): ${stats.skipped_duplicate_name}`);
    console.log(`Skipped (no EIN): ${stats.skipped_no_ein}`);
    console.log(`Skipped (no name): ${stats.skipped_no_name}`);
    console.log(`Skipped (DB conflict): ${stats.skipped_db_conflict}`);
    console.log(`Errors: ${stats.errors}`);

    if (Object.keys(stats.states).length > 0) {
      console.log('\nState Distribution:');
      for (const [state, count] of Object.entries(stats.states).sort()) {
        console.log(`  ${state}: ${count}`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('NEXT STEP: Verify and mint identities:');
    console.log('  node pipeline/orchestrator.js');
    console.log('═'.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await intake.disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { SOURCE_SYSTEM };
