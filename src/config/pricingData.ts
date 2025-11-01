/**
 * LLM Pricing Data
 *
 * IMPORTANT: This file contains pricing information for LLM models.
 * Pricing data was last scraped on 2025-11-01.
 *
 * Update Strategy:
 * 1. Run `npm run scrape-pricing` to scrape latest pricing
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
  'gpt-5': {
    inputPerMToken: 1.25,
    outputPerMToken: 10.00,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-5',
    isDeprecated: false,
    releaseDate: '2025-08',
  },
  'gpt-5-mini': {
    inputPerMToken: 0.25,
    outputPerMToken: 2.00,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-5 Mini',
    isDeprecated: false,
    releaseDate: '2025-08',
  },
  'gpt-5-nano': {
    inputPerMToken: 0.05,
    outputPerMToken: 0.40,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-5 Nano',
    isDeprecated: false,
    releaseDate: '2025-08',
  },
  'gpt-5-pro': {
    inputPerMToken: 15.00,
    outputPerMToken: 120.00,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-5 Pro',
    isDeprecated: false,
    releaseDate: '2025-08',
  },
  'gpt-4.1': {
    inputPerMToken: 2.00,
    outputPerMToken: 8.00,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-4.1',
    isDeprecated: false,
    releaseDate: '2025-04',
  },
  'gpt-4.1-mini': {
    inputPerMToken: 0.40,
    outputPerMToken: 1.60,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-4.1 Mini',
    isDeprecated: false,
    releaseDate: '2025-04',
  },
  'gpt-4.1-nano': {
    inputPerMToken: 0.10,
    outputPerMToken: 0.40,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-4.1 Nano',
    isDeprecated: false,
    releaseDate: '2025-04',
  },
  'gpt-4o': {
    inputPerMToken: 5.00,
    outputPerMToken: 15.00,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-4o',
    isDeprecated: false,
    releaseDate: '2024-05',
  },
  'gpt-4o-mini': {
    inputPerMToken: 0.15,
    outputPerMToken: 0.60,
    supportsCache: false,
    provider: 'openai',
    modelFamily: 'GPT-4o Mini',
    isDeprecated: false,
    releaseDate: '2024-07',
  },
  'claude-sonnet-4-5-20250929': {
    inputPerMToken: 3.00,
    outputPerMToken: 15.00,
    cacheWritePerMToken: 3.75,
    cacheReadPerMToken: 0.30,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude Sonnet 4.5',
    isDeprecated: false,
    releaseDate: '2025-09',
  },
  'claude-haiku-4-5-20251001': {
    inputPerMToken: 1.00,
    outputPerMToken: 5.00,
    cacheWritePerMToken: 1.25,
    cacheReadPerMToken: 0.10,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude Haiku 4.5',
    isDeprecated: false,
    releaseDate: '2025-10',
  },
  'claude-opus-4-1-20250805': {
    inputPerMToken: 15.00,
    outputPerMToken: 75.00,
    cacheWritePerMToken: 18.75,
    cacheReadPerMToken: 1.50,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude Opus 4.1',
    isDeprecated: false,
    releaseDate: '2025-08',
  },
  'claude-sonnet-4-20250514': {
    inputPerMToken: 3.00,
    outputPerMToken: 15.00,
    cacheWritePerMToken: 3.75,
    cacheReadPerMToken: 0.30,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude Sonnet 4',
    isDeprecated: false,
    releaseDate: '2025-05',
  },
  'claude-opus-4-20250514': {
    inputPerMToken: 15.00,
    outputPerMToken: 75.00,
    cacheWritePerMToken: 18.75,
    cacheReadPerMToken: 1.50,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude Opus 4',
    isDeprecated: false,
    releaseDate: '2025-05',
  },
  'claude-3-5-haiku-20241022': {
    inputPerMToken: 0.80,
    outputPerMToken: 4.00,
    cacheWritePerMToken: 1.00,
    cacheReadPerMToken: 0.08,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude 3.5 Haiku',
    isDeprecated: false,
    releaseDate: '2024-10',
  },
  'claude-3-haiku-20240307': {
    inputPerMToken: 0.25,
    outputPerMToken: 1.25,
    cacheWritePerMToken: 0.30,
    cacheReadPerMToken: 0.03,
    supportsCache: true,
    provider: 'anthropic',
    modelFamily: 'Claude 3 Haiku',
    isDeprecated: false,
    releaseDate: '2024-03',
  },
};

export const PRICING_METADATA = {
  lastUpdated: '2025-11-01',
  totalModels: 16,
  openaiModels: 9,
  claudeModels: 7,
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
