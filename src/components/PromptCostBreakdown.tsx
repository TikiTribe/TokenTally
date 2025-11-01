import { useCalculatorStore } from '@/store/useCalculatorStore';
import type { PromptCostBreakdown } from '@/types';

export function PromptCostBreakdown() {
  const { promptResults } = useCalculatorStore();

  if (!promptResults) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>
      <div className="space-y-2">
        <div className="flex justify-between py-2 border-b">
          <span>Input Tokens</span>
          <span className="font-mono">
            ${promptResults.inputCost.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span>Output Tokens</span>
          <span className="font-mono">
            ${promptResults.outputCost.toFixed(4)}
          </span>
        </div>
        {promptResults.cacheSavings !== undefined && promptResults.cacheSavings < 0 && (
          <div className="flex justify-between py-2 border-b text-green-600">
            <span>Cache Savings</span>
            <span className="font-mono">
              ${promptResults.cacheSavings.toFixed(4)}
            </span>
          </div>
        )}
        {promptResults.contextCost !== undefined && (
          <div className="flex justify-between py-2 border-b">
            <span>Context Accumulation</span>
            <span className="font-mono">
              ${promptResults.contextCost.toFixed(4)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
