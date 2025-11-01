import React from 'react';
import type { CalculatorMode } from '../types';

interface TabNavigationProps {
  activeMode: CalculatorMode;
  onModeChange: (mode: CalculatorMode) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeMode,
  onModeChange,
}) => {
  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="-mb-px flex space-x-8" aria-label="Calculator modes">
        <button
          onClick={() => onModeChange('chatbot')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${
              activeMode === 'chatbot'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
          aria-current={activeMode === 'chatbot' ? 'page' : undefined}
        >
          Chatbot Calculator
        </button>
        <button
          onClick={() => onModeChange('prompt')}
          className={`
            py-4 px-1 border-b-2 font-medium text-sm transition-colors
            ${
              activeMode === 'prompt'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
          aria-current={activeMode === 'prompt' ? 'page' : undefined}
        >
          Prompt Calculator
        </button>
      </nav>
    </div>
  );
};
