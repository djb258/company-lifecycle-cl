/**
 * DE CSV Source Adapter
 *
 * SOURCE STREAM: SS-002 - Delaware Company Data
 *
 * DOCTRINE-LOCK:
 * - Extends StateCsvSourceAdapter (inherits all invariants)
 * - state_code: DE (explicitly declared, never parsed)
 * - source_system: DE_CSV_SS002 (unique to this adapter)
 * - Delaware is ONE source stream, not special
 *
 * SUPPORTED FORMATS:
 * - Clay Export (standard CSV format)
 *
 * CSV HEADERS EXPECTED:
 * - Name (required)
 * - Domain (identity anchor)
 * - LinkedIn URL (identity anchor)
 * - Description, Primary Industry, Size, Type, Location, Country (optional → raw_payload)
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { StateCsvSourceAdapter } = require('./state_csv_adapter');

/**
 * DE CSV Source Adapter
 *
 * Reads Delaware company CSV files (Clay exports).
 * Produces standard CandidateRecord objects for intake.
 *
 * INVARIANTS INHERITED FROM StateCsvSourceAdapter:
 * - state_code explicitly declared (DE)
 * - source_system explicitly declared (DE_CSV_SS002)
 * - Identity fields restricted to allowlist
 * - All other fields go to raw_payload only
 *
 * @extends StateCsvSourceAdapter
 */
class DECsvSourceAdapter extends StateCsvSourceAdapter {
  constructor() {
    super({
      source_system: 'DE_CSV_SS002',
      state_code: 'DE',
      state_name: 'Delaware',
    });
  }

  /**
   * Read records from Delaware CSV file.
   *
   * @param {Object} options
   * @param {string} options.filePath - Path to CSV file
   * @yields {CandidateRecord}
   */
  async *read(options) {
    if (!options.filePath) {
      throw new Error('filePath is required');
    }

    // Read CSV file
    const fileContent = fs.readFileSync(options.filePath, 'utf-8');

    // Parse CSV
    const rows = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    console.log(`[DECsvAdapter] Parsed ${rows.length} rows from CSV`);

    let rowIndex = 0;
    for (const row of rows) {
      // Validate against CSV contract
      const validation = this.validateCsvContract(row);
      if (!validation.valid) {
        console.warn(`[DECsvAdapter] Row ${rowIndex} contract violation:`, validation.errors);
        // Still yield - let downstream verification handle rejection
      }

      // Use parent's transform which enforces identity field restrictions
      const candidate = this.transform(row);

      // Override source_record_id with DE-specific logic
      candidate.source_record_id = this.getSourceRecordId(row, rowIndex);

      rowIndex++;
      yield candidate;
    }

    console.log(`[DECsvAdapter] Yielded ${rowIndex} candidates`);
  }
}

module.exports = { DECsvSourceAdapter };
