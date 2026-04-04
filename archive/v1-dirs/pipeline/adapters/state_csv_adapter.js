/**
 * State CSV Source Adapter (BASE CLASS)
 *
 * DOCTRINE-LOCK: This file encodes non-negotiable intake invariants.
 * All state adapters MUST extend this class.
 *
 * INVARIANTS (LOCKED):
 * 1. state_code MUST be explicitly declared (never parsed from CSV)
 * 2. source_system MUST be explicitly declared (unique per adapter)
 * 3. Identity fields are ONLY: company_name, company_domain, linkedin_url
 * 4. All other CSV fields go to raw_payload ONLY
 * 5. Adapters may NOT share state_code or source_system
 *
 * VIOLATION OF THESE INVARIANTS IS A BUILD FAILURE.
 */

const { SourceAdapter } = require('./source_adapter');

/**
 * Registry of claimed state_code and source_system values.
 * Prevents duplicate claims across adapters.
 * @type {Map<string, string>}
 */
const CLAIMED_STATE_CODES = new Map();
const CLAIMED_SOURCE_SYSTEMS = new Map();

/**
 * Identity field allowlist.
 * ONLY these fields may be extracted for identity purposes.
 * Everything else goes to raw_payload.
 */
const IDENTITY_FIELD_ALLOWLIST = Object.freeze([
  'company_name',
  'company_domain',
  'linkedin_url',
]);

/**
 * CSV Contract - Required headers (at minimum)
 * Name is REQUIRED.
 * Domain OR LinkedIn URL is REQUIRED (at least one).
 */
const CSV_CONTRACT = Object.freeze({
  required: ['Name'],
  identityAnchors: ['Domain', 'LinkedIn URL'], // At least one required
  optional: ['Description', 'Primary Industry', 'Size', 'Type', 'Location', 'Country', 'Find companies'],
});

/**
 * State CSV Source Adapter
 *
 * BASE CLASS for all state-specific CSV adapters.
 * Enforces Company Lifecycle intake invariants at construction time.
 *
 * @extends SourceAdapter
 */
class StateCsvSourceAdapter extends SourceAdapter {
  /**
   * @param {Object} config
   * @param {string} config.source_system - REQUIRED: Unique source identifier (e.g., 'DE_CSV_SS002')
   * @param {string} config.state_code - REQUIRED: US state code (e.g., 'DE', 'NC')
   * @param {string} config.state_name - REQUIRED: Full state name for documentation
   * @throws {Error} If invariants are violated
   */
  constructor(config) {
    // === INVARIANT 1: state_code MUST be explicitly declared ===
    if (!config.state_code) {
      throw new Error(
        'INVARIANT VIOLATION: state_code MUST be explicitly declared. ' +
        'State is NEVER parsed from CSV fields.'
      );
    }

    if (!/^[A-Z]{2}$/.test(config.state_code)) {
      throw new Error(
        `INVARIANT VIOLATION: state_code must be exactly 2 uppercase letters. Got: "${config.state_code}"`
      );
    }

    // === INVARIANT 2: source_system MUST be explicitly declared ===
    if (!config.source_system) {
      throw new Error(
        'INVARIANT VIOLATION: source_system MUST be explicitly declared. ' +
        'Each adapter must have a unique source_system identifier.'
      );
    }

    // === INVARIANT 5: No duplicate state_code or source_system ===
    if (CLAIMED_STATE_CODES.has(config.state_code)) {
      const existingAdapter = CLAIMED_STATE_CODES.get(config.state_code);
      throw new Error(
        `INVARIANT VIOLATION: state_code "${config.state_code}" already claimed by ${existingAdapter}. ` +
        'Adapters may NOT share state_code.'
      );
    }

    if (CLAIMED_SOURCE_SYSTEMS.has(config.source_system)) {
      const existingAdapter = CLAIMED_SOURCE_SYSTEMS.get(config.source_system);
      throw new Error(
        `INVARIANT VIOLATION: source_system "${config.source_system}" already claimed by ${existingAdapter}. ` +
        'Adapters may NOT share source_system.'
      );
    }

    // === INVARIANT: state_name required for documentation ===
    if (!config.state_name) {
      throw new Error(
        'INVARIANT VIOLATION: state_name MUST be provided for documentation purposes.'
      );
    }

    // Call parent constructor
    super({
      source_system: config.source_system,
      state_code: config.state_code,
    });

    // Store state metadata
    this.state_name = config.state_name;

    // Register claims (prevents future conflicts)
    const adapterName = this.constructor.name;
    CLAIMED_STATE_CODES.set(config.state_code, adapterName);
    CLAIMED_SOURCE_SYSTEMS.set(config.source_system, adapterName);

    // Log registration
    console.log(`[StateCsvAdapter] Registered: ${adapterName}`);
    console.log(`[StateCsvAdapter]   state_code: ${config.state_code}`);
    console.log(`[StateCsvAdapter]   source_system: ${config.source_system}`);
  }

