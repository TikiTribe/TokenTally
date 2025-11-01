# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TokenTally** is a precision LLM chatbot cost forecasting tool for small businesses. It predicts monthly operating costs within ±5% accuracy for chatbots processing millions of tokens across Claude and OpenAI models.

**Target Users**: Small business owners building high-volume customer service chatbots
**Core Value**: Identify cost optimization opportunities worth $500-$5,000/month through caching, model selection, and context strategies

## Architecture

### Technology Stack
- **Frontend**: React 18.3+ with TypeScript 5.5+ (strict mode)
- **Build Tool**: Vite (fast dev server, optimized production builds)
- **Styling**: Tailwind CSS
- **State**: Zustand (lightweight state management)
- **Charts**: Recharts (cost breakdowns, comparisons)
- **Exports**: jsPDF + jsPDF-AutoTable (PDF reports), Blob API (CSV)
- **Deployment**: Fully client-side (Vercel/Netlify), no backend

### Core Calculation Engine

The heart of TokenTally is chatbot-specific token modeling, NOT generic LLM usage estimation:

**Conversation Structure**:
```typescript
firstTurnCost = (systemPrompt + userMsg) × inputPrice + response × outputPrice
laterTurnsCost = (cachedSystemPrompt + userMsg + context) × inputPrice + response × outputPrice
conversationCost = firstTurn + (laterTurns × (turns - 1))
monthlyCost = conversationCost × conversationsPerMonth
```

**Key Differentiators**:
1. **Prompt Caching Modeling** (Claude): 90% cost reduction on cached system prompts
2. **Context Accumulation**: Tracks token growth across conversation turns
3. **Context Strategies**: Minimal (50t/turn), Moderate (150t/turn), Full (300t/turn)
4. **Precision Inputs**: Actual conversation patterns, not generic averages

### State Management Pattern

Uses Zustand for centralized calculator state:

```typescript
// useCalculatorStore.ts
interface CalculatorState {
  config: ChatbotConfig;           // User inputs
  results: CostBreakdown | null;   // Calculation outputs
  setConfig: (updates) => void;    // Update inputs
  calculate: () => void;           // Trigger calculation
}
```

**All calculations happen in pure TypeScript utilities** (`src/utils/costCalculator.ts`), NOT in React components. Components only render and dispatch state updates.

### Pricing Data Configuration

Models and pricing are defined in `src/config/pricingData.ts`:

```typescript
export const LLM_PRICING = {
  'gpt-4o': { inputPerMToken: 5.00, outputPerMToken: 15.00, ... },
  'claude-3-5-sonnet': {
    inputPerMToken: 3.00,
    outputPerMToken: 15.00,
    cacheReadPerMToken: 0.30,  // 90% savings
    ...
  },
  // ... 6 total models
};
```

**Update Strategy**: Manual edits when providers change pricing (typically quarterly). Always include `lastUpdated` field and document source.

### Component Responsibilities

**Dual Calculator Application** with tab-based navigation:

#### Chatbot Calculator (Tab 1)
- `ModelSelector`: Dropdown for 6 models (OpenAI: 3, Claude: 3)
- `ChatbotConfig`: All user inputs (system prompt, messages, turns, context, volume)
- `CostDisplay`: Primary monthly cost + per-conversation cost (large, prominent)
- `CostBreakdown`: Detailed 5-line breakdown (system/cache/input/output/context)
- `OptimizationRecommendations`: AI-generated savings opportunities (sorted by priority)
- `ModelComparison`: Side-by-side current vs best alternative
- `ExportButtons`: PDF report + CSV download

