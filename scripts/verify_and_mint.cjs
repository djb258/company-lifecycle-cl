#!/usr/bin/env node
/**
 * Verify and Mint Sovereign Identities
 *
 * This script:
 * 1. Fetches PENDING candidates from cl.company_candidate
 * 2. Runs verification (admission gate, name validation, etc.)
 * 3. Mints sovereign identities for verified companies
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Use Doppler for secrets: doppler run -- node scripts/verify_and_mint.cjs
const CONNECTION_STRING = process.env.VITE_DATABASE_URL;

if (!CONNECTION_STRING) {
  console.error('ERROR: VITE_DATABASE_URL not set. Run with: doppler run -- node scripts/verify_and_mint.cjs');
  process.exit(1);
}

async function main() {
  const runIdFilter = process.argv[2] || null;
  const batchSize = parseInt(process.argv[3]) || 500;

  console.log('═'.repeat(70));
  console.log('COMPANY LIFECYCLE - VERIFICATION & MINTING');
  console.log('═'.repeat(70));
  if (runIdFilter) {
    console.log(`Filter: ingestion_run_id = ${runIdFilter}`);
  }
  console.log(`Batch Size: ${batchSize}`);
  console.log('═'.repeat(70));

  const pool = new Pool({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  const results = {
    processed: 0,
    verified: 0,
    failed: 0,
    minted: 0,
    linked: 0,
    errors: [],
    byState: {},
  };

  try {
    // Query pending candidates
    let query = `
      SELECT
        candidate_id,
        source_system,
        source_record_id,
        state_code,
        raw_payload,
        ingestion_run_id
      FROM cl.company_candidate
      WHERE verification_status = 'PENDING'
        AND company_unique_id IS NULL
    `;

    const params = [];
    if (runIdFilter) {
      query += ` AND ingestion_run_id = $1`;
      params.push(runIdFilter);
    }

    query += ` ORDER BY created_at ASC LIMIT ${batchSize}`;

    const candidatesResult = await pool.query(query, params);
    console.log(`\nFound ${candidatesResult.rows.length} PENDING candidates`);

    if (candidatesResult.rows.length === 0) {
      console.log('No candidates to process.');
      return results;
    }

    console.log('\n' + '─'.repeat(70));
    console.log('PROCESSING CANDIDATES');
    console.log('─'.repeat(70));

    for (const candidate of candidatesResult.rows) {
      results.processed++;

      const raw = candidate.raw_payload;
      const companyName = raw.company_name || null;
      const companyDomain = raw.company_domain || null;
      const linkedinUrl = raw.linkedin_url || null;
      const stateCode = candidate.state_code;

      // === VERIFICATION ===
      const verification = verifyCandidate(companyName, companyDomain, linkedinUrl);

      if (!verification.passed) {
        // Update candidate as FAILED
        await pool.query(
          `UPDATE cl.company_candidate
           SET verification_status = 'FAILED', verification_error = $2
           WHERE candidate_id = $1`,
          [candidate.candidate_id, verification.error]
        );
        results.failed++;
        results.errors.push({
          candidate_id: candidate.candidate_id,
          name: companyName,
          error: verification.error,
        });
        continue;
      }

      // Verification passed
      results.verified++;

      // === CHECK FOR EXISTING IDENTITY ===
      let existingId = null;

      // Check by domain
      if (verification.extracted.company_domain) {
        const domainCheck = await pool.query(
          'SELECT company_unique_id FROM cl.company_identity WHERE company_domain = $1',
          [verification.extracted.company_domain]
        );
        if (domainCheck.rows.length > 0) {
          existingId = domainCheck.rows[0].company_unique_id;
        }
      }

      // Check by LinkedIn
      if (!existingId && verification.extracted.linkedin_url) {
        const linkedinCheck = await pool.query(
          'SELECT company_unique_id FROM cl.company_identity WHERE linkedin_company_url = $1',
          [verification.extracted.linkedin_url]
        );
        if (linkedinCheck.rows.length > 0) {
          existingId = linkedinCheck.rows[0].company_unique_id;
        }
      }

      if (existingId) {
        // Link to existing identity
        await pool.query(
          `UPDATE cl.company_candidate
           SET verification_status = 'VERIFIED', company_unique_id = $2, verified_at = now()
           WHERE candidate_id = $1`,
          [candidate.candidate_id, existingId]
        );
        results.linked++;
        continue;
      }

      // === MINT NEW IDENTITY ===
      try {
        const insertQuery = `
          INSERT INTO cl.company_identity (
            company_name,
            company_domain,
            linkedin_company_url,
            source_system,
            lifecycle_run_id
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING company_unique_id
        `;

        const mintResult = await pool.query(insertQuery, [
          verification.extracted.company_name,
          verification.extracted.company_domain,
          verification.extracted.linkedin_url,
          candidate.source_system,
          candidate.ingestion_run_id,
        ]);

        const newId = mintResult.rows[0].company_unique_id;

        // Update candidate with new identity
        await pool.query(
          `UPDATE cl.company_candidate
           SET verification_status = 'VERIFIED', company_unique_id = $2, verified_at = now()
           WHERE candidate_id = $1`,
          [candidate.candidate_id, newId]
        );

        results.minted++;
        results.byState[stateCode] = (results.byState[stateCode] || 0) + 1;

      } catch (err) {
        // Handle unique constraint violations (race condition)
        if (err.code === '23505') {
          // Duplicate - try to link instead
          results.linked++;
        } else {
          results.errors.push({
            candidate_id: candidate.candidate_id,
            name: companyName,
            error: err.message,
          });
          results.failed++;
        }
      }

      // Progress logging
      if (results.processed % 100 === 0) {
        console.log(`Progress: ${results.processed} processed, ${results.minted} minted, ${results.failed} failed`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('VERIFICATION & MINTING COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\n📊 SUMMARY`);
    console.log(`   Processed:     ${results.processed}`);
    console.log(`   Verified:      ${results.verified}`);
    console.log(`   Failed:        ${results.failed}`);
    console.log(`   ────────────────────────────────`);
    console.log(`   NEW MINTED:    ${results.minted}`);
    console.log(`   Linked:        ${results.linked}`);

    console.log(`\n📍 MINTED BY STATE:`);
    for (const [state, count] of Object.entries(results.byState).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${state}: ${count}`);
    }

    if (results.errors.length > 0) {
      console.log(`\n⚠ Errors (${results.errors.length}):`);
      results.errors.slice(0, 10).forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.name || e.candidate_id}: ${e.error}`);
      });
    }

    // Check if more candidates remain
    const remainingCheck = await pool.query(
      `SELECT COUNT(*) FROM cl.company_candidate
       WHERE verification_status = 'PENDING' AND company_unique_id IS NULL
       ${runIdFilter ? 'AND ingestion_run_id = $1' : ''}`,
      runIdFilter ? [runIdFilter] : []
    );

    const remaining = parseInt(remainingCheck.rows[0].count);
    if (remaining > 0) {
      console.log(`\n⏳ ${remaining} candidates remaining. Run again to continue.`);
    } else {
      console.log(`\n✓ All candidates processed!`);
    }

    console.log('═'.repeat(70));

    return results;

  } finally {
    await pool.end();
  }
}

/**
 * Verify a candidate record
 */
