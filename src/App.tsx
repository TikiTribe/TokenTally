import { Calculator } from './components/Calculator';
import { TabNavigation } from './components/TabNavigation';
import { PromptCalculator } from './components/PromptCalculator';
import { useCalculatorStore } from './store/useCalculatorStore';
import { getPricingModel } from './config/pricingData';

/**
 * TokenTally - LLM Chatbot & Prompt Cost Calculator
 *
 * Main application component with dual calculator modes
 */
function App() {
  const { mode, setMode, promptConfig, setPromptConfig } = useCalculatorStore();

  // Derive supportsCache from selected model
  const selectedModel = getPricingModel(promptConfig.modelId);
  const supportsCache = selectedModel?.supportsCache ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-gray-900">TokenTally</h1>
          <p className="text-gray-600 mt-2">
            Precision LLM Cost Forecasting - Predict costs within ±5% accuracy
            for chatbots and batch API operations
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <TabNavigation activeMode={mode} onModeChange={setMode} />

        {/* Conditional Rendering Based on Mode */}
        {mode === 'chatbot' ? (
          <Calculator />
        ) : (
          <PromptCalculator
            promptText={promptConfig.promptText}
            onPromptChange={(text) => setPromptConfig({ promptText: text })}
            responsePreset={promptConfig.responsePreset}
            onResponsePresetChange={(preset) => setPromptConfig({ responsePreset: preset })}
            batchOperations={promptConfig.batchOperations}
            onBatchOperationsChange={(value) => setPromptConfig({ batchOperations: value })}
            multiTurnEnabled={promptConfig.multiTurnEnabled}
            onMultiTurnToggle={() => setPromptConfig({ multiTurnEnabled: !promptConfig.multiTurnEnabled })}
            turns={promptConfig.turns}
            onTurnsChange={(value) => setPromptConfig({ turns: value })}
            contextStrategy={promptConfig.contextStrategy}
            onContextStrategyChange={(strategy) => setPromptConfig({ contextStrategy: strategy })}
            cacheHitRate={promptConfig.cacheHitRate}
            onCacheHitRateChange={(value) => setPromptConfig({ cacheHitRate: value })}
            supportsCache={supportsCache}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center text-sm text-gray-600">
            <p>
              TokenTally - Built with React, TypeScript, and Tailwind CSS
            </p>
            <p className="mt-2">
              Target accuracy: ±5% | Pricing data: OpenAI and Anthropic (Jan 2025)
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
