# TokenTally

**Precision LLM Chatbot Cost Forecasting Tool**

Predict monthly operating costs within ±5% accuracy for chatbots processing millions of tokens across Claude and OpenAI models.

## Features

- **6 LLM Models**: OpenAI (GPT-4o, GPT-4o-mini, GPT-3.5-turbo) + Claude (3.5 Sonnet, 3.5 Haiku, 3 Haiku)
- **Chatbot-Specific Modeling**: Conversation turns, context accumulation, caching optimization
- **Prompt Caching Support**: Claude models with 90% cost savings on cached system prompts
- **Cost Optimization**: AI-generated recommendations for $500-$5,000/month savings
- **Professional Reports**: PDF and CSV export functionality
- **Real-Time Calculations**: <100ms updates as you adjust configuration
- **Security-First**: Client-side only, input validation, formula injection prevention

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:5173` to see the application.

## Technology Stack

- **Frontend**: React 18.3+ with TypeScript 5.6+
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **State**: Zustand 4.5
- **Charts**: Recharts 2.12
- **Exports**: jsPDF 3.0 + jsPDF-AutoTable 5.0

## Project Structure

```
src/
├── components/
│   └── Calculator.tsx       # Main UI components
├── config/
│   └── pricingData.ts       # LLM pricing configuration
├── store/
│   └── useCalculatorStore.ts # Zustand state management
├── types/
│   └── index.ts             # TypeScript type definitions
├── utils/
│   ├── costCalculator.ts    # Core calculation engine
│   ├── optimizationEngine.ts # Recommendation generator
│   ├── validators.ts        # Input validation
│   ├── csvExporter.ts       # CSV export with security
│   └── pdfExporter.ts       # PDF report generation
├── App.tsx                  # Main application
└── main.tsx                 # Application entry point
```

## Cost Calculation Formula

### Conversation Structure

```typescript
firstTurnCost = (systemPrompt + userMsg) × inputPrice + response × outputPrice

// For Claude (with caching):
laterTurnsCost = (cachedSystemPrompt × cacheReadPrice + userMsg + context) × inputPrice
                 + response × outputPrice

// For OpenAI (no caching):
laterTurnsCost = (systemPrompt + userMsg + context) × inputPrice
                 + response × outputPrice

conversationCost = firstTurn + (laterTurns × (turns - 1))
monthlyCost = conversationCost × conversationsPerMonth
```

### Key Parameters

- **System Prompt Tokens**: Size of your chatbot's system prompt (1-100,000 tokens)
- **Avg User Message**: Typical user input size (1-10,000 tokens)
- **Avg Response**: Typical AI response size (1-10,000 tokens)
- **Conversation Turns**: Number of back-and-forth exchanges (1-50)
- **Conversations/Month**: Monthly conversation volume (1-10,000,000)
- **Context Strategy**:
  - Minimal: 50 tokens/turn (basic context)
  - Moderate: 150 tokens/turn (recommended)
  - Full: 300 tokens/turn (maximum context)
- **Cache Hit Rate**: For Claude models, % of conversations with cached system prompt (default: 90%)

## Security

TokenTally is a client-side only application with no backend, authentication, or database. Security focus:

- **Dependency Security**: Updated to patch CVEs (jsPDF 3.0.3, Vite 5.4.21, ESLint 9.39)
- **Input Validation**: All user inputs validated with min/max bounds
- **CSV Formula Injection Prevention**: Sanitizes `=`, `+`, `-`, `@` characters
- **TypeScript Strict Mode**: Type safety for financial calculations
- **ESLint Security Plugin**: Detects unsafe patterns

See `SECURITY.md` for complete security documentation.

## Pricing Data Sources

- **OpenAI**: https://openai.com/api/pricing/ (as of Jan 2025)
- **Claude**: https://www.anthropic.com/pricing (as of Jan 2025)

Pricing last updated: **January 31, 2025**

## Known Limitations

- Does NOT account for API retry costs
- Does NOT include rate limiting impacts
- Assumes consistent conversation patterns (no outliers)
- Context growth is linear estimate (actual may vary)
- Token estimates are approximate (~4 chars = 1 token)

## Development

```bash
# Run linter
npm run lint

# Run linter with auto-fix
npm run lint -- --fix

# Type checking only
npx tsc --noEmit

# Security audit
npm audit
```

## Manual Testing

Run these 5 test scenarios to validate accuracy:

1. **Zero Conversations**: 0 conversations/month → $0 cost
2. **Single-Turn**: 1 turn → No caching benefit for Claude
3. **High-Volume Caching**: 1000t system prompt, 10K conversations/month, Claude → Verify 90% cache savings
4. **Context Accumulation**: Full vs Minimal strategy → Validate cost difference
5. **Model Comparison**: Same config across all 6 models → Verify cheapest model identified

Hand-calculate at least 2 scenarios and compare to tool output (must be within 1%).

## Deployment

TokenTally is a static site ready for Vercel/Netlify:

```bash
npm run build  # Creates dist/ folder
# Upload dist/ to hosting provider
```

No environment variables needed - fully client-side calculations.

## License

MIT License - See LICENSE file for details

## Support

For issues, feature requests, or questions:
1. Check `CLAUDE.md` for architecture and development patterns
2. Review `SECURITY.md` for security guidelines
3. See pricing data update process in `src/config/pricingData.ts`

---

**Built with Claude Code** - Precision cost forecasting for small business LLM chatbots
