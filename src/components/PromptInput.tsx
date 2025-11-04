import React from 'react';
import { Tooltip } from './Tooltip';
import { InfoIcon } from './InfoIcon';
import { TOOLTIP_CONTENT } from '@/config/tooltipContent';
import { estimateTokensFromChars } from '../utils/tokenEstimator';
import { VALIDATION_CONSTRAINTS } from '../types';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  maxLength?: number;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  label = 'Prompt Text',
  placeholder = `You are a helpful AI assistant that provides accurate, concise answers.

User: What is the capital of France?
Assistant:`,
  maxLength = VALIDATION_CONSTRAINTS.promptText.max,
}) => {
  const charCount = value.length;
  const tokenCount = estimateTokensFromChars(value);
  const isNearLimit = charCount > maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  return (
    <div className="space-y-2">
      <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700">
        {label}
        <Tooltip content={TOOLTIP_CONTENT.prompt.promptInput}>
          <InfoIcon />
        </Tooltip>
      </label>
      <textarea
        id="prompt-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={8}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          font-mono text-sm resize-y
          ${isAtLimit ? 'border-red-500' : isNearLimit ? 'border-yellow-500' : 'border-gray-300'}
        `}
        placeholder={placeholder}
        aria-describedby="char-count token-count"
      />
      <div className="flex justify-between text-sm">
        <div id="token-count" className="text-gray-600">
          Estimated tokens: <span className="font-semibold">{tokenCount.toLocaleString()}</span>
        </div>
        <div
          id="char-count"
          className={`
            ${isAtLimit ? 'text-red-600 font-semibold' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}
          `}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
        </div>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Tip: Include your system prompt and a sample user message for accurate cost estimation
        </p>
      )}
    </div>
  );
};
