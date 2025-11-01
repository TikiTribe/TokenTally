# TokenTally - Development Guidelines

## Architecture Principles

### Component Separation
- **Components**: Only render and dispatch state updates
- **Utilities**: Pure functions for all calculations
- **Store**: Centralized state management with Zustand
- **Config**: Static data (pricing, models) in separate files

**NEVER** put calculation logic in React components!

Example (CORRECT):
```typescript
// Component (Calculator.tsx)
function Calculator() {
  const { config, setConfig, calculate } = useCalculatorStore();
  return <button onClick={calculate}>Calculate</button>;
}

// Utility (costCalculator.ts)
export function calculateMonthlyCost(config: ChatbotConfig): number {
  // All calculation logic here
}
```

### State Management Pattern
- **Zustand Store** (`useCalculatorStore.ts`): Single source of truth
- **State Shape**:
  - `config`: User inputs (ChatbotConfig)
  - `results`: Calculation outputs (CostBreakdown | null)
  - `setConfig`: Update inputs
  - `calculate`: Trigger calculation

### Calculation Architecture

**Core Formula** (chatbot-specific, NOT generic LLM):
```typescript
// First turn (no caching benefit)
firstTurnCost = (systemPrompt + userMsg) × inputPrice + response × outputPrice

// Later turns (with caching)
laterTurnsCost = (cachedSystemPrompt + userMsg + context) × inputPrice + response × outputPrice

// Total conversation cost
conversationCost = firstTurn + (laterTurns × (turns - 1))

// Monthly cost
monthlyCost = conversationCost × conversationsPerMonth
```

**Key Differentiators**:
1. **Prompt Caching** (Claude only): 90% cost reduction on system prompts
2. **Context Accumulation**: Linear growth across turns
3. **Conversation Patterns**: Real usage, not generic averages
4. **Precision Inputs**: Exact token counts, not estimates

### Pricing Data Management

**Location**: `src/config/pricingData.ts`

**Structure**:
```typescript
export const LLM_PRICING = {
  'model-id': {
    inputPerMToken: number,      // Cost per million input tokens
    outputPerMToken: number,     // Cost per million output tokens
    cacheReadPerMToken?: number, // Claude only: cache read cost
    lastUpdated: string,         // ISO date
  },
};
```

**Update Process**:
1. Manual edits when providers change pricing
2. Update `lastUpdated` field (ISO 8601 format)
3. Document source (provider website, announcement)
4. Test all calculations after update
5. Typical update frequency: quarterly

### Token Estimation Helpers

**Location**: `src/utils/tokenEstimator.ts` (to be created)

**Conversions**:
- Character-to-token: ~4 chars = 1 token
- Word-to-token: ~1.3 tokens per word

**Purpose**: User-friendly inputs (convert words/chars to tokens)

### Caching Calculations (Claude-Specific)

**CRITICAL**: Cache savings only apply to turns 2+

```typescript
// First turn: NO caching benefit
const firstTurnCost = (systemPromptTokens + userMsgTokens) × inputPrice 
                    + responseTokens × outputPrice;

// Turns 2+: Caching applies
const cacheSavings = (systemPromptTokens / 1_000_000) 
                   × (inputPrice - cacheReadPrice) 
                   × cacheHitRate;

const laterTurnCost = (systemPromptTokens × cacheReadPrice  // Cached
                     + userMsgTokens × inputPrice           // Not cached
                     + contextTokens × inputPrice)          // Not cached
                     / 1_000_000
                   + (responseTokens / 1_000_000) × outputPrice;

const totalCacheSavings = cacheSavings × (turns - 1);
```

**Defaults**:
- Cache hit rate: 90% (realistic for production chatbots)
- Cache TTL: 5 minutes (default) vs 1 hour (2x write cost)

### Optimization Engine

**Location**: `src/utils/optimizationEngine.ts`

**Process**:
1. Compare current config against all 6 models
2. Identify 20%+ savings (HIGH priority)
3. Check context strategies (MEDIUM if >15% savings)
4. Response length optimization (LOW if >10% savings)
5. Sort by savings potential
6. Return top 3-5 recommendations

**Priority Levels**:
- **HIGH**: ≥20% cost reduction (model switch, caching)
- **MEDIUM**: 15-20% savings (context strategy)
- **LOW**: 10-15% savings (response optimization)

### Export Functionality

**PDF Export** (`src/utils/pdfExporter.ts`):
- Executive summary
- Model details
- Breakdown table (5 lines: system/cache/input/output/context)
- Optimization recommendations
- Timestamp and configuration snapshot
- Assumptions documented

**CSV Export** (`src/utils/csvExporter.ts`):
- Tabular data for Excel import
- Sanitize for formula injection (prefix `=`, `+`, `-`, `@` with `'`)
- Include timestamp and configuration
- Ready for spreadsheet analysis

## Security Considerations

### Input Validation Pattern
```typescript
function validateInput(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
  if (value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max}`);
  }
  return Math.floor(value); // Integers only
}
```

### CSV Security
```typescript
function sanitizeForCSV(value: string): string {
  // Prevent formula injection in Excel/Google Sheets
  if (['=', '+', '-', '@'].some(c => value.startsWith(c))) {
    return `'${value}`; // Prefix with single quote
  }
  return value;
}
```

### Dependency Security
- Exact versions in package.json (no `^` or `~`)
- Run `npm audit` before releases
- Only use well-maintained packages (>1M downloads/week)
- Review dependency tree for suspicious packages

## Critical Accuracy Requirements

**±5% Precision Target** depends on:
1. **Exact Pricing Data**: Keep `pricingData.ts` current
2. **Realistic Cache Hit Rates**: 85-95% in production (use 90%)
3. **Accurate Token Counts**: System prompts should be exact
4. **Conversation Pattern Validation**: Test against real usage

**Known Limitations**:
- Does NOT account for API retry costs
- Does NOT include rate limiting impacts
- Assumes consistent conversation patterns
- Context growth is linear estimate

## Testing Strategy

**Manual Test Cases** (no automated testing in MVP):
1. Zero conversations → $0 cost
2. Single-turn conversation → no caching benefit
3. High-volume caching scenario → 90% savings validation
4. Context accumulation → full vs minimal strategy
5. Model comparison → verify cheapest model identified

**Validation**: Hand-calculate ≥3 scenarios, compare within 1%

## Special Patterns

### Real-Time Calculation Updates
- All inputs trigger immediate recalculation
- No "Calculate" button needed
- Target: <100ms response time
- Use React.useMemo for expensive calculations

### Progressive Disclosure UI
- Show primary cost prominently
- Expand to show breakdown on demand
- Optimization recommendations collapsible
- Model comparison side-by-side

### Path Aliases
Use TypeScript path aliases for cleaner imports:
```typescript
import { calculateCost } from '@utils/costCalculator';
import { ChatbotConfig } from '@types';
import { LLM_PRICING } from '@config/pricingData';
```

## Common Pitfalls

### ❌ AVOID
- Putting calculation logic in React components
- Using floating point for currency (precision loss)
- Hardcoding pricing data in multiple places
- Skipping input validation
- Using `any` types
- Leaving console.log statements

### ✅ DO
- Keep calculations in pure utilities
- Round currency to 2 decimal places
- Single source of truth for pricing (pricingData.ts)
- Validate all inputs with min/max bounds
- Explicit TypeScript types everywhere
- Remove debug logging before commit