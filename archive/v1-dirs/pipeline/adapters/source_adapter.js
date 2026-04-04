/**
 * Source Adapter Interface
 *
 * DOCTRINE:
 * - State is DATA, not CODE
 * - NC is Source Stream #001, not special
 * - All sources produce the same output format
 * - Adapters do NOT verify, they only ingest
 *
 * HARD CONSTRAINTS:
 * - Adapter MUST produce state_code
 * - Adapter MUST produce source_system
 * - Adapter MUST produce source_record_id
 * - Adapter MUST NOT contain verification logic
 */

/**
 * @typedef {Object} CandidateRecord
 * @property {string} source_system - Origin system identifier
 * @property {string} source_record_id - Unique ID within source
 * @property {string} state_code - US state code (2 chars)
 * @property {Object} raw_payload - Complete raw data
 * @property {string} [company_name] - Extracted company name
 * @property {string} [company_domain] - Extracted domain
 * @property {string} [linkedin_url] - Extracted LinkedIn URL
 */

/**
 * Base Source Adapter Class
 *
 * All source adapters MUST extend this class.
 * Adapters are responsible for:
 * 1. Reading from their source
 * 2. Extracting fields
 * 3. Producing CandidateRecord objects
 *
 * Adapters are NOT responsible for:
 * - Verification
 * - Identity minting
 * - Lifecycle state changes
 */
class SourceAdapter {
  /**
   * @param {Object} config
   * @param {string} config.source_system - Unique source identifier
   * @param {string} config.state_code - Default state code for this source
   */
  constructor(config) {
    if (!config.source_system) {
      throw new Error('source_system is required');
    }
    if (!config.state_code || !/^[A-Z]{2}$/.test(config.state_code)) {
      throw new Error('Valid state_code (2 uppercase letters) is required');
    }

    this.source_system = config.source_system;
    this.state_code = config.state_code;
  }

  /**
   * Read records from source
   * MUST be implemented by subclass
   *
   * @param {Object} options - Source-specific options
   * @returns {AsyncGenerator<CandidateRecord>}
   */
  async *read(options) {
    throw new Error('read() must be implemented by subclass');
  }

  /**
   * Extract standard fields from raw payload
   * MAY be overridden by subclass
   *
   * @param {Object} raw - Raw source record
   * @returns {Object} Extracted fields
   */
  extractFields(raw) {
    return {
      company_name: null,
      company_domain: null,
      linkedin_url: null,
    };
  }

  /**
   * Generate source record ID from raw payload
   * MUST be implemented by subclass
   *
   * @param {Object} raw - Raw source record
   * @returns {string} Unique ID within this source
   */
  getSourceRecordId(raw) {
    throw new Error('getSourceRecordId() must be implemented by subclass');
  }

  /**
   * Transform raw record into CandidateRecord
   *
   * @param {Object} raw - Raw source record
   * @returns {CandidateRecord}
   */
  transform(raw) {
    const extracted = this.extractFields(raw);
    return {
      source_system: this.source_system,
      source_record_id: this.getSourceRecordId(raw),
      state_code: this.state_code,
      raw_payload: raw,
      ...extracted,
    };
  }
}

module.exports = { SourceAdapter };