#### Prompt Calculator (Tab 2)
- `ModelSelector`: Same 6 models with framework detection
- `PromptInput`: Multi-line text area with character/token count
- `ResponsePresets`: Small/Medium/Large/XLarge response size selection
- `BatchConfig`: Batch operations volume with multi-turn toggle
- `PromptCostDisplay`: Per-call cost + monthly batch costs
- `PromptCostBreakdown`: Input/output token breakdown
- `PromptModelComparison`: Side-by-side cost comparison
- `PromptOptimizationRecommendations`: Batch-specific optimization tips
- `ExportButtons`: Prompt-specific PDF report + CSV download

**Design Principle**: Real-time updates (<100ms) as inputs change. No "Calculate" button.

## Development Workflow

### Project Setup
```bash
npm install
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # TypeScript compile + Vite production build
npm run preview      # Test production build locally
npm run lint         # ESLint with TypeScript rules
```

### Key Development Patterns

**Token Estimation Helpers** (`src/utils/tokenEstimator.ts`):
- Character-to-token: ~4 chars = 1 token
- Word-to-token: ~1.3 tokens per word
- Use these for user-friendly inputs (convert words/chars to tokens)

**Caching Calculations** (Claude-specific):
```typescript
// CRITICAL: Cache savings only apply to turns 2+
const cacheSavings = (systemPrompt / 1M) × (inputPrice - cachePrice) × cacheHitRate
const totalCacheSavings = cacheSavings × (turns - 1)
```

**Optimization Engine** (`src/utils/optimizationEngine.ts`):
1. Compare current config against all 6 models
2. Identify 20%+ savings opportunities (HIGH priority)
3. Check context strategy alternatives (MEDIUM if >15% savings)
4. Response length optimization (LOW if >10% savings)
5. Sort by savings potential, return top 3-5

**Export Format**:
- PDF: Executive summary → model details → breakdown table → recommendations
- CSV: Tabular data ready for Excel import
- Both include timestamp, configuration snapshot, assumptions

## Security Standards

TokenTally is a **client-side only** application with minimal security surface. See `SECURITY.md` for complete security documentation.

### Security Context
- ✅ No user accounts, API keys, or backend server
- ✅ All data stays in user's browser (privacy benefit)
- ⚠️ Security focus: dependency security, input validation, safe exports

### Key Security Rules

**1. Dependency Security**
- Run `npm audit` before releases
- Use exact versions in package.json (no `^` or `~`)
- Review dependency tree for suspicious packages
- Only use well-maintained packages (>1M downloads/week)

**2. Input Validation**
```typescript
// All user inputs must be validated with min/max bounds
function validateConversationsPerMonth(value: number): number {
  const MIN = 1, MAX = 10_000_000;
  if (!Number.isFinite(value)) throw new Error('Invalid number');
  return Math.max(MIN, Math.min(MAX, Math.floor(value)));
}
```

