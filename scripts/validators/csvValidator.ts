/**
 * CSV Validation Engine
 *
 * Comprehensive field-level and business rule validation with detailed error reporting.
 */

import type { ParsedCSVRow, ValidationError } from '../types/csvSchema.js';

// ============================================================================
// Field-Level Validators (run in parallel per row)
// ============================================================================

export const fieldValidators = {
  model_id: (value: string, row: number): ValidationError | null => {
    const trimmed = value.trim();

    if (trimmed !== value) {
      return { rowNumber: row, field: 'model_id', value,
               error: 'Contains leading/trailing whitespace', severity: 'error' };
    }
    if (!trimmed || trimmed.length === 0) {
      return { rowNumber: row, field: 'model_id', value,
               error: 'Required field is empty', severity: 'error' };
    }
    if (trimmed.length > 100) {
      return { rowNumber: row, field: 'model_id', value,
               error: 'Exceeds 100 character limit', severity: 'error' };
    }
    if (!/^[a-z0-9\-_.]+$/i.test(trimmed)) {
      return { rowNumber: row, field: 'model_id', value,
               error: 'Contains invalid characters (allowed: a-z, 0-9, -, _, .)',
               severity: 'error' };
    }
    return null;
  },

  provider: (value: string, row: number): ValidationError | null => {
    const trimmed = value.trim();

    if (trimmed !== value) {
      return { rowNumber: row, field: 'provider', value,
               error: 'Contains leading/trailing whitespace', severity: 'error' };
    }
    if (trimmed !== 'openai' && trimmed !== 'anthropic') {
      return { rowNumber: row, field: 'provider', value,
               error: 'Must be "openai" or "anthropic" (case-sensitive)',
               severity: 'error' };
    }
    return null;
  },

  model_name: (value: string, row: number): ValidationError | null => {
    const trimmed = value.trim();

    if (!trimmed || trimmed.length === 0) {
      return { rowNumber: row, field: 'model_name', value,
               error: 'Required field is empty', severity: 'error' };
    }
    if (trimmed.length > 100) {
      return { rowNumber: row, field: 'model_name', value,
               error: 'Exceeds 100 character limit', severity: 'error' };
    }
    return null;
  },

  price: (fieldName: string, value: string, row: number,
          required: boolean): ValidationError | null => {
    const trimmed = value.trim();

    if (!required && trimmed === '') {
      return null;
    }

    if (required && trimmed === '') {
      return { rowNumber: row, field: fieldName, value,
               error: 'Required price field is empty', severity: 'error' };
    }

    const num = parseFloat(trimmed);

    if (isNaN(num)) {
      return { rowNumber: row, field: fieldName, value,
               error: 'Not a valid number', severity: 'error' };
    }
    if (!isFinite(num)) {
      return { rowNumber: row, field: fieldName, value,
               error: 'Must be a finite number', severity: 'error' };
    }
    if (num < 0.001) {
      return { rowNumber: row, field: fieldName, value,
               error: 'Price must be >= 0.001 (minimum $0.001 per 1M tokens)',
               severity: 'error' };
    }
    if (num > 1000.00) {
      return { rowNumber: row, field: fieldName, value,
               error: 'Price must be <= 1000.00 (maximum $1000 per 1M tokens)',
               severity: 'warning' };
    }

    const decimalMatch = trimmed.match(/\.(\d+)$/);
    if (decimalMatch && decimalMatch[1].length > 3) {
      return { rowNumber: row, field: fieldName, value,
               error: 'Maximum 3 decimal places allowed', severity: 'error' };
    }

    return null;
  },

  boolean: (fieldName: string, value: string, row: number): ValidationError | null => {
    const trimmed = value.trim();

    if (trimmed !== value) {
      return { rowNumber: row, field: fieldName, value,
               error: 'Contains leading/trailing whitespace', severity: 'error' };
    }
    if (trimmed !== 'true' && trimmed !== 'false') {
      return { rowNumber: row, field: fieldName, value,
               error: 'Must be "true" or "false" (case-sensitive)',
               severity: 'error' };
    }
    return null;
  },

  release_date: (value: string, row: number): ValidationError | null => {
    const trimmed = value.trim();

    if (trimmed !== value) {
      return { rowNumber: row, field: 'release_date', value,
               error: 'Contains leading/trailing whitespace', severity: 'error' };
    }
    if (!trimmed || trimmed.length === 0) {
      return { rowNumber: row, field: 'release_date', value,
               error: 'Required field is empty', severity: 'error' };
    }

    const datePattern = /^(\d{4})-(\d{2})$/;
    const match = trimmed.match(datePattern);

    if (!match) {
      return { rowNumber: row, field: 'release_date', value,
               error: 'Must be in YYYY-MM format (e.g., 2024-05)',
               severity: 'error' };
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);

    if (year < 2020 || year > 2099) {
      return { rowNumber: row, field: 'release_date', value,
               error: 'Year must be between 2020 and 2099', severity: 'error' };
    }
    if (month < 1 || month > 12) {
      return { rowNumber: row, field: 'release_date', value,
               error: 'Month must be between 01 and 12', severity: 'error' };
    }

    return null;
  },

  notes: (value: string, row: number): ValidationError | null => {
    const trimmed = value.trim();

    if (!trimmed || trimmed.length === 0) {
      return { rowNumber: row, field: 'notes', value,
               error: 'Required field is empty', severity: 'error' };
    }
    if (trimmed.length > 1000) {
      return { rowNumber: row, field: 'notes', value,
               error: 'Exceeds 1000 character limit', severity: 'error' };
    }

    if (!/verified\s+\d{4}-\d{2}-\d{2}/i.test(trimmed)) {
      return { rowNumber: row, field: 'notes', value,
               error: 'Should contain verification date (e.g., "verified 2025-11-01")',
               severity: 'warning' };
    }

    return null;
  }
};

