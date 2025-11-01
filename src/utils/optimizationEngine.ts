/**
 * Cost Optimization Recommendation Engine
 *
 * Analyzes chatbot configuration and generates prioritized recommendations
 * for reducing operating costs while maintaining quality.
 *
 * Priority Levels:
 * - HIGH: 20%+ savings potential (e.g., model switching)
 * - MEDIUM: 10-20% savings (e.g., context strategy optimization)
 * - LOW: 5-10% savings (e.g., minor parameter tuning)
 */

import type {
  ChatbotConfig,
  CostBreakdown,
  Recommendation,
  ModelComparison,
  PromptCalculatorConfig,
  PromptCostBreakdown,
} from '@/types';
import { calculateChatbotCost, calculatePromptCost, findCheapestModel } from './costCalculator';
import { getAllModelIds } from '@/config/pricingData';

/**
 * Generate cost optimization recommendations
 *
 * @param currentConfig - Current chatbot configuration
 * @param currentResults - Current cost breakdown
 * @returns Array of recommendations sorted by priority and savings
 */
export function generateRecommendations(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Check for cheaper model alternatives
  const modelRecommendation = analyzeModelAlternatives(
    currentConfig,
    currentResults,
  );
  if (modelRecommendation) {
    recommendations.push(modelRecommendation);
  }

  // 2. Check context strategy optimization
  const contextRecommendation = analyzeContextStrategy(
    currentConfig,
    currentResults,
  );
  if (contextRecommendation) {
    recommendations.push(contextRecommendation);
  }

  // 3. Check response length optimization
  const responseLengthRecommendation = analyzeResponseLength(
    currentConfig,
    currentResults,
  );
  if (responseLengthRecommendation) {
    recommendations.push(responseLengthRecommendation);
  }

  // 4. Check conversation turn optimization
  const turnRecommendation = analyzeTurnCount(currentConfig, currentResults);
  if (turnRecommendation) {
    recommendations.push(turnRecommendation);
  }

  // 5. Check cache hit rate optimization (Claude only)
  const cacheRecommendation = analyzeCacheOptimization(
    currentConfig,
    currentResults,
  );
  if (cacheRecommendation) {
    recommendations.push(cacheRecommendation);
  }

  // Sort by priority (HIGH > MEDIUM > LOW) and then by savings
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.potentialSavings - a.potentialSavings;
    })
    .slice(0, 5); // Return top 5 recommendations
}

/**
 * Analyze model alternatives for cost savings
 */
function analyzeModelAlternatives(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): Recommendation | null {
  const allModelIds = getAllModelIds();
  const cheapestModel = findCheapestModel(currentConfig, allModelIds);

  const savings = currentResults.monthlyCost - cheapestModel.monthlyCost;
  const savingsPercentage =
    (savings / currentResults.monthlyCost) * 100;

  // Only recommend if savings are >= 20%
  if (savingsPercentage >= 20) {
    return {
      priority: 'HIGH',
      title: `Switch to ${cheapestModel.model}`,
      description: `Switching from ${currentResults.model} to ${cheapestModel.model} could reduce costs by ${savingsPercentage.toFixed(1)}%. Both models handle similar workloads, but ${cheapestModel.model} offers better price-performance for chatbot use cases.`,
      potentialSavings: savings,
      savingsPercentage,
      action: `Update model selection to ${cheapestModel.model} and test conversation quality`,
      alternativeModel: cheapestModel.model,
    };
  }

  return null;
}

/**
 * Analyze context strategy optimization
 */
function analyzeContextStrategy(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): Recommendation | null {
  const strategies: Array<'minimal' | 'moderate' | 'full'> = [
    'minimal',
    'moderate',
    'full',
  ];

  // Find best alternative strategy
  let bestStrategy: 'minimal' | 'moderate' | 'full' | null = null;
  let maxSavings = 0;

  for (const strategy of strategies) {
    if (strategy === currentConfig.contextStrategy) continue;

    const testConfig = { ...currentConfig, contextStrategy: strategy };
    const testResult = calculateChatbotCost(testConfig);
    const savings = currentResults.monthlyCost - testResult.monthlyCost;

    if (savings > maxSavings) {
      maxSavings = savings;
      bestStrategy = strategy;
    }
  }

  if (bestStrategy && maxSavings > 0) {
    const savingsPercentage = (maxSavings / currentResults.monthlyCost) * 100;

    // Recommend if savings >= 10%
    if (savingsPercentage >= 10) {
      const priority = savingsPercentage >= 15 ? 'MEDIUM' : 'LOW';

      return {
        priority,
        title: `Optimize context strategy to ${bestStrategy}`,
        description: `Switching from ${currentConfig.contextStrategy} to ${bestStrategy} context retention could save ${savingsPercentage.toFixed(1)}%. This reduces token usage while maintaining conversation quality for most chatbot scenarios.`,
        potentialSavings: maxSavings,
        savingsPercentage,
        action: `Test ${bestStrategy} context strategy with sample conversations to ensure quality is acceptable`,
      };
    }
  }

  return null;
}

