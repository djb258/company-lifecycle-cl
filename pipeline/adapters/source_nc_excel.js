/**
 * NC Excel Source Adapter
 *
 * SOURCE STREAM: #001 - North Carolina Secretary of State Excel Export
 *
 * DOCTRINE:
 * - NC is ONE source stream, not the lifecycle itself
 * - This adapter ONLY ingests, it does NOT verify
 * - All NC-specific logic is contained HERE, not in lifecycle
 * - Output is standard CandidateRecord format
 *
 * HARD CONSTRAINTS:
 * - Do NOT put verification logic here
 * - Do NOT special-case NC in lifecycle code
 * - State (NC) is DATA, embedded in every record
 */

const XLSX = require('xlsx');
const { SourceAdapter } = require('./source_adapter');

/**
 * NC SOS Excel Column Mapping
 *
 * Maps Excel columns to standard fields.
 * This is the ONLY place NC-specific column names should appear.
 */
const NC_COLUMN_MAP = {
  // Identity columns
  sosId: 'SOS ID',
  companyName: 'Company Name',
  // Alternative names
  companyNameAlt: 'Legal Name',

  // Domain/contact columns
  website: 'Website',
  websiteAlt: 'Web Site',
  email: 'Email',

  // Address columns (for domain extraction)
  mailingAddress: 'Mailing Address',
  principalAddress: 'Principal Address',

  // Status columns
  status: 'Status',
  statusAlt: 'Company Status',

  // Date columns
  dateFormed: 'Date Formed',
  dateIncorporated: 'Date Incorporated',
};

/**
 * NC Excel Source Adapter
 *
 * Reads NC Secretary of State Excel files and produces
 * standard CandidateRecord objects for intake.
 */
class NCExcelSourceAdapter extends SourceAdapter {
  constructor() {
    super({
      source_system: 'nc_sos_excel',
      state_code: 'NC',
    });
  }

  /**
   * Read records from NC Excel file
   *
   * @param {Object} options
   * @param {string} options.filePath - Path to Excel file
   * @param {string} [options.sheetName] - Sheet name (default: first sheet)
   * @yields {CandidateRecord}
   */
  async *read(options) {
    if (!options.filePath) {
      throw new Error('filePath is required');
    }

    // Read Excel file
    const workbook = XLSX.readFile(options.filePath);
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    // Convert to JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    for (const row of rows) {
      yield this.transform(row);
    }
  }

  /**
   * Get source record ID from NC SOS row
   *
   * Uses SOS ID as unique identifier within NC source.
   *
   * @param {Object} raw - Raw Excel row
   * @returns {string}
   */
  getSourceRecordId(raw) {
    const sosId = raw[NC_COLUMN_MAP.sosId] || raw['SOS ID'] || raw['sosId'];
    if (!sosId) {
      throw new Error('NC record missing SOS ID');
    }
    return String(sosId).trim();
  }

  /**
   * Extract standard fields from NC Excel row
   *
   * @param {Object} raw - Raw Excel row
   * @returns {Object}
   */
  extractFields(raw) {
    return {
      company_name: this._extractCompanyName(raw),
      company_domain: this._extractDomain(raw),
      linkedin_url: null, // NC SOS doesn't provide LinkedIn
    };
  }

  /**
   * Extract company name from row
   * @private
   */
  _extractCompanyName(raw) {
    const name =
      raw[NC_COLUMN_MAP.companyName] ||
      raw[NC_COLUMN_MAP.companyNameAlt] ||
      raw['Company Name'] ||
      raw['Legal Name'];

    return name ? String(name).trim() : null;
  }

  /**
   * Extract domain from row
   * @private
   */
  _extractDomain(raw) {
    // Try website field first
    let domain =
      raw[NC_COLUMN_MAP.website] ||
      raw[NC_COLUMN_MAP.websiteAlt] ||
      raw['Website'] ||
      raw['Web Site'];

    if (domain) {
      return this._normalizeDomain(domain);
    }

    // Try extracting from email
    const email = raw[NC_COLUMN_MAP.email] || raw['Email'];
    if (email && email.includes('@')) {
      const emailDomain = email.split('@')[1];
      if (emailDomain && !this._isGenericEmailDomain(emailDomain)) {
        return this._normalizeDomain(emailDomain);
      }
    }

    return null;
  }

  /**
   * Normalize domain to standard format
   * @private
   */
  _normalizeDomain(domain) {
    if (!domain) return null;

    let normalized = String(domain).trim().toLowerCase();

    // Remove protocol
    normalized = normalized.replace(/^https?:\/\//, '');

    // Remove www.
    normalized = normalized.replace(/^www\./, '');

    // Remove trailing slash and path
    normalized = normalized.split('/')[0];

    // Validate basic domain format
    if (!normalized.includes('.')) {
      return null;
    }

    return normalized;
  }

  /**
   * Check if domain is a generic email provider
   * @private
   */
  _isGenericEmailDomain(domain) {
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
    return genericDomains.includes(domain.toLowerCase());
  }
}

module.exports = { NCExcelSourceAdapter, NC_COLUMN_MAP };
