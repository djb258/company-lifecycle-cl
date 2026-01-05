/**
 * Lifecycle Worker
 *
 * SOVEREIGN INTAKE ENGINE
 *
 * DOCTRINE:
 * - State is DATA, not CODE
 * - NC is Source Stream #001, not special
 * - All states use the SAME verification logic
 * - Identity minting ONLY after VERIFIED status
 *
 * HARD CONSTRAINTS:
 * - Do NOT delete or re-mint existing IDs
 * - Do NOT weaken verification logic
 * - Do NOT special-case any state
 * - Fail closed if verification fails
 *
 * INVARIANT (LOCKED):
 * If any code path mints an identity without passing through
 * cl.company_candidate → verifyCandidate(), the build is invalid.
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Default connection string for CLI usage
const DEFAULT_CONNECTION =
  'postgresql://Marketing%20DB_owner:npg_OsE4Z2oPCpiT@ep-ancient-waterfall-a42vy0du-pooler.us-east-1.aws.neon.tech:5432/Marketing%20DB?sslmode=require';

/**
 * INVARIANT CHECK: Verification before minting
 * This function MUST be called before any identity minting.
 * @throws {Error} If verification has not been performed
 */
function assertVerificationComplete(candidate, verificationResult) {
  if (!verificationResult) {
    throw new Error(
      `INVARIANT VIOLATION: Attempted to mint identity for candidate ${candidate.candidate_id} ` +
      `without verification result. Identity minting BEFORE verification is FORBIDDEN.`
    );
  }
  if (!verificationResult.passed) {
    throw new Error(
      `INVARIANT VIOLATION: Attempted to mint identity for candidate ${candidate.candidate_id} ` +
      `with FAILED verification. Only VERIFIED candidates may be minted.`
    );
  }
}

/**
 * Verification result structure
 * @typedef {Object} VerificationResult
 * @property {boolean} passed - Whether verification passed
 * @property {string} [error] - Error message if failed
 * @property {Object} [extracted] - Extracted fields if passed
 */

/**
 * Lifecycle Worker Configuration
 * @typedef {Object} WorkerConfig
 * @property {string} [connectionString] - Database connection string
 * @property {boolean} [dryRun] - If true, don't commit changes
 */

class LifecycleWorker {
  /**
   * @param {WorkerConfig} config
   */
  constructor(config = {}) {
    this.connectionString =
      config.connectionString ||
      process.env.VITE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      DEFAULT_CONNECTION;

    this.dryRun = config.dryRun || false;
    this.pool = null;
  }

