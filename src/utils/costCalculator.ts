/**
 * Cost Calculator Engine
 *
 * Implements precision cost forecasting for LLM chatbots and prompt operations with ±5% accuracy target.
 * Handles both OpenAI (no caching) and Claude (with prompt caching) models.
 *
 * Key Formulas:
 * - Chatbot: conversationCost = firstTurn + (laterTurns × (turns - 1))
 * - Prompt: perCallCost = (inputTokens + outputTokens) × prices (with optional multi-turn & caching)
 * - monthlyCost = perCallCost × batchOperations
 */

import type { ChatbotConfig, CostBreakdown, PromptCalculatorConfig, PromptCostBreakdown } from '@/types';
import { CONTEXT_STRATEGY_TOKENS, RESPONSE_PRESETS } from '@/types';
import { getPricingModel } from '@/config/pricingData';
import { estimateTokensFromChars } from './tokenEstimator';

/**
 * Calculate chatbot operating costs for given configuration
 *
 * @param config - Chatbot configuration (model, tokens, volume, etc.)
 * @returns Detailed cost breakdown with monthly and per-conversation costs
 * @throws Error if model not found in pricing data
 */
export function calculateChatbotCost(config: ChatbotConfig): CostBreakdown {
  // Get pricing model
  const model = getPricingModel(config.modelId);
  if (!model) {
    throw new Error(`Model not found: ${config.modelId}`);
  }

  // Get context tokens per turn based on strategy
  const contextTokensPerTurn = CONTEXT_STRATEGY_TOKENS[config.contextStrategy];

  // Convert prices from per-MTok to per-token
  const inputPricePerToken = model.inputPerMToken / 1_000_000;
  const outputPricePerToken = model.outputPerMToken / 1_000_000;
  const cacheReadPricePerToken = model.cacheReadPerMToken
    ? model.cacheReadPerMToken / 1_000_000
    : 0;
  const cacheWritePricePerToken = model.cacheWritePerMToken
    ? model.cacheWritePerMToken / 1_000_000
    : 0;

  // First turn cost (no caching benefit)
  const firstTurnInputTokens = config.systemPromptTokens + config.avgUserMessageTokens;
  const firstTurnInputCost = firstTurnInputTokens * inputPricePerToken;
  const firstTurnOutputCost = config.avgResponseTokens * outputPricePerToken;
  const firstTurnCost = firstTurnInputCost + firstTurnOutputCost;

  // Cache write cost for first turn (Claude only)
  const cacheWriteCost = model.supportsCache
    ? config.systemPromptTokens * cacheWritePricePerToken
    : 0;

  // Later turns cost (turns 2+)
  let laterTurnCost = 0;
  let cacheSavingsPerTurn = 0;
  let systemPromptCostPerTurn = 0;

  if (model.supportsCache) {
    // Claude: Cache hit means system prompt is read from cache (90% savings)
    const cachedSystemPromptCost =
      config.systemPromptTokens * cacheReadPricePerToken * config.cacheHitRate;
    const uncachedSystemPromptCost =
      config.systemPromptTokens * inputPricePerToken * (1 - config.cacheHitRate);

    systemPromptCostPerTurn = cachedSystemPromptCost + uncachedSystemPromptCost;

    // Calculate cache savings vs. no cache
    const fullSystemPromptCost = config.systemPromptTokens * inputPricePerToken;
    cacheSavingsPerTurn = fullSystemPromptCost - systemPromptCostPerTurn;
  } else {
    // OpenAI: No caching - full system prompt cost every turn
    systemPromptCostPerTurn = config.systemPromptTokens * inputPricePerToken;
    cacheSavingsPerTurn = 0;
  }

  // Context accumulation for later turns
  // Starts at 0 for turn 2, increases linearly
  const avgContextTokensForLaterTurns =
    ((config.conversationTurns - 1) * contextTokensPerTurn) / 2;

  // Later turn cost = system prompt (cached if Claude) + user message + avg context + response
  const laterTurnInputTokens =
    config.avgUserMessageTokens + avgContextTokensForLaterTurns;
  const laterTurnInputCost = laterTurnInputTokens * inputPricePerToken;
  const laterTurnOutputCost = config.avgResponseTokens * outputPricePerToken;

  laterTurnCost = systemPromptCostPerTurn + laterTurnInputCost + laterTurnOutputCost;

  // Total cost per conversation
  const laterTurnsCount = config.conversationTurns - 1;
  const perConversationCost =
    firstTurnCost + cacheWriteCost + laterTurnCost * laterTurnsCount;

  // Monthly cost
  const monthlyCost = perConversationCost * config.conversationsPerMonth;

  // Detailed breakdown
  const totalCacheSavings = -1 * cacheSavingsPerTurn * laterTurnsCount;

  // Calculate component costs
  const systemPromptCost =
    firstTurnInputCost + systemPromptCostPerTurn * laterTurnsCount + cacheWriteCost;

  const inputTokensCost =
    config.avgUserMessageTokens *
    inputPricePerToken *
    config.conversationTurns;

  const outputTokensCost =
    config.avgResponseTokens *
    outputPricePerToken *
    config.conversationTurns;

  const contextAccumulationCost =
    avgContextTokensForLaterTurns * inputPricePerToken * laterTurnsCount;

  return {
    model: model.modelFamily,
    monthlyCost,
    perConversationCost,
    breakdown: {
      systemPromptCost,
      cacheSavings: totalCacheSavings,
      inputTokensCost,
      outputTokensCost,
      contextAccumulationCost,
    },
    assumptions: {
      cacheHitRate: config.cacheHitRate,
      contextStrategy: config.contextStrategy,
      avgTokensPerTurn: contextTokensPerTurn,
      firstTurnCost,
      laterTurnCost,
    },
  };
}

