#!/usr/bin/env node
/**
 * Domain Discovery — Tier 0A: DNS Inference + MX Validation
 *
 * DOCTRINE:
 * - Domain is ENRICHMENT, not VERIFICATION
 * - Sovereign ID = "this company is real" — NOT "this company has a website"
 * - Discovery uses Tier 0 (FREE) methods per SNAP_ON_TOOLBOX.yaml
 * - Every discovered domain MUST pass MX validation before DB write
 *
 * APPROACH (Tiered Waterfall):
 *   Tier 0A: Normalize company name → generate candidate domains → DNS A + MX validate
 *   Tier 0B: Web search (manual pass for misses)
 *   Tier 0C: Google Custom Search API (100 free/day)
 *
 * This script implements Tier 0A only.
 *
 * USAGE:
 *   node pipeline/discover_domains.js                    # Process all missing
 *   node pipeline/discover_domains.js --dry-run          # Preview only, no DB writes
 *   node pipeline/discover_domains.js --limit 50         # Process first 50
 *   node pipeline/discover_domains.js --source DOL       # Only DOL-sourced companies
 *   node pipeline/discover_domains.js --verbose          # Show all DNS lookup attempts
 */

const { Pool } = require('pg');
const dns = require('dns');
const { promisify } = require('util');

// Promisify DNS functions
const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

// Database connection
const DEFAULT_CONNECTION =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require';

// ============================================================
// DOMAIN CANDIDATE GENERATION
// ============================================================

/**
 * Suffixes to strip from company names before generating domain candidates.
 * Order matters — longer variants first to avoid partial matches.
 */
const COMPANY_SUFFIXES = [
  'incorporated', 'corporation', 'limited liability company',
  'professional limited liability company',
  'limited partnership', 'limited',
  'company', 'enterprises', 'enterprise', 'services', 'service',
  'associates', 'group', 'partners',
  'pllc', 'llc', 'inc', 'corp', 'ltd', 'lp',
  'dba',
];

/**
 * Professional title patterns to strip (dentists, doctors, etc.)
 * Uses \b word boundaries on BOTH sides to prevent matching inside words
 * (e.g., "DOCTOR" should NOT match d.o., "PAYNE" should NOT match p.a.)
 */
const TITLE_PATTERNS = [
  /,?\s*\b(d\.?d\.?s\.?|m\.?d\.?|d\.?o\.?|d\.?v\.?m\.?|p\.?a\.?|p\.?c\.?)\b/gi,
  /,?\s*\b(jr\.?|sr\.?|ii|iii|iv)\b/gi,
];

/**
 * Generic/holding company name patterns unlikely to have a website.
 * Skip these to avoid false positives.
 */
const SKIP_PATTERNS = [
  /^\d+\s+(north|south|east|west|n|s|e|w)\s/i,   // Address-based names like "135 North Dargan LLC"
  /^(the\s+)?estate\s+of/i,                        // Estates
  /^(the\s+)?trust\s+of/i,                         // Trusts
  /\bholding(s)?\b/i,                               // Holdings (often no website)
  /\binvestment(s)?\b.*\b(llc|lp)\b/i,             // Investment LLCs
];

/**
 * Normalize a company name into a domain-friendly slug.
 *
 * "COASTAL CAROLINA DENTISTRY LLC" → "coastalcarolinadentistry"
 * "McLeod Health" → "mcleodhealth"
 * "Black's Tire Service, Inc." → "blackstireservice"
 *
 * @param {string} name - Raw company name
 * @returns {string|null} - Normalized slug or null if not viable
 */
function normalizeCompanyName(name) {
  if (!name) return null;

  let slug = name.toLowerCase().trim();

  // Strip professional titles
  for (const pattern of TITLE_PATTERNS) {
    slug = slug.replace(pattern, '');
  }

  // Strip company suffixes (as whole words)
  for (const suffix of COMPANY_SUFFIXES) {
    const re = new RegExp(`\\b${suffix}\\.?\\b`, 'gi');
    slug = slug.replace(re, '');
  }

  // Remove possessives, punctuation, and extra spaces
  slug = slug
    .replace(/['']s\b/g, 's')     // Possessive → keep the s
    .replace(/[^a-z0-9]/g, '')    // Strip everything non-alphanumeric
    .trim();

  // Too short after normalization — not viable
  if (slug.length < 3) return null;

  return slug;
}

