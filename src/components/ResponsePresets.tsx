import React, { useState } from 'react';
import type { ResponsePreset } from '../types';
import { RESPONSE_PRESETS } from '../types';
import { Tooltip } from './Tooltip';
import { InfoIcon } from './InfoIcon';
import { TOOLTIP_CONTENT } from '@/config/tooltipContent';

interface ResponsePresetsProps {
  value: ResponsePreset;
  onChange: (preset: ResponsePreset) => void;
  label?: string;
}

export const ResponsePresets: React.FC<ResponsePresetsProps> = ({
  value,
  onChange,
  label = 'Expected Response Size',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const selected = RESPONSE_PRESETS[value];

  return (
    <div className="space-y-2">
      <label htmlFor="response-preset" className="block text-sm font-medium text-gray-700">
        {label}
        <Tooltip content={TOOLTIP_CONTENT.prompt.responsePreset}>
          <InfoIcon />
        </Tooltip>
      </label>
      <div className="relative">
        <select
          id="response-preset"
          value={value}
          onChange={(e) => onChange(e.target.value as ResponsePreset)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     bg-white cursor-pointer"
          aria-describedby="response-preset-description"
        >
          <option value="short">Short ({RESPONSE_PRESETS.short.min}-{RESPONSE_PRESETS.short.max} tokens)</option>
          <option value="medium">Medium ({RESPONSE_PRESETS.medium.min}-{RESPONSE_PRESETS.medium.max} tokens)</option>
          <option value="long">Long ({RESPONSE_PRESETS.long.min}-{RESPONSE_PRESETS.long.max} tokens)</option>
        </select>

        <button
          type="button"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2
                     text-gray-400 hover:text-gray-600 pointer-events-auto"
          aria-label="Response preset information"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </button>

        {showTooltip && (
          <div className="absolute z-10 w-72 p-3 mt-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg">
            <div className="font-semibold mb-1">{value.charAt(0).toUpperCase() + value.slice(1)} Response</div>
            <div className="text-gray-300">{selected.description}</div>
            <div className="mt-2 text-xs text-gray-400">
              Average: {selected.average} tokens
            </div>
          </div>
        )}
      </div>

      <p id="response-preset-description" className="text-sm text-gray-600">
        Expected: <span className="font-semibold">{selected.min}-{selected.max} tokens</span> (avg {selected.average})
      </p>

      <p className="text-xs text-gray-500">
        {selected.description}
      </p>
    </div>
  );
};
