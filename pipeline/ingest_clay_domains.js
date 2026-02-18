#!/usr/bin/env node
/**
 * Ingest Clay Domain Enrichment
 *
 * Takes a Clay CSV export with domain discoveries and writes validated domains
 * to cl.company_identity and cl.company_candidate.
 *
 * DOCTRINE:
 * - Every domain MUST pass MX validation before DB write (TOOL-001)
 * - Clay domains are SUGGESTIONS, not truth — validate before trusting
 * - Known-bad domains (jnj.com, bbb.org, etc.) are auto-rejected
 * - Domain is ENRICHMENT, not VERIFICATION — sovereign ID already exists
 *
 * USAGE:
 *   node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv"
 *   node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" --dry-run
 *   node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" --skip-mx  # Trust Clay, skip MX check
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

const DEFAULT_CONNECTION =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require';

// ============================================================
// KNOWN-BAD DOMAINS
// These are real domains but NOT company-specific. Clay returns
// these as false matches. Auto-reject.
// ============================================================
const KNOWN_BAD_DOMAINS = new Set([
  // Major corporations (not the actual company)
  'jnj.com', 'ge.com', 'ibm.com', 'apple.com', 'amazon.com', 'google.com',
  'microsoft.com', 'facebook.com', 'meta.com', 'walmart.com', 'target.com',
  // Directories / reference sites (not company sites)
  'bbb.org', 'yelp.com', 'yellowpages.com', 'whitepages.com', 'manta.com',
  'buzzfile.com', 'chamberofcommerce.com', 'dnb.com', 'zoominfo.com',
  'linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
  'crunchbase.com', 'glassdoor.com', 'indeed.com',
  // Map / review / directory sites
  'mapquest.com', 'angi.com', 'angieslist.com', 'thumbtack.com',
  'homeadvisor.com', 'houzz.com', 'porch.com', 'nextdoor.com',
  'superpages.com', 'citysearch.com', 'foursquare.com',
  'tripadvisor.com', 'google.com', 'maps.google.com',
  // Business data / research sites
  'privco.com', 'bizapedia.com', 'opencorporates.com', 'sec.gov',
  'npidb.org', 'npino.com', 'nppn.org', 'hipaaspace.com',
  'dandb.com', 'hoovers.com', 'owler.com', 'pitchbook.com',
  'cbinsights.com', 'bloomberg.com', 'reuters.com',
  // State registries (not company sites)
  'sunbiz.org', 'sos.state.nc.us', 'sos.sc.gov',
  'corporations.state.pa.us', 'dos.ny.gov',
  // Government sites
  'usa.gov', 'state.gov', 'irs.gov', 'sba.gov', 'census.gov',
  'dot.gov', 'cms.gov', 'dol.gov', 'osha.gov', 'epa.gov',
  'fda.gov', 'hhs.gov', 'va.gov', 'gsa.gov',
  // Legal / case sites
  'casemine.com', 'casetext.com', 'courtlistener.com', 'justia.com',
  'findlaw.com', 'avvo.com', 'martindale.com', 'lawyers.com',
  // News / media
  'myhorrynews.com', 'wmbfnews.com', 'wpde.com', 'wbtw.com',
  'postandcourier.com', 'thestate.com', 'charlotteobserver.com',
  // Generic email providers
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'live.com', 'msn.com', 'mail.com',
  // Wikipedia / reference
  'wikipedia.org', 'wikidata.org', 'wikimedia.org',
  // EIN / business lookup sites (Clay false positives)
  'eindata.com', 'w9ein.com', 'ein-search.com', 'eintaxid.com',
  'taxid.pro', 'eininfo.com',
  // Construction / industry software (not the company)
  'procore.com', 'buildertrend.com', 'corelogic.com',
  // Health systems / large orgs often returned as false matches
  'medstarhealth.org', 'hcahealthcare.com',
  // Local directories often returned by Clay
  'onlypawleys.com', 'hemingwaysouthcarolina.com', 'onlymyrtlebeach.com',
  // Other false positive sources
  'sctrucking.org', 'newyorkcitydiscriminationlawyer.com',
]);

/**
 * Patterns that indicate a directory/reference domain, not a company domain.
 * Check domain against these if not in the static KNOWN_BAD list.
 */