/**
 * Analyze response length optimization
 */
function analyzeResponseLength(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): Recommendation | null {
  // Test 20% shorter responses
  const shorterResponses = Math.floor(currentConfig.avgResponseTokens * 0.8);
  const testConfig = { ...currentConfig, avgResponseTokens: shorterResponses };
  const testResult = calculateChatbotCost(testConfig);

  const savings = currentResults.monthlyCost - testResult.monthlyCost;
  const savingsPercentage = (savings / currentResults.monthlyCost) * 100;

  // Recommend if savings >= 5%
  if (savingsPercentage >= 5) {
    return {
      priority: savingsPercentage >= 10 ? 'MEDIUM' : 'LOW',
      title: 'Reduce response length',
      description: `Reducing average response length by 20% (from ${currentConfig.avgResponseTokens} to ${shorterResponses} tokens) could save ${savingsPercentage.toFixed(1)}%. Many chatbot responses can be more concise without sacrificing helpfulness.`,
      potentialSavings: savings,
      savingsPercentage,
      action: 'Tune system prompt to encourage more concise responses and test user satisfaction',
    };
  }

  return null;
}

/**
 * Analyze conversation turn count optimization
 */
function analyzeTurnCount(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): Recommendation | null {
  // Only recommend if turns > 5
  if (currentConfig.conversationTurns <= 5) return null;

  const reducedTurns = Math.max(5, currentConfig.conversationTurns - 2);
  const testConfig = { ...currentConfig, conversationTurns: reducedTurns };
  const testResult = calculateChatbotCost(testConfig);

  const savings = currentResults.monthlyCost - testResult.monthlyCost;
  const savingsPercentage = (savings / currentResults.monthlyCost) * 100;

  if (savingsPercentage >= 5) {
    return {
      priority: 'LOW',
      title: 'Optimize conversation length',
      description: `Reducing average conversation turns from ${currentConfig.conversationTurns} to ${reducedTurns} could save ${savingsPercentage.toFixed(1)}%. Consider implementing better first-response accuracy or conversation summarization.`,
      potentialSavings: savings,
      savingsPercentage,
      action: 'Improve system prompt to resolve queries in fewer turns',
    };
  }

  return null;
}

/**
 * Analyze cache optimization (Claude models only)
 */
function analyzeCacheOptimization(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): Recommendation | null {
  // Only applicable to Claude models
  if (!currentConfig.modelId.includes('claude')) return null;

  // Only recommend if cache hit rate is below 85%
  if (currentConfig.cacheHitRate >= 0.85) return null;

  // Test with 95% cache hit rate
  const testConfig = { ...currentConfig, cacheHitRate: 0.95 };
  const testResult = calculateChatbotCost(testConfig);

  const savings = currentResults.monthlyCost - testResult.monthlyCost;
  const savingsPercentage = (savings / currentResults.monthlyCost) * 100;

  if (savingsPercentage >= 5) {
    return {
      priority: 'MEDIUM',
      title: 'Improve prompt caching',
      description: `Increasing cache hit rate from ${(currentConfig.cacheHitRate * 100).toFixed(0)}% to 95% could save ${savingsPercentage.toFixed(1)}%. Optimize system prompt stability and implement cache-friendly architectures.`,
      potentialSavings: savings,
      savingsPercentage,
      action: 'Implement stable system prompts and leverage Anthropic caching best practices',
    };
  }

  return null;
}

/**
 * Generate model comparison data
 *
 * @param currentConfig - Current configuration
 * @param currentResults - Current cost results
 * @returns Comparison between current and best alternative model
 */