/**
 * Calculate cost for multiple models to compare
 *
 * @param config - Base configuration
 * @param modelIds - Array of model IDs to compare
 * @returns Array of cost breakdowns for each model
 */
export function calculateMultipleModelCosts(
  config: ChatbotConfig,
  modelIds: string[],
): CostBreakdown[] {
  return modelIds.map((modelId) => {
    const modelConfig = { ...config, modelId };
    return calculateChatbotCost(modelConfig);
  });
}

/**
 * Find the cheapest model for given configuration
 *
 * @param config - Base configuration
 * @param modelIds - Array of model IDs to compare
 * @returns Cost breakdown for the cheapest model
 */
export function findCheapestModel(
  config: ChatbotConfig,
  modelIds: string[],
): CostBreakdown {
  const costs = calculateMultipleModelCosts(config, modelIds);
  return costs.reduce((cheapest, current) =>
    current.monthlyCost < cheapest.monthlyCost ? current : cheapest,
  );
}

/**
 * Calculate prompt cost for batch API operations
 *
 * @param config - Prompt calculator configuration
 * @returns Detailed cost breakdown with per-call and monthly costs
 * @throws Error if model not found in pricing data
 */
export function calculatePromptCost(config: PromptCalculatorConfig): PromptCostBreakdown {
  // Get pricing model
  const model = getPricingModel(config.modelId);
  if (!model) {
    throw new Error(`Model not found: ${config.modelId}`);
  }

  // Estimate input tokens from prompt text
  const inputTokens = estimateTokensFromChars(config.promptText);

  // Get output tokens from response preset
  const outputTokens = RESPONSE_PRESETS[config.responsePreset].average;

  // Calculate base costs
  const inputCost = (inputTokens / 1_000_000) * model.inputPerMToken;
  const outputCost = (outputTokens / 1_000_000) * model.outputPerMToken;

  // Single-turn calculation
  if (!config.multiTurnEnabled || !config.turns || config.turns === 1) {
    const perCallCost = inputCost + outputCost;
    const monthlyCost = perCallCost * config.batchOperations;

    return {
      perCallCost,
      monthlyCost,
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
    };
  }

  // Multi-turn calculation with context accumulation
  const contextTokensPerTurn = config.contextStrategy
    ? CONTEXT_STRATEGY_TOKENS[config.contextStrategy]
    : CONTEXT_STRATEGY_TOKENS.moderate;

  // First turn cost (no caching benefit)
  const firstTurnCost = inputCost + outputCost;

  // Later turns (turns 2+)
  const turns = config.turns || 5;
  let cacheSavings = 0;
  let laterTurnsInputCost = 0;

  if (model.supportsCache && config.cacheHitRate) {
    // Claude: Cache hit rate reduces input cost
    const cacheHitRate = config.cacheHitRate / 100; // Convert from percentage
    const cachedInputCost = (inputTokens / 1_000_000) * model.cacheReadPerMToken!;
    const uncachedInputCost = (inputTokens / 1_000_000) * model.inputPerMToken;

    // Effective input cost per turn with caching
    const effectiveInputCost = cachedInputCost * cacheHitRate + uncachedInputCost * (1 - cacheHitRate);

    // Context accumulation cost
    const contextCost = ((contextTokensPerTurn * (turns - 1)) / 1_000_000) * model.inputPerMToken;

    laterTurnsInputCost = effectiveInputCost + contextCost;

    // Calculate cache savings
    const fullInputCost = uncachedInputCost + contextCost;
    cacheSavings = (fullInputCost - laterTurnsInputCost) * (turns - 1);
  } else {
    // No caching: full input cost + context every turn
    const contextCost = ((contextTokensPerTurn * (turns - 1)) / 1_000_000) * model.inputPerMToken;
    laterTurnsInputCost = inputCost + contextCost;
  }

  const laterTurnCost = laterTurnsInputCost + outputCost;
  const conversationCost = firstTurnCost + laterTurnCost * (turns - 1);
  const perCallCost = conversationCost;
  const monthlyCost = perCallCost * config.batchOperations;

  return {
    perCallCost,
    monthlyCost,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    cacheSavings: cacheSavings > 0 ? cacheSavings : undefined,
    contextCost: config.contextStrategy
      ? ((contextTokensPerTurn * (turns - 1)) / 1_000_000) * model.inputPerMToken
      : undefined,
    breakdown: {
      firstTurn: firstTurnCost,
      laterTurns: laterTurnCost,
      cacheHitSavings: cacheSavings > 0 ? cacheSavings : undefined,
      contextAccumulation: config.contextStrategy
        ? ((contextTokensPerTurn * (turns - 1)) / 1_000_000) * model.inputPerMToken
        : undefined,
    },
  };
}
