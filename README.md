# TokenTally

**LLM cost forecasting — precision scoped per model, honest ranges everywhere.**

Forecast the monthly cost of LLM workloads across 1,300+ models. Accuracy is scoped per model, never a
single global number: token counts are **exact** where a verified tokenizer exists (OpenAI via tiktoken) and
**labeled estimates with error bands** otherwise; every forecast carries an accuracy badge, a confidence
range, and a link to its formula and the pricing snapshot it was priced against.

## Features

### Five workloads on one engine
- **Chatbot** — conversation cost with context accumulation + cross-run warm-cache modeling
- **Prompt / Batch** — batch API operations, optional multi-turn
- **Agent** — tool-loop cost with per-step accumulation
- **Multi-agent** — crew cost (per-member + shared transcript)
- **Denial of Wallet** — a *defensive*, opt-in worst-case exposure estimator (bounded, with a dual-use
  disclaimer and a vulnerability-reporting link)

### Core capabilities
- **1,300+ models** from a hash-verified, committed pricing snapshot (community-mirrored LiteLLM data;
  prices are not independently verified against provider billing — the accuracy badge reflects token-count
  fidelity only)
- **Prompt-cache modeling** (Claude, GPT-4o family) with a warm-cache break-even view
- **Provider-agnostic optimization**: model/deployment switches, TTL tuning, tornado sensitivity, budget solve
- **Exports** (CSV / PDF) with CSV formula-injection protection; a config-only shareable permalink (prompt
  text is never encoded)
- **Real-time** (< 100 ms) via an in-browser tokenizer web worker
- **Client-side only** — prompt text is tokenized in the browser and never transmitted; strict enforced CSP,
  WCAG AA, light/dark
- **Security**: 0 npm vulnerabilities; exact-pinned dependencies; a committed, hash-verified pricing snapshot

Accuracy claims are honest by construction: precision is stated per model badge, never as a single global
figure, and test scenarios are hand-verified against hand math (not exhaustively counted). Where a
deterministic tokenizer exists, cost scenarios reconcile to within 1% of hand math.

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

# Update pricing data (quarterly maintenance)
npm run update-pricing
```

Visit `http://localhost:5173` to see the application.

## Technology Stack

- **Frontend**: React 18.3 + TypeScript 5.6 (strict)
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 3.4 + CSS custom properties (light/dark)
- **State**: Zustand 4.5
- **Charts**: hand-rolled SVG (no chart dependency — CSP-safe, a11y-first)
- **Tokenizer**: js-tiktoken in a web worker
- **Exports**: jsPDF 4 (lazy-loaded); CSV via Blob

> Note: sections below (project structure, "CSV-driven pricing", the older formula walkthrough) describe the
> pre-overhaul MVP and are being refreshed. The pricing catalog is now a committed, hash-verified registry
> snapshot (`src/config/registry.generated.json`), refreshed via a reviewed PR — not the old CSV utility.

## Project Structure

```
src/
├── components/
│   ├── ChatbotCalculator.tsx    # Chatbot cost calculator UI
│   ├── PromptCalculator.tsx     # Prompt cost calculator UI
│   ├── ModelSelector.tsx        # Model selection dropdown
│   ├── PromptInput.tsx          # Multi-line prompt input
│   └── ...                      # Other UI components
├── config/
│   └── pricingData.ts           # LLM pricing configuration (generated from the pinned registry snapshot)
├── store/
│   └── useCalculatorStore.ts    # Zustand state (both calculators)
├── types/
│   └── index.ts                 # TypeScript type definitions
├── utils/
│   ├── costCalculator.ts        # Core calculation engines
│   ├── optimizationEngine.ts    # Recommendation generators
│   ├── validators.ts            # Input validation framework
│   ├── csvExporter.ts           # CSV export with security
│   └── pdfExporter.ts           # PDF report generation
├── App.tsx                      # Main application with tab navigation
└── main.tsx                     # Application entry point

scripts/
├── types/
│   └── csvSchema.ts             # CSV validation types
├── validators/
│   └── csvValidator.ts          # Field and business validators (15 rules)
├── parsers/
│   └── csvParser.ts             # CSV parsing with validation
├── transformers/
│   └── dataTransformer.ts       # Data transformation utilities
├── utils/
│   └── pricingHelpers.ts        # Code generation utilities
└── update-pricing-from-csv.ts   # CSV-driven pricing updates (<100ms)

data/
└── pricing-update.csv           # Quarterly pricing maintenance (11 columns)
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

- **Dependency Security**: Updated to patch CVEs (jsPDF 3.0.3, Vite 6.4.1, ESLint 9.39)
- **Input Validation**: All user inputs validated with min/max bounds
- **CSV Formula Injection Prevention**: Sanitizes `=`, `+`, `-`, `@` characters
- **TypeScript Strict Mode**: Type safety for financial calculations
- **ESLint Security Plugin**: Detects unsafe patterns

See `SECURITY.md` for complete security documentation.

## Pricing Data Updates

TokenTally uses a **CSV-driven pricing update system** for quarterly maintenance:

1. **Edit CSV**: Update `data/pricing-update.csv` with new model pricing (11 columns)
2. **Run Utility**: Execute `npm run update-pricing` for validation and code generation
3. **Validation**: 15 validation rules ensure data quality (11 field + 4 business rules)
4. **Auto-Generate**: Creates `src/config/pricingData.ts` with type-safe TypeScript code

**Data Sources**:
- **OpenAI**: https://openai.com/api/pricing/ (as of Jan 2025)
- **Claude**: https://www.anthropic.com/pricing (as of Jan 2025)

Pricing last updated: **November 1, 2025** (1,300+ models)

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
5. **Model Comparison**: Same config across all catalog models → Verify cheapest model identified

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
3. See pricing data update process in `data/pricing-update.csv` and `scripts/update-pricing-from-csv.ts`

---

**Built with Claude Code** - Precision cost forecasting for small business LLM chatbots
