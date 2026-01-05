// ============================================================================
// DEPRECATED: DO NOT USE
// ============================================================================
// This file is part of the OLD NC-specific pipeline.
// USE INSTEAD: pipeline/orchestrator.js
// See deprecated/README.md for details.
// ============================================================================
throw new Error(
  "DEPRECATED: nc-phase-a-validation.js is retired. " +
  "Use 'node pipeline/orchestrator.js --state NC' instead."
);

// NC Phase A: Source Validation (READ-ONLY)
// Validates Companies NC.xlsx without any database writes

import XLSX from 'xlsx';
import path from 'path';

const SOURCE_FILE = 'C:/Users/CUSTOMER PC/Downloads/Companies NC.xlsx';

async function runPhaseA() {
  console.log('========================================');
  console.log('PHASE A: NC Source Validation (READ-ONLY)');
  console.log('========================================\n');
  console.log('Source file:', SOURCE_FILE);

  const report = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE A - NC SOURCE VALIDATION',
    file: SOURCE_FILE,
    counts: {},
    headers: [],
    fieldMapping: {},
    gateZero: { pass: 0, fail: 0, failReasons: {} },
    samples: { pass: [], fail: [] }
  };

  try {
    // 1. Load Excel file
    console.log('\n1. Loading Excel file...');
    const workbook = XLSX.readFile(SOURCE_FILE);
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet name:', sheetName);

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    report.counts.totalRows = data.length;
    console.log('Total rows:', report.counts.totalRows);

    // 2. Inspect headers
    console.log('\n2. Inspecting headers...');
    if (data.length > 0) {
      report.headers = Object.keys(data[0]);
      console.log('Headers found:');
      report.headers.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
    }

    // 3. Map fields to CL intake schema
    console.log('\n3. Field mapping to CL schema...');
    const fieldMap = {
      company_name: findField(report.headers, ['company', 'name', 'company_name', 'company name', 'companyname']),
      company_domain: findField(report.headers, ['domain', 'website', 'url', 'company_domain', 'website_url', 'web']),
      linkedin_url: findField(report.headers, ['linkedin', 'linkedin_url', 'linkedin_company_url', 'linkedin url']),
      state: findField(report.headers, ['state', 'hq_state', 'headquarters_state', 'company_state', 'location_state']),
      ein: findField(report.headers, ['ein', 'tax_id', 'employer_id']),
      industry: findField(report.headers, ['industry', 'sector']),
      employee_count: findField(report.headers, ['employee', 'employees', 'employee_count', 'headcount', 'size'])
    };

    report.fieldMapping = fieldMap;
    console.log('Field mapping:');
    Object.entries(fieldMap).forEach(([k, v]) => {
      console.log(`  ${k}: ${v || 'NOT FOUND'}`);
    });

    // 4. Gate Zero validation per row
    console.log('\n4. Running Gate Zero validation...');

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const reasons = [];

      // Check company name
      const companyName = getFieldValue(row, fieldMap.company_name);
      if (!companyName || companyName.trim() === '') {
        reasons.push('MISSING_COMPANY_NAME');
      }

      // Check state = NC (Location field format: "City, NC" or "City, North Carolina")
      const location = getFieldValue(row, fieldMap.state);
      const isNC = location && (
        location.toUpperCase() === 'NC' ||
        location.toUpperCase() === 'NORTH CAROLINA' ||
        location.toUpperCase().endsWith(', NC') ||
        location.toUpperCase().endsWith(',NC') ||
        location.toUpperCase().includes('NORTH CAROLINA') ||
        location.toUpperCase().includes(', NC,') ||
        /,\s*NC\s*$/i.test(location)
      );
      if (!isNC && location) {
        reasons.push(`STATE_NOT_NC (${location})`);
      }
      if (!location) {
        reasons.push('MISSING_STATE');
      }

      // Check at least one identity anchor
      const domain = getFieldValue(row, fieldMap.company_domain);
      const linkedin = getFieldValue(row, fieldMap.linkedin_url);
      if (!domain && !linkedin) {
        reasons.push('MISSING_IDENTITY_ANCHOR');
      }

      // Categorize
      if (reasons.length === 0 || (reasons.length === 1 && reasons[0] === 'MISSING_STATE' && isNC !== false)) {
        // Pass if only issue is missing state field but we assume all are NC
        report.gateZero.pass++;
        if (report.samples.pass.length < 3) {
          report.samples.pass.push({
            row: i + 1,
            company_name: companyName,
            domain: domain,
            linkedin: linkedin,
            state: location
          });
        }
      } else {
        report.gateZero.fail++;
        reasons.forEach(r => {
          const baseReason = r.split(' ')[0];
          report.gateZero.failReasons[baseReason] = (report.gateZero.failReasons[baseReason] || 0) + 1;
        });
        if (report.samples.fail.length < 5) {
          report.samples.fail.push({
            row: i + 1,
            company_name: companyName,
            domain: domain,
            linkedin: linkedin,
            state: location,
            reasons: reasons
          });
        }
      }
    }

    // 5. Summary
    console.log('\n========================================');
    console.log('PHASE A VALIDATION SUMMARY');
    console.log('========================================');
    console.log('\nCounts:');
    console.log('  Total rows in file:', report.counts.totalRows);
    console.log('  Gate Zero PASS:', report.gateZero.pass);
    console.log('  Gate Zero FAIL:', report.gateZero.fail);

    console.log('\nFailure breakdown:');
    Object.entries(report.gateZero.failReasons).forEach(([reason, count]) => {
      console.log(`  - ${reason}: ${count}`);
    });

    console.log('\nSample PASS rows:');
    report.samples.pass.forEach(s => {
      console.log(`  Row ${s.row}: ${s.company_name}`);
      console.log(`    Domain: ${s.domain || 'NULL'}`);
      console.log(`    LinkedIn: ${s.linkedin || 'NULL'}`);
    });

    if (report.samples.fail.length > 0) {
      console.log('\nSample FAIL rows:');
      report.samples.fail.forEach(s => {
        console.log(`  Row ${s.row}: ${s.company_name || 'NO NAME'}`);
        console.log(`    Reasons: ${s.reasons.join(', ')}`);
      });
    }

    console.log('\n========================================');
    console.log('PHASE A: COMPLETE (NO DATABASE WRITES)');
    console.log('========================================');

    return report;

  } catch (error) {
    console.error('ERROR:', error.message);
    throw error;
  }
}

// Helper: find field by possible names
function findField(headers, possibleNames) {
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = lowerHeaders.findIndex(h => h.includes(lowerName) || lowerName.includes(h));
    if (idx >= 0) return headers[idx];
  }
  return null;
}

// Helper: get field value
function getFieldValue(row, fieldName) {
  if (!fieldName) return null;
  const val = row[fieldName];
  if (val === undefined || val === null || val === '') return null;
  return String(val).trim();
}

runPhaseA();
