/**
 * TokenTally Calculator Components
 *
 * Complete UI implementation for chatbot cost calculator
 */

import { useCalculatorStore } from '@/store/useCalculatorStore';
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';
import { exportAndDownloadPDF } from '@/utils/pdfExporter';
import { exportAndDownloadCSV } from '@/utils/csvExporter';
import type { ContextStrategy } from '@/types';
import { Tooltip } from './Tooltip';
import { InfoIcon } from './InfoIcon';
import { TOOLTIP_CONTENT } from '@/config/tooltipContent';
import { TokenConversionHelper } from './TokenConversionHelper';

export function Calculator() {
  const {
    config,
    results,
    recommendations,
    comparison,
    setConfig,
    resetConfig,
  } = useCalculatorStore();

  // Get model IDs by provider and map to full model objects
  const openaiIds = getModelsByProvider('openai');
  const claudeIds = getModelsByProvider('anthropic');

  const openai = openaiIds.map(id => ({
    id,
    name: LLM_PRICING[id]?.modelFamily || id,
  }));

  const claude = claudeIds.map(id => ({
    id,
    name: LLM_PRICING[id]?.modelFamily || id,
  }));

  const handleExportPDF = () => {
    if (results) {
      exportAndDownloadPDF(config, results, recommendations);
    }
  };

  const handleExportCSV = () => {
    if (results) {
      exportAndDownloadCSV(config, results, recommendations);
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Conversion Helper */}
      <TokenConversionHelper />

      {/* Model Selector */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">
          Model Selection
          <Tooltip content={TOOLTIP_CONTENT.chatbot.modelSelection}>
            <InfoIcon />
          </Tooltip>
        </h2>
        <select
          className="input-field"
          value={config.modelId}
          onChange={(e) => setConfig({ modelId: e.target.value })}
        >
          <optgroup label="OpenAI">
            {openai.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Claude (Anthropic)">
            {claude.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Configuration Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Chatbot Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              System Prompt Tokens
              <Tooltip content={TOOLTIP_CONTENT.chatbot.systemPromptTokens}>
                <InfoIcon />
              </Tooltip>
            </label>
            <input
              type="number"
              className="input-field"
              value={config.systemPromptTokens}
              onChange={(e) =>
                setConfig({ systemPromptTokens: parseInt(e.target.value) || 0 })
              }
              min="1"
              max="100000"
              placeholder="2000"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., ~1,540 words or ~8,000 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Avg User Message Tokens
              <Tooltip content={TOOLTIP_CONTENT.chatbot.avgUserMessageTokens}>
                <InfoIcon />
              </Tooltip>
            </label>
            <input
              type="number"
              className="input-field"
              value={config.avgUserMessageTokens}
              onChange={(e) =>
                setConfig({ avgUserMessageTokens: parseInt(e.target.value) || 0 })
              }
              min="1"
              max="10000"
              placeholder="50"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., ~38 words or ~200 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Avg Response Tokens
              <Tooltip content={TOOLTIP_CONTENT.chatbot.avgResponseTokens}>
                <InfoIcon />
              </Tooltip>
            </label>
            <input
              type="number"
              className="input-field"
              value={config.avgResponseTokens}
              onChange={(e) =>
                setConfig({ avgResponseTokens: parseInt(e.target.value) || 0 })
              }
              min="1"
              max="10000"
              placeholder="150"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., ~115 words or ~600 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Conversation Turns
              <Tooltip content={TOOLTIP_CONTENT.chatbot.conversationTurns}>
                <InfoIcon />
              </Tooltip>
            </label>
            <input
              type="number"
              className="input-field"
              value={config.conversationTurns}
              onChange={(e) =>
                setConfig({ conversationTurns: parseInt(e.target.value) || 1 })
              }
              min="1"
              max="50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Conversations Per Month
              <Tooltip content={TOOLTIP_CONTENT.chatbot.conversationsPerMonth}>
                <InfoIcon />
              </Tooltip>
            </label>
            <input
              type="number"
              className="input-field"
              value={config.conversationsPerMonth}
              onChange={(e) =>
                setConfig({
                  conversationsPerMonth: parseInt(e.target.value) || 1,
                })
              }
              min="1"
              max="10000000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Context Strategy
              <Tooltip content={TOOLTIP_CONTENT.chatbot.contextStrategy}>
                <InfoIcon />
              </Tooltip>
            </label>
            <select
              className="input-field"
              value={config.contextStrategy}
              onChange={(e) =>
                setConfig({
                  contextStrategy: e.target.value as ContextStrategy,
                })
              }
            >
              <option value="minimal">Minimal (50 tokens/turn)</option>
              <option value="moderate">Moderate (150 tokens/turn)</option>
              <option value="full">Full (300 tokens/turn)</option>
            </select>
          </div>

          {config.modelId.includes('claude') && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Cache Hit Rate (%)
                <Tooltip content={TOOLTIP_CONTENT.chatbot.cacheHitRate}>
                  <InfoIcon />
                </Tooltip>
              </label>
              <input
                type="number"
                className="input-field"
                value={(config.cacheHitRate * 100).toFixed(0)}
                onChange={(e) =>
                  setConfig({
                    cacheHitRate: parseInt(e.target.value) / 100 || 0.9,
                  })
                }
                min="0"
                max="100"
              />
            </div>
          )}
        </div>

        <div className="mt-4">
          <button onClick={resetConfig} className="btn-secondary">
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Cost Display */}
      {results && (
        <>
          <div className="card bg-gradient-to-r from-primary-50 to-primary-100">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 mb-2">
                Monthly Operating Cost
              </p>
              <p className="text-5xl font-bold text-primary-700">
                ${results.monthlyCost.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-4">
                ${results.perConversationCost.toFixed(4)} per conversation
              </p>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Cost Breakdown</h2>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span>System Prompt Processing</span>
                <span className="font-mono">
                  ${results.breakdown.systemPromptCost.toFixed(4)}
                </span>
              </div>
              {results.breakdown.cacheSavings < 0 && (
                <div className="flex justify-between py-2 border-b text-green-600">
                  <span>Prompt Cache Savings</span>
                  <span className="font-mono">
                    ${results.breakdown.cacheSavings.toFixed(4)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span>User Input Tokens</span>
                <span className="font-mono">
                  ${results.breakdown.inputTokensCost.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>AI Output Tokens</span>
                <span className="font-mono">
                  ${results.breakdown.outputTokensCost.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span>Context Accumulation</span>
                <span className="font-mono">
                  ${results.breakdown.contextAccumulationCost.toFixed(4)}
                </span>
              </div>
            </div>
          </div>

          {/* Model Comparison */}
          {comparison && comparison.alternative.savings > 0 && (
            <div className="card bg-yellow-50">
              <h2 className="text-xl font-semibold mb-4">Model Comparison</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Model</p>
                  <p className="font-semibold">{comparison.current.model}</p>
                  <p className="text-lg">
                    ${comparison.current.monthlyCost.toFixed(2)}/mo
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Best Alternative</p>
                  <p className="font-semibold">{comparison.alternative.model}</p>
                  <p className="text-lg text-green-600">
                    ${comparison.alternative.monthlyCost.toFixed(2)}/mo
                  </p>
                  <p className="text-sm text-green-600">
                    Save ${comparison.alternative.savings.toFixed(2)} (
                    {comparison.alternative.savingsPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">
                Optimization Recommendations
              </h2>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
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
          )}

          {/* Export Buttons */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Export Reports</h2>
            <div className="flex gap-4">
              <button onClick={handleExportPDF} className="btn-primary">
                Download PDF Report
              </button>
              <button onClick={handleExportCSV} className="btn-secondary">
                Download CSV Data
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