  /**
   * Extract ONLY identity fields from raw row.
   *
   * INVARIANT 3: Identity fields are ONLY company_name, company_domain, linkedin_url.
   * INVARIANT 4: All other fields go to raw_payload ONLY.
   *
   * @param {Object} raw - Raw CSV row
   * @returns {Object} Extracted identity fields ONLY
   */
  extractFields(raw) {
    return {
      company_name: this._extractCompanyName(raw),
      company_domain: this._extractDomain(raw),
      linkedin_url: this._extractLinkedIn(raw),
    };
  }

  /**
   * Validate CSV row against contract.
   *
   * @param {Object} raw - Raw CSV row
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateCsvContract(raw) {
    const errors = [];

    // Check required field: Name
    const name = this._extractCompanyName(raw);
    if (!name || name.trim().length === 0) {
      errors.push('CSV_CONTRACT_VIOLATION: "Name" field is required but missing or empty');
    }

    // Check identity anchors: Domain OR LinkedIn URL (at least one)
    const domain = this._extractDomain(raw);
    const linkedin = this._extractLinkedIn(raw);

    if (!domain && !linkedin) {
      errors.push(
        'CSV_CONTRACT_VIOLATION: At least one identity anchor required. ' +
        'Both "Domain" and "LinkedIn URL" are missing or empty.'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Extract company name from raw row.
   * Supports Clay CSV format.
   *
   * @protected
   * @param {Object} raw - Raw CSV row
   * @returns {string|null}
   */
  _extractCompanyName(raw) {
    const name = raw['Name'] || raw['Company Name'] || raw['Legal Name'];
    return name ? String(name).trim() : null;
  }

  /**
   * Extract domain from raw row.
   * Normalizes to lowercase, strips protocol/www.
   *
   * @protected
   * @param {Object} raw - Raw CSV row
   * @returns {string|null}
   */
  _extractDomain(raw) {
    let domain = raw['Domain'] || raw['Website'] || raw['Web Site'];

    if (!domain) return null;

    // Normalize
    let normalized = String(domain).trim().toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.split('/')[0];

    if (!normalized.includes('.')) {
      return null;
    }

    // Block generic email domains
    const genericDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'live.com', 'msn.com', 'mail.com'
    ];
    if (genericDomains.includes(normalized)) {
      return null;
    }

    return normalized;
  }

  /**
   * Extract LinkedIn URL from raw row.
   *
   * @protected
   * @param {Object} raw - Raw CSV row
   * @returns {string|null}
   */
  _extractLinkedIn(raw) {
    const linkedin = raw['LinkedIn URL'] || raw['LinkedIn Company URL'];
    return linkedin ? String(linkedin).trim() : null;
  }

  /**
   * Generate deterministic source record ID.
   *
   * @param {Object} raw - Raw CSV row
   * @param {number} [rowIndex] - Row index for fallback
   * @returns {string}
   */
  getSourceRecordId(raw, rowIndex = 0) {
    const domain = this._extractDomain(raw);
    const linkedin = this._extractLinkedIn(raw);
    const name = this._extractCompanyName(raw);

    if (domain) {
      return `${this.state_code}-DOM-${domain.replace(/\./g, '-')}`;
    }
    if (linkedin) {
      const slug = linkedin.split('/company/')[1]?.replace(/\/$/, '') || '';
      return `${this.state_code}-LI-${slug}`;
    }
    if (name) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      return `${this.state_code}-NAME-${slug}-${rowIndex}`;
    }

    return `${this.state_code}-ROW-${rowIndex}`;
  }
}

/**
 * Get CSV contract specification.
 * Used for documentation and validation.
 *
 * @returns {Object} Frozen CSV contract
 */
function getCsvContract() {
  return CSV_CONTRACT;
}

/**
 * Get identity field allowlist.
 * Used for compile-time guards.
 *
 * @returns {string[]} Frozen allowlist
 */
function getIdentityFieldAllowlist() {
  return IDENTITY_FIELD_ALLOWLIST;
}

/**
 * Clear adapter registry (for testing only).
 * @private
 */
function _clearRegistryForTesting() {
  CLAIMED_STATE_CODES.clear();
  CLAIMED_SOURCE_SYSTEMS.clear();
}

module.exports = {
  StateCsvSourceAdapter,
  getCsvContract,
  getIdentityFieldAllowlist,
  _clearRegistryForTesting,
};
