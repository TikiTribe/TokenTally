/**
 * Calculator State Management Store
 *
 * Zustand store for managing chatbot cost calculator state.
 * Handles configuration, calculations, and real-time updates.
 */

import { create } from 'zustand';
import type {
  ChatbotConfig,
  CostBreakdown,
  Recommendation,
  ModelComparison,
  CalculatorMode,
  PromptCalculatorConfig,
  PromptCostBreakdown,
} from '@/types';
import { calculateChatbotCost, calculatePromptCost } from '@/utils/costCalculator';
import {
  generateRecommendations,
  generateModelComparison,
  generatePromptRecommendations,
} from '@/utils/optimizationEngine';

interface CalculatorState {
  // Calculator Mode
  mode: CalculatorMode;

  // Chatbot Calculator State
  config: ChatbotConfig;
  results: CostBreakdown | null;
  recommendations: Recommendation[];
  comparison: ModelComparison | null;

  // Prompt Calculator State
  promptConfig: PromptCalculatorConfig;
  promptResults: PromptCostBreakdown | null;
  promptRecommendations: Recommendation[];

  // UI State
  isCalculating: boolean;
  error: string | null;

  // Actions
  setMode: (mode: CalculatorMode) => void;
  setConfig: (updates: Partial<ChatbotConfig>) => void;
  setPromptConfig: (updates: Partial<PromptCalculatorConfig>) => void;
  calculate: () => void;
  calculatePrompt: () => void;
  resetConfig: () => void;
  resetPromptConfig: () => void;
}

// Default chatbot configuration
const DEFAULT_CONFIG: ChatbotConfig = {
  modelId: 'claude-sonnet-4-5-20250929',
  systemPromptTokens: 1000,
  avgUserMessageTokens: 100,
  avgResponseTokens: 200,
  conversationTurns: 5,
  conversationsPerMonth: 10000,
  contextStrategy: 'moderate',
  cacheHitRate: 0.9,
};

// Default prompt calculator configuration
const DEFAULT_PROMPT_CONFIG: PromptCalculatorConfig = {
  promptText: '',
  responsePreset: 'medium',
  batchOperations: 1000,
  multiTurnEnabled: false,
  modelId: 'claude-sonnet-4-5-20250929',
  turns: 5,
  contextStrategy: 'moderate',
  cacheHitRate: 90,
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  // Initial state
  mode: 'chatbot',
  config: DEFAULT_CONFIG,
  results: null,
  recommendations: [],
  comparison: null,
  promptConfig: DEFAULT_PROMPT_CONFIG,
  promptResults: null,
  promptRecommendations: [],
  isCalculating: false,
  error: null,

  // Set calculator mode
  setMode: (mode: CalculatorMode) => {
    set({ mode });
  },

  // Update chatbot configuration
  setConfig: (updates: Partial<ChatbotConfig>) => {
    set((state) => ({
      config: { ...state.config, ...updates },
    }));

    // Auto-calculate on config change
    setTimeout(() => get().calculate(), 100);
  },

  // Update prompt calculator configuration
  setPromptConfig: (updates: Partial<PromptCalculatorConfig>) => {
    set((state) => ({
      promptConfig: { ...state.promptConfig, ...updates },
    }));

    // Auto-calculate on config change
    setTimeout(() => get().calculatePrompt(), 100);
  },

  // Calculate chatbot costs and recommendations
  calculate: () => {
    const { config } = get();

    set({ isCalculating: true, error: null });

    try {
      // Calculate cost breakdown
      const results = calculateChatbotCost(config);

      // Generate recommendations
      const recommendations = generateRecommendations(config, results);

      // Generate model comparison
      const comparison = generateModelComparison(config, results);

      set({
        results,
        recommendations,
        comparison,
        isCalculating: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Calculation failed',
        isCalculating: false,
      });
    }
  },

  // Calculate prompt costs
  calculatePrompt: () => {
    const { promptConfig } = get();

    set({ isCalculating: true, error: null });

    try {
      // Skip calculation if prompt text is empty
      if (!promptConfig.promptText || promptConfig.promptText.trim().length === 0) {
        set({
          promptResults: null,
          promptRecommendations: [],
          isCalculating: false,
        });
        return;
      }

      // Calculate prompt cost
      const promptResults = calculatePromptCost(promptConfig);

      // Generate recommendations
      const promptRecommendations = generatePromptRecommendations(promptConfig, promptResults);

      set({
        promptResults,
        promptRecommendations,
        isCalculating: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Calculation failed',
        isCalculating: false,
      });
    }
  },

  // Reset chatbot configuration to defaults
  resetConfig: () => {
    set({ config: DEFAULT_CONFIG });
    setTimeout(() => get().calculate(), 100);
  },

  // Reset prompt configuration to defaults
  resetPromptConfig: () => {
    set({ promptConfig: DEFAULT_PROMPT_CONFIG, promptResults: null, promptRecommendations: [] });
  },
}));

// Initial calculation
setTimeout(() => {
  useCalculatorStore.getState().calculate();
}, 0);
