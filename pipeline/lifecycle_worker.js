/**
 * Lifecycle Worker
 *
 * SOVEREIGN INTAKE ENGINE
 *
 * DOCTRINE:
 * - State is DATA, not CODE
 * - NC is Source Stream #001, not special
 * - All states use the SAME verification logic
 * - Identity minting only after VERIFIED status
 *
 * HARD CONSTRAINTS:
 * - Do NOT delete or re-mint existing IDs
 * - Do NOT weaken verification logic
 * - Do NOT special-case any state
 * - Fail closed if verification fails
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

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
      process.env.DATABASE_URL;

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
      // Query pending candidates for this state
      const candidatesQuery = `
        SELECT
          candidate_id,
          source_system,
          source_record_id,
          state_code,
          raw_payload,
          ingestion_run_id
        FROM cl.company_candidate
        WHERE state_code = $1
          AND verification_status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $2
      `;

      const candidatesResult = await pool.query(candidatesQuery, [state_code, batch_size]);
      console.log(`[CL Worker] Found ${candidatesResult.rows.length} pending candidates for ${state_code}`);

      for (const candidate of candidatesResult.rows) {
        results.processed++;

        try {
          // Run verification (state-agnostic)
          const verification = await this.verifyCandidate(candidate);

          if (verification.passed) {
            // Update candidate status to VERIFIED
            await this.updateCandidateStatus(candidate.candidate_id, 'VERIFIED', null);
            results.verified++;

            // Mint identity
            const identityId = await this.mintIdentity(candidate, verification.extracted);
            if (identityId) {
              results.minted++;
              console.log(`[CL Worker] Minted identity ${identityId} for candidate ${candidate.candidate_id}`);
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
   * @param {Object} candidate - Verified candidate record
   * @param {Object} extracted - Extracted and validated fields
   * @returns {Promise<string|null>} - Minted company_unique_id or null
   */
  async mintIdentity(candidate, extracted) {
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

module.exports = { LifecycleWorker };
