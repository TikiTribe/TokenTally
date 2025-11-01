import React from 'react';
import { PromptInput } from './PromptInput';
import { ResponsePresets } from './ResponsePresets';
import { BatchConfig } from './BatchConfig';
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

      {/* Cost Display Placeholder - Will be connected to store later */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-sm text-blue-800">
          Cost calculation will be displayed here once connected to the Zustand store
        </p>
      </div>
    </div>
  );
};