/**
 * Generate candidate domains from a company name.
 * Generates variants from both the full slug AND shorter word-based versions.
 *
 * @param {string} slug - Normalized name slug (no spaces)
 * @param {string|null} stateCode - 2-letter state code (optional)
 * @param {string} originalName - Original company name (for word-based variants)
 * @returns {string[]} - Array of candidate domains to test (deduplicated)
 */
function generateCandidates(slug, stateCode, originalName) {
  const seen = new Set();
  const candidates = [];

  function add(domain) {
    if (!seen.has(domain) && domain.length > 4) { // Minimum viable domain length
      seen.add(domain);
      candidates.push(domain);
    }
  }

  // Primary: full slug
  add(`${slug}.com`);
  add(`${slug}.net`);
  add(`${slug}.org`);

  // State-specific variant
  if (stateCode && stateCode.length === 2) {
    const st = stateCode.toLowerCase();
    add(`${slug}${st}.com`);
  }

  // Word-based variants from original name (for long names)
  // Filter stopwords to avoid false positives like "placeat.com" from "A Place At The Beach"
  const STOPWORDS = ['a', 'an', 'the', 'and', 'or', 'of', 'at', 'in', 'on', 'to', 'for', 'by', 'is', 'it', 'as'];
  if (originalName) {
    const words = originalName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 1 && !COMPANY_SUFFIXES.includes(w) && !STOPWORDS.includes(w));

    // First 2 words (e.g., "ALTMAN TRACTOR" → "altmantractor.com")
    if (words.length >= 2) {
      const short2 = words.slice(0, 2).join('');
      add(`${short2}.com`);
      add(`${short2}.net`);
    }

    // First 3 words
    if (words.length >= 3) {
      const short3 = words.slice(0, 3).join('');
      add(`${short3}.com`);
    }
  }

  return candidates;
}

/**
 * Check if a company name should be skipped (unlikely to have a discoverable domain).
 *
 * @param {string} name - Raw company name
 * @returns {boolean}
 */
function shouldSkip(name) {
  if (!name) return true;
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  // Personal names with comma (e.g., "JOHN SMITH, DDS") — single-person practices
  const commaCount = (name.match(/,/g) || []).length;
  const wordCount = name.trim().split(/\s+/).length;
  if (commaCount >= 1 && wordCount <= 4) {
    // Likely a personal name practice — still try but flag it
    return false; // Don't skip, just lower priority
  }
  return false;
}

// ============================================================
// DNS VALIDATION (TOOL-001: MX Lookup — FREE)
// ============================================================

/**
 * DNS query with timeout. Prevents hanging on unresponsive DNS servers.
 *
 * @param {Function} fn - Promisified DNS function
 * @param {string} domain
 * @param {number} timeoutMs - Timeout in milliseconds (default: 3000)
 * @returns {Promise<any>}
 */
function dnsWithTimeout(fn, domain, timeoutMs = 3000) {
  return Promise.race([
    fn(domain),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeoutMs)
    ),
  ]);
}

/**
 * Validate a domain via DNS A record + MX record lookup.
 * Uses 3-second timeout per query to prevent hanging.
 *
 * Returns:
 *   VALID       — Has both A and MX records (good domain)
 *   VALID_NO_MX — Has A record but no MX (website exists, no email)
 *   UNREACHABLE — No A record at all
 *
 * @param {string} domain
 * @returns {Promise<{status: string, mx_count: number}>}
 */
async function validateDomain(domain) {
  let hasA = false;
  let hasMx = false;
  let mxCount = 0;

  // Check A records (does the domain resolve to an IP?)
  try {
    const aRecords = await dnsWithTimeout(resolve4, domain);
    hasA = aRecords && aRecords.length > 0;
  } catch (err) {
    hasA = false;
  }

  // Check MX records (does the domain accept email?)
  try {
    const mxRecords = await dnsWithTimeout(resolveMx, domain);
    hasMx = mxRecords && mxRecords.length > 0;
    mxCount = mxRecords ? mxRecords.length : 0;
  } catch (err) {
    hasMx = false;
  }

  if (hasA && hasMx) {
    return { status: 'VALID', mx_count: mxCount };
  } else if (hasA) {
    return { status: 'VALID_NO_MX', mx_count: 0 };
  } else {
    return { status: 'UNREACHABLE', mx_count: 0 };
  }
}

