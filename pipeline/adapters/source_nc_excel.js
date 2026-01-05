/**
 * NC Excel Source Adapter
 *
 * SOURCE STREAM: SS-001 - North Carolina Company Data
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
 *
 * SUPPORTED FORMATS:
 * - NC SOS Excel (official state export)
 * - Clay Export (enrichment platform export)
 */

const XLSX = require('xlsx');
const { SourceAdapter } = require('./source_adapter');

/**
 * NC Column Mappings for different source formats
 *
 * Maps various Excel column names to standard fields.
 * This is the ONLY place NC-specific column names should appear.
 */
const NC_COLUMN_MAP = {
  // Identity columns - SOS format
  sosId: 'SOS ID',
  companyName: 'Company Name',
  companyNameAlt: 'Legal Name',

  // Identity columns - Clay format
  clayName: 'Name',

  // Domain/contact columns - SOS format
  website: 'Website',
  websiteAlt: 'Web Site',
  email: 'Email',

  // Domain/contact columns - Clay format
  clayDomain: 'Domain',
  clayLinkedIn: 'LinkedIn URL',

  // Location columns
  location: 'Location',
  mailingAddress: 'Mailing Address',
  principalAddress: 'Principal Address',

  // Status columns
  status: 'Status',
  statusAlt: 'Company Status',

  // Date columns
  dateFormed: 'Date Formed',
  dateIncorporated: 'Date Incorporated',

  // Clay-specific
  industry: 'Primary Industry',
  size: 'Size',
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
      source_system: 'NC_EXCEL_SS001',
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
   * Get source record ID from NC row
   *
   * Uses SOS ID if available, otherwise generates deterministic ID
   * from domain/linkedin/name combination.
   *
   * @param {Object} raw - Raw Excel row
   * @param {number} [rowIndex] - Row index for fallback ID
   * @returns {string}
   */
  getSourceRecordId(raw, rowIndex = 0) {
    // Try SOS ID first
    const sosId = raw[NC_COLUMN_MAP.sosId] || raw['SOS ID'] || raw['sosId'];
    if (sosId) {
      return String(sosId).trim();
    }

    // Generate deterministic ID from available fields
    const domain = this._extractDomain(raw);
    const linkedin = raw[NC_COLUMN_MAP.clayLinkedIn] || raw['LinkedIn URL'];
    const name = this._extractCompanyName(raw);

    if (domain) {
      return `NC-DOM-${domain.replace(/\./g, '-')}`;
    }
    if (linkedin) {
      const slug = linkedin.split('/company/')[1]?.replace(/\/$/, '') || '';
      return `NC-LI-${slug}`;
    }
    if (name) {
      // Slugify company name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
      return `NC-NAME-${slug}-${rowIndex}`;
    }

    // Last resort: row index
    return `NC-ROW-${rowIndex}`;
  }

  /**
   * Extract standard fields from NC Excel row
   *
   * Supports both SOS format and Clay export format.
   *
   * @param {Object} raw - Raw Excel row
   * @returns {Object}
   */
  extractFields(raw) {
    return {
      company_name: this._extractCompanyName(raw),
      company_domain: this._extractDomain(raw),
      linkedin_url: this._extractLinkedIn(raw),
    };
  }

  /**
   * Extract LinkedIn URL from row
   * @private
   */
  _extractLinkedIn(raw) {
    const linkedin = raw[NC_COLUMN_MAP.clayLinkedIn] || raw['LinkedIn URL'];
    if (!linkedin) return null;
    return String(linkedin).trim();
  }

  /**
   * Extract company name from row
   * Supports both SOS and Clay formats
   * @private
   */
  _extractCompanyName(raw) {
    const name =
      raw[NC_COLUMN_MAP.companyName] ||
      raw[NC_COLUMN_MAP.companyNameAlt] ||
      raw[NC_COLUMN_MAP.clayName] ||
      raw['Company Name'] ||
      raw['Legal Name'] ||
      raw['Name'];

    return name ? String(name).trim() : null;
  }

  /**
   * Extract domain from row
   * Supports both SOS and Clay formats
   * @private
   */
  _extractDomain(raw) {
    // Try direct domain field first (Clay format)
    let domain =
      raw[NC_COLUMN_MAP.clayDomain] ||
      raw['Domain'] ||
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
