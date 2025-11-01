import { useCalculatorStore } from '@/store/useCalculatorStore';
import type { PromptCostBreakdown } from '@/types';

export function PromptCostDisplay() {
  const promptResults = useCalculatorStore((state) => state.promptResults) as PromptCostBreakdown | null;

  if (!promptResults) {
    return null;
  }

  return (
    <div className="card bg-gradient-to-r from-primary-50 to-primary-100">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-600 mb-2">
          Monthly Operating Cost
        </p>
        <p className="text-5xl font-bold text-primary-700">
          ${promptResults.monthlyCost.toFixed(2)}
        </p>
        <p className="text-sm text-gray-600 mt-4">
          ${promptResults.perCallCost.toFixed(4)} per call
        </p>
      </div>
    </div>
  );
}