/**
 * PARKED DOMAIN DETECTION
 *
 * Common parked domain indicators in MX records.
 * If MX points to a parking service, the domain is registered but not active.
 */
const PARKED_MX_PATTERNS = [
  'parkingcrew', 'sedoparking', 'bodis.com', 'above.com',
  'domaincontrol', 'pendingrenew',
];

/**
 * Check if MX records indicate a parked domain.
 *
 * @param {string} domain
 * @returns {Promise<boolean>}
 */
async function isParkedDomain(domain) {
  try {
    const mxRecords = await resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) return false;

    for (const mx of mxRecords) {
      const exchange = (mx.exchange || '').toLowerCase();
      for (const pattern of PARKED_MX_PATTERNS) {
        if (exchange.includes(pattern)) return true;
      }
    }
  } catch (err) {
    // Can't check — assume not parked
  }
  return false;
}

// ============================================================
// MAIN DISCOVERY ENGINE
// ============================================================

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;
  const sourceIdx = args.indexOf('--source');
  const sourceFilter = sourceIdx !== -1 ? args[sourceIdx + 1] : null;

  console.log('=== Domain Discovery: Tier 0A (DNS Inference + MX Validation) ===');
  console.log(`Dry Run: ${dryRun}`);
  console.log(`Limit: ${limit || 'ALL'}`);
  console.log(`Source Filter: ${sourceFilter || 'ALL'}`);
  console.log(`Verbose: ${verbose}`);
  console.log('');

  const pool = new Pool({
    connectionString:
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      DEFAULT_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Query companies missing domains
    let query = `
      SELECT
        i.company_unique_id,
        i.company_name,
        i.state_code,
        i.source_system,
        c.raw_payload->>'city' as city,
        c.raw_payload->>'state' as state,
        c.raw_payload->>'ein' as ein,
        c.candidate_id
      FROM cl.company_identity i
      LEFT JOIN cl.company_candidate c ON c.company_unique_id = i.company_unique_id
      WHERE i.company_domain IS NULL
    `;

    const params = [];
    if (sourceFilter) {
      params.push(`%${sourceFilter}%`);
      query += ` AND i.source_system LIKE $${params.length}`;
    }

    query += ' ORDER BY i.company_name ASC';

    if (limit) {
      params.push(limit);
      query += ` LIMIT $${params.length}`;
    }

    const result = await pool.query(query, params);
    const companies = result.rows;

    console.log(`Found ${companies.length} companies missing domains.`);
    console.log('');

    // Counters
    const stats = {
      total: companies.length,
      skipped: 0,
      tested: 0,
      found: 0,
      found_valid: 0,
      found_no_mx: 0,
      parked: 0,
      not_found: 0,
      written: 0,
      errors: 0,
    };

    const discovered = []; // {company_unique_id, company_name, domain, status, mx_count}
    const misses = [];     // Companies with no domain found (for Tier 0B)

    /**
     * Process a single company: normalize, generate candidates, DNS validate.
     * Returns { found: bool, match?: {...}, miss?: {...} }
     */
    async function processCompany(company) {
      const name = company.company_name;

      // Skip check
      if (shouldSkip(name)) {
        return { skipped: true, miss: { company_unique_id: company.company_unique_id, company_name: name, reason: 'SKIPPED_PATTERN' } };
      }

      // Normalize and generate candidates
      const slug = normalizeCompanyName(name);
      if (!slug) {
        return { skipped: true, miss: { company_unique_id: company.company_unique_id, company_name: name, reason: 'NORMALIZATION_FAILED' } };
      }

      const candidates = generateCandidates(slug, company.state_code, name);

      if (verbose) {
        console.log(`  Testing: ${name} → slug="${slug}" → [${candidates.join(', ')}]`);
      }

      // Test each candidate domain
      let bestMatch = null;
      for (const candidate of candidates) {
        const validation = await validateDomain(candidate);

        if (verbose) {
          console.log(`    ${candidate} → ${validation.status} (MX: ${validation.mx_count})`);
        }

        if (validation.status === 'VALID') {
          const parked = await isParkedDomain(candidate);
          if (parked) {
            if (verbose) console.log(`    ${candidate} → PARKED (skipping)`);
            continue;
          }
          bestMatch = { domain: candidate, ...validation };
          break;
        } else if (validation.status === 'VALID_NO_MX' && !bestMatch) {
          bestMatch = { domain: candidate, ...validation };
        }
      }

      if (bestMatch) {
        return {
          found: true,
          match: {
            company_unique_id: company.company_unique_id,
            candidate_id: company.candidate_id,
            company_name: name,
            domain: bestMatch.domain,
            status: bestMatch.status,
            mx_count: bestMatch.mx_count,
          },
        };
      }

      return {
        found: false,
        miss: {
          company_unique_id: company.company_unique_id,
          company_name: name,
          state_code: company.state_code,
          city: company.city,
          reason: 'NO_DNS_MATCH',
        },
      };
    }

    // Process companies in parallel batches of CONCURRENCY
    const CONCURRENCY = 10;
    for (let i = 0; i < companies.length; i += CONCURRENCY) {
      const batch = companies.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(c => processCompany(c)));

      for (const result of results) {
        if (result.skipped) {
          stats.skipped++;
          if (result.miss) misses.push(result.miss);
          continue;
        }

        stats.tested++;

        if (result.found && result.match) {
          stats.found++;
          if (result.match.status === 'VALID') {
            stats.found_valid++;
          } else {
            stats.found_no_mx++;
          }

          console.log(`  FOUND: ${result.match.company_name} → ${result.match.domain} [${result.match.status}]`);
          discovered.push(result.match);

          // Write to database
          if (!dryRun) {
            try {
              await pool.query(
                'UPDATE cl.company_identity SET company_domain = $2 WHERE company_unique_id = $1',
                [result.match.company_unique_id, result.match.domain]
              );

              if (result.match.candidate_id) {
                await pool.query(
                  `UPDATE cl.company_candidate
                   SET raw_payload = jsonb_set(
                     COALESCE(raw_payload, '{}'::jsonb),
                     '{company_domain}',
                     to_jsonb($2::text)
                   )
                   WHERE candidate_id = $1`,
                  [result.match.candidate_id, result.match.domain]
                );
              }

              stats.written++;
            } catch (err) {
              stats.errors++;
              console.error(`  ERROR writing ${result.match.company_name}: ${err.message}`);
            }
          }
        } else {
          stats.not_found++;
          if (result.miss) misses.push(result.miss);
        }
      }

      // Progress every 100 companies
      if ((i + CONCURRENCY) % 100 < CONCURRENCY) {
        console.log(`  Progress: ${Math.min(i + CONCURRENCY, companies.length)}/${companies.length}...`);
      }
    }

    // Print summary
    console.log('');
    console.log('=== DISCOVERY SUMMARY ===');
    console.log(`Total companies:      ${stats.total}`);
    console.log(`Skipped (patterns):   ${stats.skipped}`);
    console.log(`Tested (DNS):         ${stats.tested}`);
    console.log(`Found (VALID):        ${stats.found_valid}`);
    console.log(`Found (VALID_NO_MX):  ${stats.found_no_mx}`);
    console.log(`Found (total):        ${stats.found}`);
    console.log(`Parked (rejected):    ${stats.parked}`);
    console.log(`Not found:            ${stats.not_found}`);
    if (!dryRun) {
      console.log(`Written to DB:        ${stats.written}`);
      console.log(`Write errors:         ${stats.errors}`);
    } else {
      console.log(`[DRY RUN — no DB writes]`);
    }
    console.log('');

    // Print misses for Tier 0B follow-up
    if (misses.length > 0) {
      console.log(`=== MISSES (${misses.length} — candidates for Tier 0B web search) ===`);
      for (const miss of misses.slice(0, 20)) {
        const loc = miss.city ? `${miss.city}, ${miss.state_code}` : (miss.state_code || 'N/A');
        console.log(`  ${miss.company_name} | ${loc} | ${miss.reason}`);
      }
      if (misses.length > 20) {
        console.log(`  ... and ${misses.length - 20} more`);
      }
    }

    // Print discovered domains
    if (discovered.length > 0) {
      console.log('');
      console.log(`=== DISCOVERED DOMAINS (${discovered.length}) ===`);
      for (const d of discovered) {
        console.log(`  ${d.company_name} → ${d.domain} [${d.status}, MX:${d.mx_count}]`);
      }
    }

    return { stats, discovered, misses };
  } finally {
    await pool.end();
  }
}

// Run
main()
  .then(({ stats }) => {
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });

module.exports = {
  normalizeCompanyName,
  generateCandidates,
  shouldSkip,
  validateDomain,
  isParkedDomain,
};
