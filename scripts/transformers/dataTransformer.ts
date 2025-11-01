/**
 * Data Transformer
 *
 * Transforms validated CSV rows to ScrapedModel format for code generation.
 */

import type { ParsedCSVRow } from '../types/csvSchema.js';
import type { ScrapedModel } from '../utils/pricingHelpers.js';

export function transformToScrapedModel(row: ParsedCSVRow): ScrapedModel {
  return {
    id: row.model_id,
    name: row.model_name,
    provider: row.provider,
    inputPerMToken: row.input_price,
    outputPerMToken: row.output_price,
    cacheWritePerMToken: row.cache_write_price ?? undefined,
    cacheReadPerMToken: row.cache_read_price ?? undefined,
    supportsCache: row.supports_cache,
    isDeprecated: row.is_deprecated,
    releaseDate: row.release_date
  };
}

export function transformAllRows(rows: ParsedCSVRow[]): ScrapedModel[] {
  return rows.map(transformToScrapedModel);
}