**3. Export Security**
```typescript
// Prevent CSV formula injection (Excel/Sheets execute formulas)
function sanitizeForCSV(value: string): string {
  if (['=', '+', '-', '@'].some(c => value.startsWith(c))) {
    return `'${value}`; // Prefix with quote to treat as text
  }
  return value;
}
```

**4. TypeScript Strict Mode**
- All files use strict mode (`tsconfig.json`)
- No implicit any, strict null checks
- Prevents type errors in financial calculations

**5. ESLint Security Rules**
- No `eval()`, `Function()`, or dynamic code execution
- Security plugin detects unsafe patterns
- See `.eslintrc.json` for full configuration

### Security Checklist (Pre-Release)
- [ ] Run `npm audit` and resolve high/critical vulnerabilities
- [ ] Test inputs with edge cases (0, negative, NaN, Infinity)
- [ ] Verify PDF/CSV exports don't execute code
- [ ] No console.log or TODO/FIXME with security implications
- [ ] Production build succeeds without warnings

**Reference**: See `SECURITY.md` for detailed standards, validation patterns, and vulnerability reporting.

## Critical Accuracy Requirements

**±5% Precision Target** depends on:

1. **Exact Pricing Data**: Update `pricingData.ts` when providers change rates
2. **Realistic Cache Hit Rates**: Production chatbots achieve 85-95%, use 90% default
3. **Accurate Token Counts**: System prompts should be exact (not estimated)
4. **Conversation Pattern Validation**: Test against real usage data when possible

**Known Limitations**:
- Does NOT account for API retry costs
- Does NOT include rate limiting impacts
- Assumes consistent conversation patterns (no outliers)
- Context growth is linear estimate (actual may vary)

## Model-Specific Considerations

**Claude Models**:
- Prompt caching is the PRIMARY cost optimization (40-90% savings)
- Cache hit rate of 90% is realistic for production chatbots
- System prompts >1000 tokens see maximum benefit
- 5-minute cache TTL (default) vs 1-hour (2x write cost)

**OpenAI Models**:
- No caching available (as of Jan 2025)
- GPT-4o-mini is 97% cheaper than GPT-4o ($0.15 vs $5 input)
- Output tokens are 3-4x more expensive than input
- Batch API (50% discount) is out of scope for MVP (chatbots need real-time)

## Testing Strategy

**Manual Test Cases** (no automated testing in MVP):
1. Zero conversation cost = $0
2. Single-turn conversation (no caching benefit)
3. High-volume caching scenario (validate 90% savings)
4. Context accumulation (full strategy vs minimal)
5. Model comparison (verify cheapest model identified)

**Validation**: Hand-calculate at least 3 scenarios, compare to tool output within 1%

## Future Phase Notes

**Phase 2** (out of scope for MVP):
- Historical usage tracking (API integration with OpenAI/Anthropic)
- Budget alerts and monitoring dashboard
- Multi-scenario comparison (3+ configs side-by-side)
- Custom branding (logo upload, color themes)

**Explicitly NOT Included**:
- User authentication (standalone tool, no accounts)
- Backend server (fully client-side calculations)
- Database storage (all calculations in-memory)
- Production applications (focus: chatbots only)

## Deployment

**Build Output**: Static site, deploy to Vercel/Netlify
```bash
npm run build  # Creates dist/ folder
# Upload dist/ to hosting provider
```

**Environment**: No environment variables needed (no API keys, no backend)

**Analytics**: Include Google Analytics tag in index.html for usage tracking

## Project Status

**Current Phase**: ✅ **PRODUCTION READY** (All MVP features complete, deployment authorized)
**Completion**: 11 of 12 tasks (91.7% - awaiting user deployment to Vercel)
**MVP Features**:
- ✅ 6 models (OpenAI: GPT-4o, GPT-4o-mini, GPT-3.5-turbo | Claude: 3.5 Sonnet, 3.5 Haiku, 3 Haiku)
- ✅ Chatbot Calculator (conversation-specific cost modeling)
- ✅ Prompt Calculator (batch API operations with multi-turn support)
- ✅ PDF/CSV export (both calculators with security)
- ✅ Optimization recommendations (AI-generated savings opportunities)
- ✅ Model comparison (side-by-side cost analysis)
- ✅ Real-time calculations (<100ms updates)
- ✅ Security compliance (OWASP A03:2021, 0 vulnerabilities)

**Quality Metrics**:
- ✅ TypeScript Compilation: 0 errors (11 strict flags)
- ✅ Security Audit: 0 vulnerabilities (npm audit after Vite 6.4.1 upgrade)
- ✅ Bundle Size: 305 KB gzipped (40% under 500 KB target)
- ✅ Test Accuracy: 0.00% - 3.90% variance (exceeds ±5% target)
- ✅ Test Pass Rate: 100% (22/22 scenarios)

**Deployment Configuration**:
- ✅ vercel.json created (security headers, SPA rewrites, asset caching)
- ✅ DEPLOYMENT.md created (8,500+ word comprehensive guide)
- ✅ SECURITY_ANALYSIS_REPORT.md created (deep security assessment)

**Next Step**: User deployment to Vercel (see DEPLOYMENT.md for 3 methods)