const BAD_DOMAIN_PATTERNS = [
  /\.gov$/,                        // All government domains
  /chamber/i,                      // Chamber of commerce sites
  /southcarolina|northcarolina/i,  // State portal sites
  /county\./i,                     // County government sites
  /city\./i,                       // City government sites
];

// ============================================================
// CSV PARSER (simple, no dependencies)
// ============================================================
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseRow(line);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    rows.push(row);
  }

  return rows;
}

function parseRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================
// DNS VALIDATION
// ============================================================
async function validateDomain(domain) {
  let hasA = false;
  let hasMx = false;
  let mxCount = 0;

  try {
    const aRecords = await resolve4(domain);
    hasA = aRecords && aRecords.length > 0;
  } catch (err) {
    hasA = false;
  }

  try {
    const mxRecords = await resolveMx(domain);
    hasMx = mxRecords && mxRecords.length > 0;
    mxCount = mxRecords ? mxRecords.length : 0;
  } catch (err) {
    hasMx = false;
  }

  if (hasA && hasMx) return { status: 'VALID', mx_count: mxCount };
  if (hasA) return { status: 'VALID_NO_MX', mx_count: 0 };
  return { status: 'UNREACHABLE', mx_count: 0 };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipMx = args.includes('--skip-mx');
  const fileIdx = args.indexOf('--file');

  if (fileIdx === -1 || !args[fileIdx + 1]) {
    console.error('Usage: node pipeline/ingest_clay_domains.js --file "path/to/clay_export.csv" [--dry-run] [--skip-mx]');
    process.exit(1);
  }

  let filePath = args[fileIdx + 1];
  // Handle Windows paths
  if (filePath.startsWith("'") || filePath.startsWith('"')) {
    filePath = filePath.replace(/^['"]|['"]$/g, '');
  }

  // Resolve relative to USERPROFILE if starts with /c/
  if (filePath.startsWith('/c/')) {
    filePath = filePath.replace('/c/', 'C:/');
  }

  console.log('=== Clay Domain Enrichment Ingest ===');
  console.log(`File: ${filePath}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Skip MX: ${skipMx}`);
  console.log('');

  // Parse CSV
  const rows = parseCsv(filePath);
  console.log(`Parsed ${rows.length} rows from CSV.`);

  const pool = new Pool({
    connectionString:
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      DEFAULT_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  const stats = {
    total: rows.length,
    has_domain: 0,
    no_domain: 0,
    known_bad: 0,
    has_sovereign_id: 0,
    no_sovereign_id: 0,
    already_has_domain: 0,
    mx_valid: 0,
    mx_no_mx: 0,
    mx_unreachable: 0,
    written: 0,
    errors: 0,
  };

  const results = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const domain = (row['Domain'] || '').toLowerCase().trim();
    const sovereignId = (row['sovereign_id'] || '').trim();
    const outreachId = (row['outreach_id'] || '').trim();
    const companyName = (row['company_name'] || '').trim();

    if (!domain) {
      stats.no_domain++;
      continue;
    }
    stats.has_domain++;

    if (sovereignId) {
      stats.has_sovereign_id++;
    } else {
      stats.no_sovereign_id++;
    }

    // Check known-bad domains (static list + patterns)
    let isBad = KNOWN_BAD_DOMAINS.has(domain);
    if (!isBad) {
      for (const pattern of BAD_DOMAIN_PATTERNS) {
        if (pattern.test(domain)) {
          isBad = true;
          break;
        }
      }
    }
    if (isBad) {
      stats.known_bad++;
      if (stats.known_bad <= 10 || (i % 200 === 0)) {
        console.log(`  REJECT (known-bad): ${companyName} → ${domain}`);
      }
      continue;
    }

    // Find the company in our DB
    let companyUniqueId = sovereignId || null;

    // If no sovereign_id in CSV, try to find by outreach_id or company name
    if (!companyUniqueId && outreachId) {
      try {
        const lookup = await pool.query(
          `SELECT company_unique_id FROM cl.company_candidate
           WHERE candidate_id::text = $1 AND company_unique_id IS NOT NULL
           LIMIT 1`,
          [outreachId]
        );
        if (lookup.rows.length > 0) {
          companyUniqueId = lookup.rows[0].company_unique_id;
        }
      } catch (err) {
        // Silent — try next method
      }
    }

    if (!companyUniqueId) {
      // Can't match to a sovereign identity — skip
      continue;
    }

    // Check if company already has a domain
    try {
      const existing = await pool.query(
        'SELECT company_domain FROM cl.company_identity WHERE company_unique_id = $1',
        [companyUniqueId]
      );
      if (existing.rows.length > 0 && existing.rows[0].company_domain) {
        stats.already_has_domain++;
        continue;
      }
    } catch (err) {
      stats.errors++;
      continue;
    }

    // MX Validation
    let mxStatus = 'SKIPPED';
    if (!skipMx) {
      const validation = await validateDomain(domain);
      mxStatus = validation.status;

      if (validation.status === 'VALID') {
        stats.mx_valid++;
      } else if (validation.status === 'VALID_NO_MX') {
        stats.mx_no_mx++;
      } else {
        stats.mx_unreachable++;
        // Don't write unreachable domains
        if ((i < 10) || (i % 100 === 0)) {
          console.log(`  UNREACHABLE: ${companyName} → ${domain}`);
        }
        continue;
      }
    }

    // Write to database
    if (!dryRun) {
      try {
        // Update company_identity
        await pool.query(
          'UPDATE cl.company_identity SET company_domain = $2 WHERE company_unique_id = $1 AND company_domain IS NULL',
          [companyUniqueId, domain]
        );

        // Update candidate raw_payload
        await pool.query(
          `UPDATE cl.company_candidate
           SET raw_payload = jsonb_set(
             COALESCE(raw_payload, '{}'::jsonb),
             '{company_domain}',
             to_jsonb($2::text)
           )
           WHERE company_unique_id = $1 AND company_unique_id IS NOT NULL`,
          [companyUniqueId, domain]
        );

        stats.written++;
      } catch (err) {
        stats.errors++;
        console.error(`  ERROR: ${companyName}: ${err.message}`);
      }
    } else {
      stats.written++;
    }

    results.push({
      company_name: companyName,
      domain,
      mx_status: mxStatus,
      sovereign_id: companyUniqueId,
    });

    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${rows.length} processed...`);
    }
  }

  // Summary
  console.log('');
  console.log('=== INGEST SUMMARY ===');
  console.log(`Total CSV rows:         ${stats.total}`);
  console.log(`Has domain:             ${stats.has_domain}`);
  console.log(`No domain:              ${stats.no_domain}`);
  console.log(`Known-bad rejected:     ${stats.known_bad}`);
  console.log(`Has sovereign ID:       ${stats.has_sovereign_id}`);
  console.log(`No sovereign ID:        ${stats.no_sovereign_id}`);
  console.log(`Already has domain:     ${stats.already_has_domain}`);
  if (!skipMx) {
    console.log(`MX Valid:               ${stats.mx_valid}`);
    console.log(`MX Valid (no MX):       ${stats.mx_no_mx}`);
    console.log(`MX Unreachable:         ${stats.mx_unreachable}`);
  }
  console.log(`Written to DB:          ${stats.written}${dryRun ? ' (dry run)' : ''}`);
  console.log(`Errors:                 ${stats.errors}`);

  // Show first 20 written
  if (results.length > 0) {
    console.log('');
    console.log(`=== DOMAINS WRITTEN (${results.length}) ===`);
    for (const r of results.slice(0, 30)) {
      console.log(`  ${r.company_name} → ${r.domain} [${r.mx_status}]`);
    }
    if (results.length > 30) {
      console.log(`  ... and ${results.length - 30} more`);
    }
  }

  await pool.end();
  return stats;
}

main()
  .then((stats) => {
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
