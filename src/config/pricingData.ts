/**
 * LLM Pricing Data Configuration
 *
 * Official pricing for OpenAI and Claude models as of January 2025.
 * Prices are per million tokens (MTok).
 *
 * Sources:
 * - OpenAI: https://openai.com/api/pricing/
 * - Claude: https://www.anthropic.com/pricing
 */

import type { PricingModel } from '@/types';

/**
 * Pricing configuration for all supported LLM models
 *
 * OpenAI models: GPT-4o, GPT-4o-mini, GPT-3.5-turbo
 * Claude models: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Haiku
 */
export const LLM_PRICING: Record<string, PricingModel> = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    inputPerMToken: 5.0,
    outputPerMToken: 15.0,
    supportsCache: false,
    lastUpdated: '2025-01-31',
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    inputPerMToken: 0.15,
    outputPerMToken: 0.6,
    supportsCache: false,
    lastUpdated: '2025-01-31',
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    inputPerMToken: 0.5,
    outputPerMToken: 1.5,
    supportsCache: false,
    lastUpdated: '2025-01-31',
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'claude',
    inputPerMToken: 3.0,
    outputPerMToken: 15.0,
    cacheReadPerMToken: 0.3,
    cacheWritePerMToken: 3.75,
    supportsCache: true,
    lastUpdated: '2025-01-31',
  },
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    provider: 'claude',
    inputPerMToken: 1.0,
    outputPerMToken: 5.0,
    cacheReadPerMToken: 0.1,
    cacheWritePerMToken: 1.25,
    supportsCache: true,
    lastUpdated: '2025-01-31',
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'claude',
    inputPerMToken: 0.25,
    outputPerMToken: 1.25,
    cacheReadPerMToken: 0.03,
    cacheWritePerMToken: 0.3,
    supportsCache: true,
    lastUpdated: '2025-01-31',
  },
};

/**
 * Get pricing model by ID
 * @param modelId - Model identifier
 * @returns Pricing model configuration or undefined
 */
export function getPricingModel(modelId: string): PricingModel | undefined {
  return LLM_PRICING[modelId];
}

/**
 * Get all model IDs
 * @returns Array of model identifiers
 */
export function getAllModelIds(): string[] {
  return Object.keys(LLM_PRICING);
}

/**
 * Get models grouped by provider
 * @returns Object with openai and claude arrays
 */
export function getModelsByProvider(): {
  openai: PricingModel[];
  claude: PricingModel[];
} {
  const models = Object.values(LLM_PRICING);
  return {
    openai: models.filter((m) => m.provider === 'openai'),
    claude: models.filter((m) => m.provider === 'claude'),
  };
}
