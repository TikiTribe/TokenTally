import React, { useState } from 'react';

/**
 * TokenConversionHelper Component
 *
 * Educational section explaining token-to-word conversion rates.
 * Collapsible design to avoid cluttering the UI.
 */
export const TokenConversionHelper: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6 border border-blue-200 rounded-lg bg-blue-50">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 transition-colors rounded-lg"
        aria-expanded={isExpanded}
        aria-controls="token-conversion-content"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium text-blue-900">
            How are tokens calculated?
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div
          id="token-conversion-content"
          className="px-4 pb-4 text-sm text-gray-700 space-y-3 animate-in fade-in duration-200"
        >
          <div className="pt-2 border-t border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              English Language Conversion Rates:
            </h4>
            <ul className="space-y-1 ml-4">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>1.3 tokens per word</strong> (average)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2">•</span>
                <span><strong>4 characters per token</strong> (average)</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Examples:</h4>
            <ul className="space-y-1 ml-4 font-mono text-xs bg-white p-3 rounded border border-blue-100">
              <li>"Hello world" = 2 words ≈ 2.6 tokens ≈ 10 chars</li>
              <li>100 words ≈ 130 tokens ≈ 400 characters</li>
              <li>1,000 tokens ≈ 770 words ≈ 4,000 characters</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> Actual token counts vary by model tokenizer.
              Use these as estimates for planning purposes. The Prompt Calculator
              shows real-time token counts as you type.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
