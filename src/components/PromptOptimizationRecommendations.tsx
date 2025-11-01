/**
 * PromptOptimizationRecommendations Component
 *
 * Displays cost optimization recommendations for prompt calculator configurations.
 * Follows the same pattern as chatbot recommendations (Calculator.tsx lines 293-338).
 *
 * Shows:
 * - Priority-colored cards (HIGH=red, MEDIUM=yellow, LOW=blue)
 * - Recommendation title and priority badge
 * - Description and potential savings
 * - Actionable next steps
 */

import { useCalculatorStore } from '@/store/useCalculatorStore';
import { generatePromptRecommendations } from '@/utils/optimizationEngine';

export function PromptOptimizationRecommendations() {
  const { promptConfig, promptResults } = useCalculatorStore();

  // Only generate recommendations if we have results
  if (!promptConfig || !promptResults) {
    return null;
  }

  const recommendations = generatePromptRecommendations(promptConfig, promptResults);

  // Only render if we have recommendations
  if (recommendations.length === 0) {
    return null;
  }

  // Sort by priority (HIGH > MEDIUM > LOW)
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.potentialSavings - a.potentialSavings;
  });

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">
        Optimization Recommendations
      </h2>
      <div className="space-y-4">
        {sortedRecommendations.map((rec, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 ${
              rec.priority === 'HIGH'
                ? 'bg-red-50 border-red-500'
                : rec.priority === 'MEDIUM'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-blue-50 border-blue-500'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{rec.title}</h3>
              <span
                className={`px-2 py-1 text-xs font-bold rounded ${
                  rec.priority === 'HIGH'
                    ? 'bg-red-200 text-red-800'
                    : rec.priority === 'MEDIUM'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-blue-200 text-blue-800'
                }`}
              >
                {rec.priority}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              {rec.description}
            </p>
            <p className="text-sm font-semibold text-green-600">
              Potential Savings: ${rec.potentialSavings.toFixed(2)} (
              {rec.savingsPercentage.toFixed(1)}%)
            </p>
            <p className="text-sm text-gray-600 mt-2 italic">
              {rec.action}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
