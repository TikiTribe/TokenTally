/**
 * CSV Schema Type Definitions
 *
 * Strict type definitions for pricing CSV structure and validation results.
 */

export interface CSVRow {
  model_id: string;
  provider: string;
  model_name: string;
  input_price: string;
  output_price: string;
  cache_write_price: string;
  cache_read_price: string;
  supports_cache: string;
  is_deprecated: string;
  release_date: string;
  notes: string;
}

export interface ParsedCSVRow {
  model_id: string;
  provider: 'openai' | 'anthropic';
  model_name: string;
  input_price: number;
  output_price: number;
  cache_write_price: number | null;
  cache_read_price: number | null;
  supports_cache: boolean;
  is_deprecated: boolean;
  release_date: string;
  notes: string;
  rowNumber: number;
}

export interface ValidationError {
  rowNumber: number;
  field: string;
  value: string;
  error: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRows: ParsedCSVRow[];
}
