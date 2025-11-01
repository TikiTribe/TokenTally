/**
 * Core TypeScript type definitions for TokenTally
 *
 * These interfaces establish the data contracts between:
 * - Calculator engine (cost calculations)
 * - React components (UI)
 * - Export utilities (PDF/CSV)
 * - Optimization engine (recommendations)
 */

/**
 * LLM provider type
 */
export type LLMProvider = 'openai' | 'claude';

/**
 * Context accumulation strategy for conversation turns
 * - minimal: 50 tokens/turn (basic context)
 * - moderate: 150 tokens/turn (good context retention)
 * - full: 300 tokens/turn (maximum context)
 */
export type ContextStrategy = 'minimal' | 'moderate' | 'full';

/**
 * Pricing model definition for an LLM
 */
export interface PricingModel {
  /** Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet') */
  id: string;
  /** Display name */
  name: string;
  /** Provider (OpenAI or Claude) */
  provider: LLMProvider;
  /** Input token price per million tokens */
  inputPerMToken: number;
  /** Output token price per million tokens */
  outputPerMToken: number;
  /** Cache read price per million tokens (Claude only) */
  cacheReadPerMToken?: number;
  /** Cache write price per million tokens (Claude only) */
  cacheWritePerMToken?: number;
  /** Last pricing update date (ISO 8601) */
  lastUpdated: string;
  /** Supports prompt caching */
  supportsCache: boolean;
}

/**
 * User configuration for chatbot cost calculation
 */
export interface ChatbotConfig {
  /** Selected model ID */
  modelId: string;
  /** System prompt size in tokens */
  systemPromptTokens: number;
  /** Average user message size in tokens */
  avgUserMessageTokens: number;
  /** Average AI response size in tokens */
  avgResponseTokens: number;
  /** Number of turns per conversation */
  conversationTurns: number;
  /** Monthly conversation volume */
  conversationsPerMonth: number;
  /** Context accumulation strategy */
  contextStrategy: ContextStrategy;
  /** Cache hit rate for Claude models (0.0-1.0, default 0.90) */
  cacheHitRate: number;
}

/**
 * Detailed cost breakdown for a chatbot configuration
 */
export interface CostBreakdown {
  /** Model used for calculation */
  model: string;
  /** Total monthly operating cost */
  monthlyCost: number;
  /** Cost per individual conversation */
  perConversationCost: number;
  /** Detailed breakdown by component */
  breakdown: {
    /** System prompt processing cost */
    systemPromptCost: number;
    /** Cache savings (negative value for Claude) */
    cacheSavings: number;
    /** User input tokens cost */
    inputTokensCost: number;
    /** AI output tokens cost */
    outputTokensCost: number;
    /** Context accumulation cost across turns */
    contextAccumulationCost: number;
  };
  /** Calculation assumptions and metadata */
  assumptions: {
    /** Cache hit rate used (Claude models) */
    cacheHitRate: number;
    /** Context strategy applied */
    contextStrategy: string;
    /** Average tokens added per turn */
    avgTokensPerTurn: number;
    /** First turn cost */
    firstTurnCost: number;
    /** Later turn cost (with caching if applicable) */
    laterTurnCost: number;
  };
}

/**
 * Cost optimization recommendation
 */
export interface Recommendation {
  /** Priority level based on savings potential */
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  /** Recommendation title */
  title: string;
  /** Detailed description and rationale */
  description: string;
  /** Absolute savings amount ($/month) */
  potentialSavings: number;
  /** Savings as percentage of current cost */
  savingsPercentage: number;
  /** Actionable next step */
  action: string;
  /** Alternative model/configuration if applicable */
  alternativeModel?: string;
}

/**
 * Model comparison result
 */
export interface ModelComparison {
  /** Current model configuration */
  current: {
    model: string;
    monthlyCost: number;
  };
  /** Best alternative model */
  alternative: {
    model: string;
    monthlyCost: number;
    savings: number;
    savingsPercentage: number;
  };
}

/**
 * Validation result for user inputs
 */
export interface ValidationResult {
  /** Whether the value is valid */
  valid: boolean;
  /** Validated/corrected value */
  value: number | string;
  /** Warning message if value was clamped */
  warning?: string;
}

/**
 * Context strategy token mappings
 */
export const CONTEXT_STRATEGY_TOKENS: Record<ContextStrategy, number> = {
  minimal: 50,
  moderate: 150,
  full: 300,
};

/**
 * Input validation constraints
 */
export const VALIDATION_CONSTRAINTS = {
  systemPromptTokens: { min: 1, max: 100_000 },
  avgUserMessageTokens: { min: 1, max: 10_000 },
  avgResponseTokens: { min: 1, max: 10_000 },
  conversationTurns: { min: 1, max: 50 },
  conversationsPerMonth: { min: 1, max: 10_000_000 },
  cacheHitRate: { min: 0.0, max: 1.0 },
} as const;