export function generateModelComparison(
  currentConfig: ChatbotConfig,
  currentResults: CostBreakdown,
): ModelComparison {
  const allModelIds = getAllModelIds().filter(
    (id) => id !== currentConfig.modelId,
  );

  const cheapestAlternative = findCheapestModel(currentConfig, allModelIds);

  return {
    current: {
      model: currentResults.model,
      monthlyCost: currentResults.monthlyCost,
    },
    alternative: {
      model: cheapestAlternative.model,
      monthlyCost: cheapestAlternative.monthlyCost,
      savings: currentResults.monthlyCost - cheapestAlternative.monthlyCost,
      savingsPercentage:
        ((currentResults.monthlyCost - cheapestAlternative.monthlyCost) /
          currentResults.monthlyCost) *
        100,
    },
  };
}

/**
 * Generate prompt calculator optimization recommendations
 *
 * @param promptConfig - Current prompt calculator configuration
 * @param promptResults - Current prompt cost breakdown
 * @returns Array of recommendations sorted by priority and savings
 */
export function generatePromptRecommendations(
  promptConfig: PromptCalculatorConfig,
  promptResults: PromptCostBreakdown,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 1. Check for cheaper model alternatives
  const allModelIds = getAllModelIds();
  let bestAlternative: { modelId: string; monthlyCost: number; savings: number } | null = null;

  for (const modelId of allModelIds) {
    if (modelId === promptConfig.modelId) continue;

    const testConfig = { ...promptConfig, modelId };
    const testResult = calculatePromptCost(testConfig);

    const savings = promptResults.monthlyCost - testResult.monthlyCost;
    if (!bestAlternative || savings > bestAlternative.savings) {
      bestAlternative = { modelId, monthlyCost: testResult.monthlyCost, savings };
    }
  }

  if (bestAlternative && bestAlternative.savings > 0) {
    const savingsPercentage = (bestAlternative.savings / promptResults.monthlyCost) * 100;

    if (savingsPercentage >= 20) {
      recommendations.push({
        priority: 'HIGH',
        title: `Switch to ${bestAlternative.modelId}`,
        description: `Switching models could reduce costs by ${savingsPercentage.toFixed(1)}%. Test to ensure output quality meets requirements.`,
        potentialSavings: bestAlternative.savings,
        savingsPercentage,
        action: `Update model selection and validate output quality`,
        alternativeModel: bestAlternative.modelId,
      });
    }
  }

  // 2. Reduce batch operations if feasible
  if (promptConfig.batchOperations > 100) {
    const reducedOps = Math.floor(promptConfig.batchOperations * 0.8);
    const testConfig = { ...promptConfig, batchOperations: reducedOps };
    const testResult = calculatePromptCost(testConfig);
    const savings = promptResults.monthlyCost - testResult.monthlyCost;
    const savingsPercentage = (savings / promptResults.monthlyCost) * 100;

    if (savingsPercentage >= 10) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Reduce batch operations',
        description: `Reducing batch operations by 20% could save ${savingsPercentage.toFixed(1)}%. Review if all operations are necessary.`,
        potentialSavings: savings,
        savingsPercentage,
        action: 'Audit batch operations for optimization opportunities',
      });
    }
  }

  // 3. Optimize multi-turn settings
  if (promptConfig.multiTurnEnabled && promptConfig.turns && promptConfig.turns > 3) {
    const reducedTurns = Math.max(3, promptConfig.turns - 2);
    const testConfig = { ...promptConfig, turns: reducedTurns };
    const testResult = calculatePromptCost(testConfig);
    const savings = promptResults.monthlyCost - testResult.monthlyCost;
    const savingsPercentage = (savings / promptResults.monthlyCost) * 100;

    if (savingsPercentage >= 5) {
      recommendations.push({
        priority: 'LOW',
        title: 'Reduce conversation turns',
        description: `Reducing turns from ${promptConfig.turns} to ${reducedTurns} could save ${savingsPercentage.toFixed(1)}%. Consider if all turns are necessary.`,
        potentialSavings: savings,
        savingsPercentage,
        action: 'Review conversation flow for optimization',
      });
    }
  }

  // Sort and return top recommendations
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.potentialSavings - a.potentialSavings;
    })
    .slice(0, 5);
}
