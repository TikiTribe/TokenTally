/**
 * Input Validation Utilities
 *
 * Security-focused validation functions following SECURITY.md standards.
 * All user inputs must be validated with min/max bounds and type checking.
 */

import type { ValidationResult, ContextStrategy } from '@/types';
import { VALIDATION_CONSTRAINTS } from '@/types';

/**
 * Validate token count with min/max bounds
 * @param value - Token count to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validation result with clamped value and optional warning
 */
export function validateTokenCount(
  value: number,
  min: number,
  max: number,
): ValidationResult {
  // Check for valid number
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return {
      valid: false,
      value: min,
      warning: `Invalid number provided. Using minimum value: ${min}`,
    };
  }

  // Clamp to bounds
  if (value < min) {
    return {
      valid: true,
      value: min,
      warning: `Value clamped to minimum: ${min}`,
    };
  }

  if (value > max) {
    return {
      valid: true,
      value: max,
      warning: `Value clamped to maximum: ${max}`,
    };
  }

  // Round to integer
  const roundedValue = Math.floor(value);

  return {
    valid: true,
    value: roundedValue,
  };
}

/**
 * Validate conversations per month
 * @param value - Monthly conversation volume
 * @returns Validation result with clamped value
 */
export function validateConversationsPerMonth(value: number): ValidationResult {
  const { min, max } = VALIDATION_CONSTRAINTS.conversationsPerMonth;

  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return {
      valid: false,
      value: min,
      warning: 'Conversations per month must be a valid number',
    };
  }

  if (value < min) {
    return {
      valid: true,
      value: min,
      warning: `Conversations per month clamped to minimum: ${min.toLocaleString()}`,
    };
  }

  if (value > max) {
    return {
      valid: true,
      value: max,
      warning: `Conversations per month clamped to maximum: ${max.toLocaleString()}`,
    };
  }

  return {
    valid: true,
    value: Math.floor(value),
  };
}

/**
 * Validate cache hit rate (0.0 - 1.0)
 * @param value - Cache hit rate as decimal
 * @returns Validation result with clamped value
 */
export function validateCacheHitRate(value: number): ValidationResult {
  const { min, max } = VALIDATION_CONSTRAINTS.cacheHitRate;

  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return {
      valid: false,
      value: 0.9, // Default to 90% cache hit rate
      warning: 'Cache hit rate must be between 0.0 and 1.0. Using default: 0.90',
    };
  }

  if (value < min) {
    return {
      valid: true,
      value: min,
      warning: `Cache hit rate clamped to minimum: ${min}`,
    };
  }

  if (value > max) {
    return {
      valid: true,
      value: max,
      warning: `Cache hit rate clamped to maximum: ${max}`,
    };
  }

  return {
    valid: true,
    value: value,
  };
}

/**
 * Validate context strategy
 * @param value - Context strategy string
 * @returns Validation result with validated strategy
 */
export function validateContextStrategy(value: string): ValidationResult {
  const validStrategies: ContextStrategy[] = ['minimal', 'moderate', 'full'];

  if (!validStrategies.includes(value as ContextStrategy)) {
    return {
      valid: false,
      value: 'moderate',
      warning: `Invalid context strategy "${value}". Using default: moderate`,
    };
  }

  return {
    valid: true,
    value: value,
  };
}

/**
 * Validate all chatbot configuration inputs
 * @param config - Raw configuration object
 * @returns Validated and sanitized configuration
 */
export function validateChatbotConfig(config: {
  modelId: string;
  systemPromptTokens: number;
  avgUserMessageTokens: number;
  avgResponseTokens: number;
  conversationTurns: number;
  conversationsPerMonth: number;
  contextStrategy: string;
  cacheHitRate: number;
}): {
  valid: boolean;
  config: typeof config;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Validate system prompt tokens
  const systemPromptResult = validateTokenCount(
    config.systemPromptTokens,
    VALIDATION_CONSTRAINTS.systemPromptTokens.min,
    VALIDATION_CONSTRAINTS.systemPromptTokens.max,
  );
  if (systemPromptResult.warning) warnings.push(systemPromptResult.warning);

  // Validate user message tokens
  const userMessageResult = validateTokenCount(
    config.avgUserMessageTokens,
    VALIDATION_CONSTRAINTS.avgUserMessageTokens.min,
    VALIDATION_CONSTRAINTS.avgUserMessageTokens.max,
  );
  if (userMessageResult.warning) warnings.push(userMessageResult.warning);

  // Validate response tokens
  const responseResult = validateTokenCount(
    config.avgResponseTokens,
    VALIDATION_CONSTRAINTS.avgResponseTokens.min,
    VALIDATION_CONSTRAINTS.avgResponseTokens.max,
  );
  if (responseResult.warning) warnings.push(responseResult.warning);

  // Validate conversation turns
  const turnsResult = validateTokenCount(
    config.conversationTurns,
    VALIDATION_CONSTRAINTS.conversationTurns.min,
    VALIDATION_CONSTRAINTS.conversationTurns.max,
  );
  if (turnsResult.warning) warnings.push(turnsResult.warning);

  // Validate conversations per month
  const conversationsResult = validateConversationsPerMonth(
    config.conversationsPerMonth,
  );
  if (conversationsResult.warning) warnings.push(conversationsResult.warning);

  // Validate context strategy
  const strategyResult = validateContextStrategy(config.contextStrategy);
  if (strategyResult.warning) warnings.push(strategyResult.warning);

  // Validate cache hit rate
  const cacheResult = validateCacheHitRate(config.cacheHitRate);
  if (cacheResult.warning) warnings.push(cacheResult.warning);

  return {
    valid: warnings.length === 0,
    config: {
      modelId: config.modelId,
      systemPromptTokens: systemPromptResult.value as number,
      avgUserMessageTokens: userMessageResult.value as number,
      avgResponseTokens: responseResult.value as number,
      conversationTurns: turnsResult.value as number,
      conversationsPerMonth: conversationsResult.value as number,
      contextStrategy: strategyResult.value as string,
      cacheHitRate: cacheResult.value as number,
    },
    warnings,
  };
}
