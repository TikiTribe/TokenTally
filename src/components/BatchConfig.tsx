import React from 'react';
import type { ContextStrategy } from '../types';
import { CONTEXT_STRATEGY_TOKENS, VALIDATION_CONSTRAINTS } from '../types';

interface BatchConfigProps {
  batchOperations: number;
  onBatchChange: (value: number) => void;
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

export const BatchConfig: React.FC<BatchConfigProps> = ({
  batchOperations,
  onBatchChange,
  multiTurnEnabled,
  onMultiTurnToggle,
  turns = 5,
  onTurnsChange,
  contextStrategy = 'moderate',
  onContextStrategyChange,
  cacheHitRate = 90,
  onCacheHitRateChange,
  supportsCache = false,
}) => {
  return (
    <div className="space-y-6">
      {/* Batch Operations */}
      <div className="space-y-2">
        <label htmlFor="batch-operations" className="block text-sm font-medium text-gray-700">
          Batch Operations per Month
        </label>
        <input
          id="batch-operations"
          type="number"
          value={batchOperations}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 1;
            onBatchChange(Math.max(1, Math.min(VALIDATION_CONSTRAINTS.batchOperations.max, val)));
          }}
          min={VALIDATION_CONSTRAINTS.batchOperations.min}
          max={VALIDATION_CONSTRAINTS.batchOperations.max}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-sm text-gray-600">
          How many times will this prompt be executed per month?
        </p>
      </div>

      {/* Multi-Turn Toggle */}
      <div className="border-t border-gray-200 pt-6">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={multiTurnEnabled}
            onChange={onMultiTurnToggle}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-700">
              Model multi-turn conversation
            </span>
            <p className="text-sm text-gray-500 mt-1">
              Enable if your prompt involves back-and-forth dialogue with context accumulation
            </p>
          </div>
        </label>
      </div>

      {/* Multi-Turn Configuration */}
      {multiTurnEnabled && onTurnsChange && onContextStrategyChange && (
        <div className="pl-7 space-y-4 border-l-2 border-blue-200">
          {/* Turns */}
          <div className="space-y-2">
            <label htmlFor="turns" className="block text-sm font-medium text-gray-700">
              Conversation Turns
            </label>
            <div className="flex items-center space-x-4">
              <input
                id="turns"
                type="range"
                value={turns}
                onChange={(e) => onTurnsChange(parseInt(e.target.value))}
                min={1}
                max={50}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-semibold text-gray-700 w-12 text-right">{turns}</span>
            </div>
            <p className="text-xs text-gray-500">
              Number of back-and-forth exchanges in the conversation
            </p>
          </div>

          {/* Context Strategy */}
          <div className="space-y-2">
            <label htmlFor="context-strategy" className="block text-sm font-medium text-gray-700">
              Context Accumulation Strategy
            </label>
            <select
              id="context-strategy"
              value={contextStrategy}
              onChange={(e) => onContextStrategyChange(e.target.value as ContextStrategy)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="minimal">Minimal ({CONTEXT_STRATEGY_TOKENS.minimal} tokens/turn)</option>
              <option value="moderate">Moderate ({CONTEXT_STRATEGY_TOKENS.moderate} tokens/turn - Recommended)</option>
              <option value="full">Full ({CONTEXT_STRATEGY_TOKENS.full} tokens/turn)</option>
            </select>
            <p className="text-xs text-gray-500">
              How much conversation history is included in each turn
            </p>
          </div>

          {/* Cache Hit Rate (Claude only) */}
          {supportsCache && onCacheHitRateChange && (
            <div className="space-y-2 bg-blue-50 p-4 rounded-md">
              <label htmlFor="cache-hit-rate" className="block text-sm font-medium text-blue-900">
                Cache Hit Rate (%)
              </label>
              <div className="flex items-center space-x-4">
                <input
                  id="cache-hit-rate"
                  type="range"
                  value={cacheHitRate}
                  onChange={(e) => onCacheHitRateChange(parseInt(e.target.value))}
                  min={0}
                  max={100}
                  step={5}
                  className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-semibold text-blue-900 w-12 text-right">{cacheHitRate}%</span>
              </div>
              <p className="text-xs text-blue-700">
                Percentage of conversations that benefit from cached system prompts (90% is typical)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
