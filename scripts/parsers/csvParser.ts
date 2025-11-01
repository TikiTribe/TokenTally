/**
 * CSV Parser
 *
 * Parses pricing CSV file with comprehensive field validation and error reporting.
 */

import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import type { CSVRow, ParsedCSVRow, ValidationError } from '../types/csvSchema.js';
import { fieldValidators } from '../validators/csvValidator.js';

export interface ParseResult {
  rows: ParsedCSVRow[];
  errors: ValidationError[];
  warnings: ValidationError[];
}

export async function parseCSVFile(filePath: string): Promise<ParseResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const rows: ParsedCSVRow[] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Security: Check file size (max 1MB for CSV)
    if (fileContent.length > 1_000_000) {
      errors.push({
        rowNumber: 0,
        field: 'file',
        value: filePath,
        error: 'CSV file exceeds 1MB size limit',
        severity: 'error'
      });
      return { rows, errors, warnings };
    }

    // Parse CSV with csv-parse library
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: false,
      relaxColumnCount: false,
      cast: false,
      bom: true
    }) as CSVRow[];

    // Validate each row in parallel (field-level validation)
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2;
      const rowErrors: ValidationError[] = [];
      const rowWarnings: ValidationError[] = [];

      // Parallel field validation
      const validationResults = await Promise.all([
        Promise.resolve(fieldValidators.model_id(record.model_id, rowNumber)),
        Promise.resolve(fieldValidators.provider(record.provider, rowNumber)),
        Promise.resolve(fieldValidators.model_name(record.model_name, rowNumber)),
        Promise.resolve(fieldValidators.price('input_price', record.input_price, rowNumber, true)),
        Promise.resolve(fieldValidators.price('output_price', record.output_price, rowNumber, true)),
        Promise.resolve(fieldValidators.price('cache_write_price', record.cache_write_price, rowNumber, false)),
        Promise.resolve(fieldValidators.price('cache_read_price', record.cache_read_price, rowNumber, false)),
        Promise.resolve(fieldValidators.boolean('supports_cache', record.supports_cache, rowNumber)),
        Promise.resolve(fieldValidators.boolean('is_deprecated', record.is_deprecated, rowNumber)),
        Promise.resolve(fieldValidators.release_date(record.release_date, rowNumber)),
        Promise.resolve(fieldValidators.notes(record.notes, rowNumber))
      ]);

      // Collect errors/warnings
      for (const result of validationResults) {
        if (result !== null) {
          if (result.severity === 'error') {
            rowErrors.push(result);
          } else {
            rowWarnings.push(result);
          }
        }
      }

      // If row has no errors, parse and add to results
      if (rowErrors.length === 0) {
        rows.push({
          model_id: record.model_id.trim(),
          provider: record.provider as 'openai' | 'anthropic',
          model_name: record.model_name.trim(),
          input_price: parseFloat(record.input_price),
          output_price: parseFloat(record.output_price),
          cache_write_price: record.cache_write_price.trim() ? parseFloat(record.cache_write_price) : null,
          cache_read_price: record.cache_read_price.trim() ? parseFloat(record.cache_read_price) : null,
          supports_cache: record.supports_cache === 'true',
          is_deprecated: record.is_deprecated === 'true',
          release_date: record.release_date.trim(),
          notes: record.notes.trim(),
          rowNumber
        });
      }

      errors.push(...rowErrors);
      warnings.push(...rowWarnings);
    }

  } catch (error) {
    errors.push({
      rowNumber: 0,
      field: 'file',
      value: filePath,
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'error'
    });
  }

  return { rows, errors, warnings };
}