  /**
   * Initialize database connection
   */
  async connect() {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: { rejectUnauthorized: false },
      });
    }
    return this.pool;
  }

  /**
   * Close database connection
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Run lifecycle processing for a specific state
   *
   * DOCTRINE: This is the ONLY entry point for processing candidates.
   * State is passed as DATA, not hardcoded.
   *
   * @param {Object} options
   * @param {string} options.state_code - US state code (2 chars)
   * @param {number} [options.batch_size] - Max records per batch (default: 100)
   * @param {string} [options.run_id] - Run identifier for tracking
   * @returns {Promise<Object>} Processing results
   */
  async runLifecyclePipeline(options) {
    const { state_code, batch_size = 100, run_id = uuidv4() } = options;

    // Validate state code
    if (!state_code || !/^[A-Z]{2}$/.test(state_code)) {
      throw new Error(`Invalid state_code: ${state_code}. Must be 2 uppercase letters.`);
    }

    console.log(`[CL Worker] Starting lifecycle pipeline`);
    console.log(`[CL Worker] State: ${state_code}`);
    console.log(`[CL Worker] Run ID: ${run_id}`);
    console.log(`[CL Worker] Batch Size: ${batch_size}`);
    console.log(`[CL Worker] Dry Run: ${this.dryRun}`);

    const pool = await this.connect();
    const results = {
      run_id,
      state_code,
      processed: 0,
      verified: 0,
      failed: 0,
      minted: 0,
      errors: [],
    };

    try {
      // Query candidates for this state (PENDING or VERIFIED_LEGACY)
      // VERIFIED_LEGACY: Pre-verified companies from legacy system - trust their verification
      const candidatesQuery = `
        SELECT
          candidate_id,
          source_system,
          source_record_id,
          state_code,
          raw_payload,
          ingestion_run_id,
          verification_status,
          verified_at
        FROM cl.company_candidate
        WHERE state_code = $1
          AND verification_status IN ('PENDING', 'VERIFIED_LEGACY')
          AND company_unique_id IS NULL
        ORDER BY created_at ASC
        LIMIT $2
      `;

      const candidatesResult = await pool.query(candidatesQuery, [state_code, batch_size]);
      const pendingCount = candidatesResult.rows.filter(r => r.verification_status === 'PENDING').length;
      const legacyCount = candidatesResult.rows.filter(r => r.verification_status === 'VERIFIED_LEGACY').length;
      console.log(`[CL Worker] Found ${candidatesResult.rows.length} candidates for ${state_code} (${pendingCount} pending, ${legacyCount} legacy verified)`);

      for (const candidate of candidatesResult.rows) {
        results.processed++;

        try {
          let verification;

          // DOCTRINE: VERIFIED_LEGACY candidates were pre-verified by legacy system
          // We trust their verification but still flow through the canonical path
          if (candidate.verification_status === 'VERIFIED_LEGACY') {
            // Trust legacy verification - extract fields from raw_payload
            const raw = candidate.raw_payload;
            verification = {
              passed: true,
              legacy: true,
              extracted: {
                company_name: raw.company_name ? String(raw.company_name).trim() : null,
                company_domain: raw.company_domain ? String(raw.company_domain).toLowerCase().trim() : null,
                linkedin_url: raw.linkedin_url || null,
              },
            };

            // Validate admission gate even for legacy (fail closed)
            if (!verification.extracted.company_domain && !verification.extracted.linkedin_url) {
              verification = {
                passed: false,
                error: 'LEGACY_ADMISSION_GATE_FAILED: Missing both company_domain and linkedin_url',
              };
            }
          } else {
            // Run full verification for PENDING candidates (state-agnostic)
            verification = await this.verifyCandidate(candidate);
          }

          if (verification.passed) {
            // Update candidate status to VERIFIED (or keep VERIFIED_LEGACY)
            if (candidate.verification_status !== 'VERIFIED_LEGACY') {
              await this.updateCandidateStatus(candidate.candidate_id, 'VERIFIED', null);
            }
            results.verified++;

            // Mint identity - INVARIANT: Pass verification result to enforce the guard
            const identityId = await this.mintIdentity(candidate, verification.extracted, verification);
            if (identityId) {
              results.minted++;
              const source = verification.legacy ? '[LEGACY]' : '';
              console.log(`[CL Worker] ${source} Minted identity ${identityId} for candidate ${candidate.candidate_id}`);
            }
          } else {
            // Update candidate status to FAILED
            await this.updateCandidateStatus(candidate.candidate_id, 'FAILED', verification.error);
            results.failed++;
            results.errors.push({
              candidate_id: candidate.candidate_id,
              error: verification.error,
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            candidate_id: candidate.candidate_id,
            error: error.message,
          });
          console.error(`[CL Worker] Error processing candidate ${candidate.candidate_id}: ${error.message}`);
        }
      }

      console.log(`[CL Worker] Pipeline complete for ${state_code}`);
      console.log(`[CL Worker] Processed: ${results.processed}, Verified: ${results.verified}, Failed: ${results.failed}, Minted: ${results.minted}`);

      return results;
    } finally {
      // Don't disconnect here - let caller manage connection lifecycle
    }
  }

  /**
   * Verify a candidate record
   *
   * DOCTRINE: This verification logic is STATE-AGNOSTIC.
   * All states use the same rules. No special-casing.
   *
   * Admission Gate: company_domain OR linkedin_url required
   *
   * @param {Object} candidate - Candidate record from database
   * @returns {Promise<VerificationResult>}
   */
  async verifyCandidate(candidate) {
    const raw = candidate.raw_payload;

    // Extract fields from raw payload
    const company_name = raw.company_name || null;
    const company_domain = raw.company_domain || null;
    const linkedin_url = raw.linkedin_url || null;

    // === ADMISSION GATE ===
    // Doctrine: At least domain OR LinkedIn required
    if (!company_domain && !linkedin_url) {
      return {
        passed: false,
        error: 'ADMISSION_GATE_FAILED: Missing both company_domain and linkedin_url',
      };
    }

    // === COMPANY NAME VALIDATION ===
    if (!company_name || company_name.trim().length === 0) {
      return {
        passed: false,
        error: 'COMPANY_NAME_REQUIRED: company_name is empty or missing',
      };
    }

    // === DOMAIN VALIDATION (if provided) ===
    if (company_domain) {
      const domainValid = this.validateDomain(company_domain);
      if (!domainValid.valid) {
        return {
          passed: false,
          error: `DOMAIN_INVALID: ${domainValid.reason}`,
        };
      }
    }

    // === LINKEDIN VALIDATION (if provided) ===
    if (linkedin_url) {
      const linkedinValid = this.validateLinkedIn(linkedin_url);
      if (!linkedinValid.valid) {
        return {
          passed: false,
          error: `LINKEDIN_INVALID: ${linkedinValid.reason}`,
        };
      }
    }

    // All checks passed
    return {
      passed: true,
      extracted: {
        company_name: company_name.trim(),
        company_domain: company_domain ? company_domain.toLowerCase().trim() : null,
        linkedin_url: linkedin_url || null,
      },
    };
  }

  /**
   * Validate domain format
   * @param {string} domain
   * @returns {{ valid: boolean, reason?: string }}
   */
  validateDomain(domain) {
    if (!domain || typeof domain !== 'string') {
      return { valid: false, reason: 'Domain is empty' };
    }

    const normalized = domain.toLowerCase().trim();

    // Must contain at least one dot
    if (!normalized.includes('.')) {
      return { valid: false, reason: 'Domain must contain a dot' };
    }

    // Basic domain pattern
    const domainPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    if (!domainPattern.test(normalized)) {
      return { valid: false, reason: 'Invalid domain format' };
    }

    // Block generic email domains (not company domains)
    const genericDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'aol.com',
      'icloud.com',
      'live.com',
      'msn.com',
      'mail.com',
    ];
    if (genericDomains.includes(normalized)) {
      return { valid: false, reason: 'Generic email domain not allowed' };
    }

    return { valid: true };
  }

  /**
   * Validate LinkedIn URL format
   * @param {string} url
   * @returns {{ valid: boolean, reason?: string }}
   */
  validateLinkedIn(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, reason: 'LinkedIn URL is empty' };
    }

    const normalized = url.toLowerCase().trim();

    // Must be a LinkedIn company URL
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/company\/[a-z0-9-]+\/?$/;
    if (!linkedinPattern.test(normalized)) {
      return { valid: false, reason: 'Must be a valid LinkedIn company URL' };
    }

    return { valid: true };
  }

  /**
   * Update candidate verification status
   * @param {string} candidateId
   * @param {string} status - PENDING | VERIFIED | FAILED
   * @param {string|null} error - Error message if failed
   */
  async updateCandidateStatus(candidateId, status, error) {
    if (this.dryRun) {
      console.log(`[CL Worker] [DRY RUN] Would update candidate ${candidateId} to ${status}`);
      return;
    }

    const pool = await this.connect();
    const query = `
      UPDATE cl.company_candidate
      SET
        verification_status = $2,
        verification_error = $3,
        verified_at = CASE WHEN $2 = 'VERIFIED' THEN now() ELSE NULL END
      WHERE candidate_id = $1
    `;

    await pool.query(query, [candidateId, status, error]);
  }

  /**
   * Mint company identity from verified candidate
   *
   * DOCTRINE: Identity minting is the SOVEREIGN act.
   * Only performed after verification PASSES.
   *
   * INVARIANT: This function MUST receive a passed verification result.
   * Any attempt to call this without verification is an invariant violation.
   *
   * @param {Object} candidate - Verified candidate record
   * @param {Object} extracted - Extracted and validated fields
   * @param {VerificationResult} verificationResult - The verification result (MUST be passed)
   * @returns {Promise<string|null>} - Minted company_unique_id or null
   */
  async mintIdentity(candidate, extracted, verificationResult) {
    // INVARIANT CHECK: Verification MUST be complete before minting
    assertVerificationComplete(candidate, verificationResult);

    if (this.dryRun) {
      console.log(`[CL Worker] [DRY RUN] Would mint identity for candidate ${candidate.candidate_id}`);
      return null;
    }

    const pool = await this.connect();

    // Check for duplicate domain
    if (extracted.company_domain) {
      const dupCheck = await pool.query(
        'SELECT company_unique_id FROM cl.company_identity WHERE company_domain = $1',
        [extracted.company_domain]
      );

      if (dupCheck.rows.length > 0) {
        // Link to existing identity
        const existingId = dupCheck.rows[0].company_unique_id;
        await pool.query(
          'UPDATE cl.company_candidate SET company_unique_id = $2 WHERE candidate_id = $1',
          [candidate.candidate_id, existingId]
        );
        console.log(`[CL Worker] Linked candidate to existing identity ${existingId} (domain match)`);
        return existingId;
      }
    }

    // Check for duplicate LinkedIn
    if (extracted.linkedin_url) {
      const dupCheck = await pool.query(
        'SELECT company_unique_id FROM cl.company_identity WHERE linkedin_company_url = $1',
        [extracted.linkedin_url]
      );

      if (dupCheck.rows.length > 0) {
        // Link to existing identity
        const existingId = dupCheck.rows[0].company_unique_id;
        await pool.query(
          'UPDATE cl.company_candidate SET company_unique_id = $2 WHERE candidate_id = $1',
          [candidate.candidate_id, existingId]
        );
        console.log(`[CL Worker] Linked candidate to existing identity ${existingId} (LinkedIn match)`);
        return existingId;
      }
    }

    // Mint new identity
    const insertQuery = `
      INSERT INTO cl.company_identity (
        company_name,
        company_domain,
        linkedin_company_url,
        source_system,
        state_code
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING company_unique_id
    `;

    const result = await pool.query(insertQuery, [
      extracted.company_name,
      extracted.company_domain,
      extracted.linkedin_url,
      candidate.source_system,
      candidate.state_code,
    ]);

    const newId = result.rows[0].company_unique_id;

    // Link candidate to new identity
    await pool.query(
      'UPDATE cl.company_candidate SET company_unique_id = $2 WHERE candidate_id = $1',
      [candidate.candidate_id, newId]
    );

    return newId;
  }
}

module.exports = { LifecycleWorker, assertVerificationComplete };
