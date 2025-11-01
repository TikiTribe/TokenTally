import { Calculator } from './components/Calculator';

/**
 * TokenTally - LLM Chatbot Cost Calculator
 *
 * Main application component
 */
function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold text-gray-900">TokenTally</h1>
          <p className="text-gray-600 mt-2">
            Precision LLM Chatbot Cost Forecasting - Predict monthly operating costs
            within ±5% accuracy for chatbots processing millions of tokens
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Calculator />
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