function verifyCandidate(companyName, companyDomain, linkedinUrl) {
  // Admission gate: domain OR linkedin required
  if (!companyDomain && !linkedinUrl) {
    return {
      passed: false,
      error: 'ADMISSION_GATE_FAILED: Missing both domain and LinkedIn URL',
    };
  }

  // Company name validation
  if (!companyName || companyName.trim().length === 0) {
    return {
      passed: false,
      error: 'COMPANY_NAME_REQUIRED: company_name is empty or missing',
    };
  }

  // Domain validation (if provided)
  if (companyDomain) {
    const domainValid = validateDomain(companyDomain);
    if (!domainValid.valid) {
      return {
        passed: false,
        error: `DOMAIN_INVALID: ${domainValid.reason}`,
      };
    }
  }

  // LinkedIn validation (if provided)
  if (linkedinUrl) {
    const linkedinValid = validateLinkedIn(linkedinUrl);
    if (!linkedinValid.valid) {
      return {
        passed: false,
        error: `LINKEDIN_INVALID: ${linkedinValid.reason}`,
      };
    }
  }

  return {
    passed: true,
    extracted: {
      company_name: companyName.trim(),
      company_domain: companyDomain ? companyDomain.toLowerCase().trim() : null,
      linkedin_url: linkedinUrl || null,
    },
  };
}

function validateDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return { valid: false, reason: 'Domain is empty' };
  }

  const normalized = domain.toLowerCase().trim();

  if (!normalized.includes('.')) {
    return { valid: false, reason: 'Domain must contain a dot' };
  }

  const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainPattern.test(normalized)) {
    return { valid: false, reason: 'Invalid domain format' };
  }

  const genericDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'aol.com', 'icloud.com', 'live.com', 'msn.com', 'mail.com'
  ];
  if (genericDomains.includes(normalized)) {
    return { valid: false, reason: 'Generic email domain not allowed' };
  }

  return { valid: true };
}

function validateLinkedIn(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'LinkedIn URL is empty' };
  }

  const normalized = url.toLowerCase().trim();

  // Must be a LinkedIn company URL
  if (!normalized.includes('linkedin.com/company/')) {
    return { valid: false, reason: 'Must be a LinkedIn company URL' };
  }

  return { valid: true };
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
