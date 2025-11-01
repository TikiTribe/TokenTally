/**
 * PromptModelComparison Component
 *
 * Displays side-by-side comparison between current model and cheapest alternative
 * for prompt calculator. Only renders when a cheaper alternative exists.
 */

import { useCalculatorStore } from '@/store/useCalculatorStore';
import { calculatePromptCost } from '@/utils/costCalculator';
import { getAllModelIds } from '@/config/pricingData';
import type { PromptCalculatorConfig } from '@/types';

export function PromptModelComparison() {
  const { promptConfig, promptResults } = useCalculatorStore();

  // Don't render if no results calculated yet
  if (!promptResults || !promptConfig) {
    return null;
  }

  // Calculate costs for all models using same prompt configuration
  const allModelIds = getAllModelIds();
  const modelCosts = allModelIds.map((modelId) => {
    const config: PromptCalculatorConfig = { ...promptConfig, modelId };
    try {
      const result = calculatePromptCost(config);
      return {
        modelId,
        monthlyCost: result.monthlyCost,
      };
    } catch {
      return null;
    }
  }).filter((cost): cost is { modelId: string; monthlyCost: number } => cost !== null);

  // Find cheapest alternative (excluding current model)
  const alternatives = modelCosts.filter(
    (cost) => cost.modelId !== promptConfig.modelId
  );

  if (alternatives.length === 0) {
    return null;
  }

  const cheapestAlternative = alternatives.reduce((cheapest, current) =>
    current.monthlyCost < cheapest.monthlyCost ? current : cheapest
  );

  // Calculate savings
  const currentCost = promptResults.monthlyCost;
  const savings = currentCost - cheapestAlternative.monthlyCost;
  const savingsPercentage = (savings / currentCost) * 100;

  // Only render if there are actual savings
  if (savings <= 0) {
    return null;
  }

  return (
    <div className="card bg-yellow-50">
      <h2 className="text-xl font-semibold mb-4">Model Comparison</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Current Model</p>
          <p className="font-semibold">{promptConfig.modelId}</p>
          <p className="text-lg">
            ${currentCost.toFixed(2)}/mo
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Best Alternative</p>
          <p className="font-semibold">{cheapestAlternative.modelId}</p>
          <p className="text-lg text-green-600">
            ${cheapestAlternative.monthlyCost.toFixed(2)}/mo
          </p>
          <p className="text-sm text-green-600">
            Save ${savings.toFixed(2)} (
            {savingsPercentage.toFixed(1)}%)
          </p>
        </div>
      </div>
    </div>
  );
}
