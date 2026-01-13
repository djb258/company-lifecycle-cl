/**
 * NC Excel Source Adapter
 *
 * SOURCE STREAM: SS-001 - North Carolina Company Data
 *
 * DOCTRINE-LOCK:
 * - Extends StateCsvSourceAdapter (inherits all invariants)
 * - state_code: NC (explicitly declared, never parsed)
 * - source_system: NC_EXCEL_SS001 (unique to this adapter)
 * - NC is ONE source stream, not special
 *
 * SUPPORTED FORMATS:
 * - NC SOS Excel (official state export)
 * - Clay Export (enrichment platform export)
 */

const XLSX = require('xlsx');
const { StateCsvSourceAdapter } = require('./state_csv_adapter');

/**
 * NC-specific column mappings.
 * Maps various Excel column names to standard fields.
 * These are in ADDITION to the base class mappings.
 */
const NC_COLUMN_MAP = {
  // SOS format specific
  sosId: 'SOS ID',
  companyNameAlt: 'Legal Name',

  // SOS contact columns
  websiteAlt: 'Web Site',
  email: 'Email',

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
};

/**
 * NC Excel Source Adapter
 *
 * Reads NC Secretary of State Excel files and Clay exports.
 * Produces standard CandidateRecord objects for intake.
 *
 * INVARIANTS INHERITED FROM StateCsvSourceAdapter:
 * - state_code explicitly declared (NC)
 * - source_system explicitly declared (NC_EXCEL_SS001)
 * - Identity fields restricted to allowlist
 * - All other fields go to raw_payload only
 *
 * @extends StateCsvSourceAdapter
 */
class NCExcelSourceAdapter extends StateCsvSourceAdapter {
  constructor() {
    super({
      source_system: 'NC_EXCEL_SS001',
      state_code: 'NC',
      state_name: 'North Carolina',
    });
  }

  /**
   * Read records from NC Excel file.
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

    let rowIndex = 0;
    for (const row of rows) {
      // Use parent's transform which enforces identity field restrictions
      const candidate = this.transform(row);

      // Override source_record_id with NC-specific logic
      candidate.source_record_id = this.getSourceRecordId(row, rowIndex);

      rowIndex++;
      yield candidate;
    }
  }

  /**
   * Get source record ID from NC row.
   * Uses SOS ID if available, otherwise falls back to base class logic.
   *
   * @param {Object} raw - Raw Excel row
   * @param {number} [rowIndex] - Row index for fallback ID
   * @returns {string}
   */
  getSourceRecordId(raw, rowIndex = 0) {
    // Try SOS ID first (NC-specific)
    const sosId = raw[NC_COLUMN_MAP.sosId] || raw['SOS ID'] || raw['sosId'];
    if (sosId) {
      return `NC-SOS-${String(sosId).trim()}`;
    }

    // Fall back to base class logic
    return super.getSourceRecordId(raw, rowIndex);
  }

  /**
   * Extract company name from NC row.
   * Extends base class to support NC SOS format.
   *
   * @protected
   * @param {Object} raw - Raw Excel row
   * @returns {string|null}
   */
  _extractCompanyName(raw) {
    // Try base class fields first
    const baseName = super._extractCompanyName(raw);
    if (baseName) return baseName;

    // NC SOS specific: Legal Name
    const legalName = raw[NC_COLUMN_MAP.companyNameAlt] || raw['Legal Name'];
    return legalName ? String(legalName).trim() : null;
  }

  /**
   * Extract domain from NC row.
   * Extends base class to support NC SOS format and email extraction.
   *
   * @protected
   * @param {Object} raw - Raw Excel row
   * @returns {string|null}
   */
  _extractDomain(raw) {
    // Try base class extraction first
    const baseDomain = super._extractDomain(raw);
    if (baseDomain) return baseDomain;

    // NC SOS specific: Web Site
    const webSite = raw[NC_COLUMN_MAP.websiteAlt] || raw['Web Site'];
    if (webSite) {
      return this._normalizeDomain(webSite);
    }

    // Try extracting from email (NC SOS format)
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
   * Normalize domain to standard format.
   * @private
   */
  _normalizeDomain(domain) {
    if (!domain) return null;

    let normalized = String(domain).trim().toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, '');
    normalized = normalized.replace(/^www\./, '');
    normalized = normalized.split('/')[0];

    if (!normalized.includes('.')) {
      return null;
    }

    return normalized;
  }

  /**
   * Check if domain is a generic email provider.
   * @private
   */
  _isGenericEmailDomain(domain) {
    const genericDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
      'aol.com', 'icloud.com', 'live.com', 'msn.com', 'mail.com'
    ];
    return genericDomains.includes(domain.toLowerCase());
  }
}

module.exports = { NCExcelSourceAdapter, NC_COLUMN_MAP };
