import React from 'react';
import { PromptInput } from './PromptInput';
import { ResponsePresets } from './ResponsePresets';
import { BatchConfig } from './BatchConfig';
import { PromptCostDisplay } from './PromptCostDisplay';
import { PromptCostBreakdown } from './PromptCostBreakdown';
import { PromptModelComparison } from './PromptModelComparison';
import { PromptOptimizationRecommendations } from './PromptOptimizationRecommendations';
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';
import { exportAndDownloadPromptPDF } from '@/utils/pdfExporter';
import { exportAndDownloadPromptCSV } from '@/utils/csvExporter';
import type { ResponsePreset, ContextStrategy } from '../types';

interface PromptCalculatorProps {
  promptText: string;
  onPromptChange: (text: string) => void;
  responsePreset: ResponsePreset;
  onResponsePresetChange: (preset: ResponsePreset) => void;
  batchOperations: number;
  onBatchOperationsChange: (value: number) => void;
  multiTurnEnabled: boolean;
  onMultiTurnToggle: () => void;
  turns?: number;
  onTurnsChange?: (value: number) => void;
  contextStrategy?: ContextStrategy;
  onContextStrategyChange?: (strategy: ContextStrategy) => void;
  cacheHitRate?: number;
  onCacheHitRateChange?: (value: number) => void;
  supportsCache?: boolean;
}

export const PromptCalculator: React.FC<PromptCalculatorProps> = ({
  promptText,
  onPromptChange,
  responsePreset,
  onResponsePresetChange,
  batchOperations,
  onBatchOperationsChange,
  multiTurnEnabled,
  onMultiTurnToggle,
  turns,
  onTurnsChange,
  contextStrategy,
  onContextStrategyChange,
  cacheHitRate,
  onCacheHitRateChange,
  supportsCache,
}) => {
  const { promptResults, promptConfig, promptRecommendations, setPromptConfig } = useCalculatorStore();

  const handleExportPDF = () => {
    if (promptResults) {
      exportAndDownloadPromptPDF(promptConfig, promptResults, promptRecommendations);
    }
  };

  const handleExportCSV = () => {
    if (promptResults) {
      exportAndDownloadPromptCSV(promptConfig, promptResults, promptRecommendations);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Prompt Calculator</h2>
          <p className="text-gray-600">
            Estimate costs for batch API operations with optional multi-turn conversation modeling
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6 space-y-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model Selection
            </label>
            <select
              className="input-field"
              value={promptConfig.modelId}
              onChange={(e) => setPromptConfig({ modelId: e.target.value })}
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

          {/* Prompt Input */}
          <PromptInput
            value={promptText}
            onChange={onPromptChange}
          />

          {/* Response Preset */}
          <ResponsePresets
            value={responsePreset}
            onChange={onResponsePresetChange}
          />

          {/* Batch Configuration */}
          <BatchConfig
            batchOperations={batchOperations}
            onBatchChange={onBatchOperationsChange}
            multiTurnEnabled={multiTurnEnabled}
            onMultiTurnToggle={onMultiTurnToggle}
            turns={turns}
            onTurnsChange={onTurnsChange}
            contextStrategy={contextStrategy}
            onContextStrategyChange={onContextStrategyChange}
            cacheHitRate={cacheHitRate}
            onCacheHitRateChange={onCacheHitRateChange}
            supportsCache={supportsCache}
          />
        </div>
      </div>

      {/* Cost Display */}
      {promptResults && (
        <>
          <PromptCostDisplay />
          <PromptCostBreakdown />
          <PromptModelComparison />
          <PromptOptimizationRecommendations />

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
};