// ============================================================================
// Business Rule Validators (run after all rows parsed)
// ============================================================================

export const businessRuleValidators = {
  uniqueModelIds: (rows: ParsedCSVRow[]): ValidationError[] => {
    const seen = new Map<string, number>();
    const errors: ValidationError[] = [];

    for (const row of rows) {
      const existing = seen.get(row.model_id);
      if (existing !== undefined) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'model_id',
          value: row.model_id,
          error: `Duplicate model_id (first seen on row ${existing})`,
          severity: 'error'
        });
      } else {
        seen.set(row.model_id, row.rowNumber);
      }
    }

    return errors;
  },

  cacheConsistency: (rows: ParsedCSVRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    for (const row of rows) {
      if (row.supports_cache && (row.cache_write_price === null || row.cache_read_price === null)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'supports_cache',
          value: 'true',
          error: 'supports_cache=true but cache prices are missing',
          severity: 'error'
        });
      }

      if (!row.supports_cache && (row.cache_write_price !== null || row.cache_read_price !== null)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'supports_cache',
          value: 'false',
          error: 'supports_cache=false but cache prices are present',
          severity: 'warning'
        });
      }

      if (row.cache_write_price !== null && row.cache_read_price !== null) {
        if (row.cache_write_price < row.cache_read_price) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'cache_write_price',
            value: row.cache_write_price.toString(),
            error: `cache_write_price (${row.cache_write_price}) < cache_read_price (${row.cache_read_price})`,
            severity: 'error'
          });
        }
      }
    }

    return errors;
  },

  priceReasonability: (rows: ParsedCSVRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    for (const row of rows) {
      if (row.output_price < row.input_price) {
        errors.push({
          rowNumber: row.rowNumber,
          field: 'output_price',
          value: row.output_price.toString(),
          error: `output_price (${row.output_price}) < input_price (${row.input_price}) - unusual pricing pattern`,
          severity: 'warning'
        });
      }

      if (row.cache_read_price !== null) {
        const expectedCacheRead = row.input_price * 0.15;
        if (row.cache_read_price > expectedCacheRead) {
          errors.push({
            rowNumber: row.rowNumber,
            field: 'cache_read_price',
            value: row.cache_read_price.toString(),
            error: `cache_read_price (${row.cache_read_price}) is > 15% of input_price (expected ~10% or ${(row.input_price * 0.1).toFixed(2)})`,
            severity: 'warning'
          });
        }
      }
    }

    return errors;
  },

  providerConsistency: (rows: ParsedCSVRow[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    const openaiWithCache = rows.filter(r => r.provider === 'openai' && r.supports_cache);
    for (const row of openaiWithCache) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'supports_cache',
        value: 'true',
        error: 'OpenAI models do not support caching (as of Jan 2025)',
        severity: 'warning'
      });
    }

    const claudeWithoutCache = rows.filter(r => r.provider === 'anthropic' && !r.supports_cache);
    for (const row of claudeWithoutCache) {
      errors.push({
        rowNumber: row.rowNumber,
        field: 'supports_cache',
        value: 'false',
        error: 'Claude models typically support caching - verify this is correct',
        severity: 'warning'
      });
    }

    return errors;
  }
};
