/**
 * Pricing Helper Utilities
 *
 * Shared utilities for pricing data generation and CSV export operations.
 * Used by scripts/scrape-pricing.ts for generating TypeScript pricing configuration.
 */

export interface ScrapedModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  inputPerMToken: number;
  outputPerMToken: number;
  cacheWritePerMToken?: number;
  cacheReadPerMToken?: number;
  supportsCache: boolean;
  isDeprecated: boolean;
  releaseDate?: string;
}

/**
 * Sanitizes values for CSV export to prevent formula injection attacks
 * Implements OWASP A03:2021 - Injection prevention
 *
 * @param value - The value to sanitize (string or number)
 * @returns Sanitized string safe for CSV export
 */
export function sanitizeForCSV(value: string | number): string {
  const str = String(value);

  // Prevent CSV formula injection (OWASP A03:2021)
  // Excel/Sheets execute formulas starting with: = + - @
  if (['=', '+', '-', '@'].some(char => str.startsWith(char))) {
    return `'${str}`; // Prefix with single quote to treat as text
  }

  return str;
}

/**
 * Formats an array of values as a CSV row with proper quoting and escaping
 *
 * @param values - Array of values to format (strings or numbers)
 * @returns Formatted CSV row string
 */
export function formatCSVRow(values: Array<string | number>): string {
  return values
    .map(value => {
      const sanitized = sanitizeForCSV(value);
      const str = String(sanitized);

      // Quote if contains comma, newline, or quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }

      return str;
    })
    .join(',');
}

/**
 * Groups scraped models by provider (OpenAI vs Anthropic)
 *
 * @param models - Array of scraped model data
 * @returns Object with openaiModels and claudeModels arrays
 */
export function groupModelsByProvider(models: ScrapedModel[]): {
  openaiModels: ScrapedModel[];
  claudeModels: ScrapedModel[];
} {
  return {
    openaiModels: models.filter(m => m.provider === 'openai'),
    claudeModels: models.filter(m => m.provider === 'anthropic'),
  };
}

/**
 * Generates TypeScript source code content for pricing data file
 * Pure function - returns string, does not perform file I/O
 *
 * @param models - Array of scraped model pricing data
 * @returns TypeScript source code as string
 */
export function generatePricingFileContent(models: ScrapedModel[]): string {
  const { openaiModels, claudeModels } = groupModelsByProvider(models);
  const today = new Date().toISOString().split('T')[0];

  return `/**
 * LLM Pricing Data
 *
 * IMPORTANT: This file contains pricing information for LLM models.
 * Pricing data was last scraped on ${today}.
 *
 * Update Strategy:
 * 1. Run \`npm run scrape-pricing\` to scrape latest pricing
 * 2. Manually review generated data for accuracy
 * 3. Update PRICING_METADATA.lastUpdated timestamp
 * 4. Verify pricing against official provider documentation
 *
 * Data Sources:
 * - OpenAI: https://openai.com/api/pricing/
 * - Claude: https://www.anthropic.com/pricing
 */

export interface LLMPricing {
  inputPerMToken: number;        // Cost per 1M input tokens (USD)
  outputPerMToken: number;       // Cost per 1M output tokens (USD)
  cacheWritePerMToken?: number;  // Cost per 1M cache write tokens (Claude only)
  cacheReadPerMToken?: number;   // Cost per 1M cache read tokens (Claude only)
  supportsCache: boolean;        // Whether model supports prompt caching
  provider: 'openai' | 'anthropic';
  modelFamily: string;
  isDeprecated: boolean;
  releaseDate?: string;
}

export const LLM_PRICING: Record<string, LLMPricing> = {
${models.map(model => `  '${model.id}': {
    inputPerMToken: ${model.inputPerMToken.toFixed(2)},
    outputPerMToken: ${model.outputPerMToken.toFixed(2)},${model.cacheWritePerMToken ? `
    cacheWritePerMToken: ${model.cacheWritePerMToken.toFixed(2)},` : ''}${model.cacheReadPerMToken ? `
    cacheReadPerMToken: ${model.cacheReadPerMToken.toFixed(2)},` : ''}
    supportsCache: ${model.supportsCache},
    provider: '${model.provider}',
    modelFamily: '${model.name}',
    isDeprecated: ${model.isDeprecated},${model.releaseDate ? `
    releaseDate: '${model.releaseDate}',` : ''}
  }`).join(',\n')},
};

export const PRICING_METADATA = {
  lastUpdated: '${today}',
  totalModels: ${models.length},
  openaiModels: ${openaiModels.length},
  claudeModels: ${claudeModels.length},
  sources: {
    openai: 'https://openai.com/api/pricing/',
    claude: 'https://www.anthropic.com/pricing'
  },
  notes: [
    'Pricing shown is in USD per 1 million tokens',
    'Claude models support prompt caching (90% cost reduction on cached tokens)',
    'OpenAI models do not currently support prompt caching',
    'Deprecated models may have limited availability',
    'Pricing subject to change - verify with official sources'
  ]
};

/**
 * Get pricing model by ID
 */
export function getPricingModel(modelId: string): LLMPricing | null {
  return LLM_PRICING[modelId] || null;
}

/**
 * Get all model IDs grouped by provider
 */
export function getModelsByProvider(provider: 'openai' | 'anthropic'): string[] {
  return Object.entries(LLM_PRICING)
    .filter(([_, model]) => model.provider === provider)
    .map(([id, _]) => id);
}

/**
 * Get all model IDs
 */
export function getAllModelIds(): string[] {
  return Object.keys(LLM_PRICING);
}
`;
}
