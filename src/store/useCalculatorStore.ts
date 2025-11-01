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
} from '@/types';
import { calculateChatbotCost } from '@/utils/costCalculator';
import {
  generateRecommendations,
  generateModelComparison,
} from '@/utils/optimizationEngine';

interface CalculatorState {
  // Configuration
  config: ChatbotConfig;

  // Results
  results: CostBreakdown | null;
  recommendations: Recommendation[];
  comparison: ModelComparison | null;

  // UI State
  isCalculating: boolean;
  error: string | null;

  // Actions
  setConfig: (updates: Partial<ChatbotConfig>) => void;
  calculate: () => void;
  resetConfig: () => void;
}

// Default configuration
const DEFAULT_CONFIG: ChatbotConfig = {
  modelId: 'claude-3-5-sonnet',
  systemPromptTokens: 1000,
  avgUserMessageTokens: 100,
  avgResponseTokens: 200,
  conversationTurns: 5,
  conversationsPerMonth: 10000,
  contextStrategy: 'moderate',
  cacheHitRate: 0.9,
};

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  results: null,
  recommendations: [],
  comparison: null,
  isCalculating: false,
  error: null,

  // Update configuration
  setConfig: (updates: Partial<ChatbotConfig>) => {
    set((state) => ({
      config: { ...state.config, ...updates },
    }));

    // Auto-calculate on config change
    setTimeout(() => get().calculate(), 100);
  },

  // Calculate costs and recommendations
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

  // Reset to default configuration
  resetConfig: () => {
    set({ config: DEFAULT_CONFIG });
    setTimeout(() => get().calculate(), 100);
  },
}));

// Initial calculation
setTimeout(() => {
  useCalculatorStore.getState().calculate();
}, 0);
