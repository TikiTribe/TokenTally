# Prompt Calculator Technical Patterns & Best Practices

## Core Calculation Patterns

### Single-Turn Calculation
```typescript
const inputTokens = estimateTokensFromChars(promptText);
const outputTokens = RESPONSE_PRESETS[responsePreset].average;

const inputCost = (inputTokens / 1_000_000) * model.inputPerMToken;
const outputCost = (outputTokens / 1_000_000) * model.outputPerMToken;

const perCallCost = inputCost + outputCost;
const monthlyCost = perCallCost × batchOperations;
```

### Multi-Turn with Context Accumulation
```typescript
const contextTokensPerTurn = CONTEXT_STRATEGY_TOKENS[contextStrategy];
const firstTurnCost = inputCost + outputCost;

// Average context tokens across all later turns
const avgContextTokens = ((turns - 1) * contextTokensPerTurn) / 2;
const contextCost = (avgContextTokens / 1_000_000) * model.inputPerMToken;

const laterTurnCost = inputCost + contextCost + outputCost;
const conversationCost = firstTurnCost + (laterTurnCost * (turns - 1));
```

### Claude Caching Calculation
```typescript
const cacheHitRate = config.cacheHitRate / 100; // Convert percentage

const cachedInputCost = (inputTokens / 1_000_000) * model.cacheReadPerMToken;
const uncachedInputCost = (inputTokens / 1_000_000) * model.inputPerMToken;

const effectiveInputCost = 
  (cachedInputCost * cacheHitRate) + 
  (uncachedInputCost * (1 - cacheHitRate));

const cacheSavings = (uncachedInputCost - effectiveInputCost) * (turns - 1);
```

## Token Estimation Patterns

### Character-Based Estimation
```typescript
// Core formula: ~4 characters = 1 token
export function estimateTokensFromChars(text: string): number {
  if (!text || text.length === 0) return 0;
  
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const charCount = normalizedText.length;
  
  return Math.ceil(charCount / 4);
}
```

### Validation & Bounds
```typescript
const VALIDATION_CONSTRAINTS = {
  promptText: { min: 1, max: 100_000 },
  batchOperations: { min: 1, max: 10_000_000 },
  promptCacheHitRate: { min: 0, max: 100 },
} as const;
```

## State Management Patterns

### Zustand Store Structure
```typescript
interface CalculatorState {
  mode: CalculatorMode;
  
  // Chatbot state
  config: ChatbotConfig;
  results: CostBreakdown | null;
  
  // Prompt calculator state
  promptConfig: PromptCalculatorConfig;
  promptResults: PromptCostBreakdown | null;
  
  // Actions with auto-calculation
  setPromptConfig: (updates: Partial<PromptCalculatorConfig>) => void;
  calculatePrompt: () => void;
}
```

### Auto-Calculation Pattern
```typescript
setPromptConfig: (updates) => {
  set((state) => ({
    promptConfig: { ...state.promptConfig, ...updates }
  }));
  
  // Debounced auto-calculation (100ms)
  setTimeout(() => get().calculatePrompt(), 100);
}
```

### Empty State Handling
```typescript
calculatePrompt: () => {
  const { promptConfig } = get();
  
  // Skip calculation for empty prompts
  if (!promptConfig.promptText || promptConfig.promptText.trim().length === 0) {
    set({ promptResults: null, isCalculating: false });
    return;
  }
  
  // Proceed with calculation
  const promptResults = calculatePromptCost(promptConfig);
  set({ promptResults, isCalculating: false });
}
```

## UI Component Patterns

### Real-Time Token Display
```typescript
// In PromptInput component
const charCount = value.length;
const tokenCount = estimateTokensFromChars(value);
const isNearLimit = charCount > maxLength * 0.9;
const isAtLimit = charCount >= maxLength;

<div className="flex justify-between text-sm">
  <div className="text-gray-600">
    Estimated tokens: <span className="font-semibold">{tokenCount.toLocaleString()}</span>
  </div>
  <div className={`${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}>
    {charCount.toLocaleString()} / {maxLength.toLocaleString()} characters
  </div>
</div>
```

### Conditional Multi-Turn Configuration
```typescript
// Only show multi-turn settings when enabled
{multiTurnEnabled && onTurnsChange && onContextStrategyChange && (
  <div className="pl-7 space-y-4 border-l-2 border-blue-200">
    {/* Turns slider */}
    {/* Context strategy dropdown */}
    {/* Cache hit rate (Claude only) */}
  </div>
)}
```

### Response Preset with Tooltip
```typescript
const [showTooltip, setShowTooltip] = useState(false);
const selected = RESPONSE_PRESETS[value];

<button
  onMouseEnter={() => setShowTooltip(true)}
  onMouseLeave={() => setShowTooltip(false)}
>
  <InfoIcon />
</button>

{showTooltip && (
  <div className="absolute z-10 w-72 p-3 mt-2 text-sm bg-gray-900 text-white rounded-lg">
    <div className="font-semibold">{value.charAt(0).toUpperCase() + value.slice(1)}</div>
    <div className="text-gray-300">{selected.description}</div>
    <div className="mt-2 text-xs text-gray-400">Average: {selected.average} tokens</div>
  </div>
)}
```

## Performance Optimization Patterns

### Debounced Auto-Calculation
```typescript
// Prevent calculation spam during rapid typing
setPromptConfig: (updates) => {
  set((state) => ({ promptConfig: { ...state.promptConfig, ...updates } }));
  setTimeout(() => get().calculatePrompt(), 100); // 100ms debounce
}
```

### Selective Store Updates
```typescript
// Only update what changed to minimize re-renders
const { promptText, onPromptChange } = props;

// In component
<PromptInput
  value={promptText}
  onChange={(text) => onPromptChange(text)} // Direct pass-through
/>
```

### Zustand Selector Pattern
```typescript
// Efficient store access (not implemented yet, but recommended)
const promptConfig = useCalculatorStore((state) => state.promptConfig);
const setPromptConfig = useCalculatorStore((state) => state.setPromptConfig);
```

## Error Handling Patterns

### Calculation Error Handling
```typescript
try {
  const promptResults = calculatePromptCost(promptConfig);
  set({ promptResults, isCalculating: false });
} catch (error) {
  set({
    error: error instanceof Error ? error.message : 'Calculation failed',
    isCalculating: false
  });
}
```

### Input Validation
```typescript
// In BatchConfig component
onChange={(e) => {
  const val = parseInt(e.target.value) || 1;
  onBatchChange(Math.max(1, Math.min(VALIDATION_CONSTRAINTS.batchOperations.max, val)));
}}
```

## Cost Breakdown Structure

### Prompt Cost Breakdown
```typescript
interface PromptCostBreakdown {
  perCallCost: number;
  monthlyCost: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  cacheSavings?: number;
  contextCost?: number;
  breakdown?: {
    firstTurn?: number;
    laterTurns?: number;
    cacheHitSavings?: number;
    contextAccumulation?: number;
  };
}
```

### Usage Example
```typescript
const results = calculatePromptCost(config);

// Single-turn result
if (!config.multiTurnEnabled) {
  return {
    perCallCost,
    monthlyCost,
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
  };
}

// Multi-turn with breakdown
return {
  perCallCost,
  monthlyCost,
  inputTokens,
  outputTokens,
  inputCost,
  outputCost,
  cacheSavings: cacheSavings > 0 ? cacheSavings : undefined,
  contextCost: contextCost,
  breakdown: {
    firstTurn: firstTurnCost,
    laterTurns: laterTurnCost,
    cacheHitSavings: cacheSavings > 0 ? cacheSavings : undefined,
    contextAccumulation: contextCost,
  },
};
```

## Testing Patterns (To Implement)

### Manual Test Scenarios
1. **Simple Single-Turn**:
   - 500-char prompt (125 tokens)
   - Short response (200 tokens)
   - 1000 batch operations
   - Expected: ~$X.XX/month

2. **Multi-Turn Without Caching**:
   - 1000-char prompt (250 tokens)
   - Medium response (550 tokens)
   - 5 turns, moderate context
   - 500 batch operations
   - Expected: ~$X.XX/month

3. **Claude Caching Enabled**:
   - 2000-char prompt (500 tokens)
   - Long response (1400 tokens)
   - 10 turns, moderate context
   - 90% cache hit rate
   - 1000 batch operations
   - Expected: ~$X.XX/month with caching savings

### Accuracy Validation
```typescript
// Hand calculation formula
const expectedCost = calculateManually(config);
const actualCost = calculatePromptCost(config);
const accuracy = Math.abs((actualCost - expectedCost) / expectedCost * 100);

// Target: accuracy <= 5%
console.assert(accuracy <= 5, `Accuracy ${accuracy}% exceeds ±5% target`);
```

## Integration Patterns

### App-Level Integration
```typescript
// Conditional rendering based on mode
{mode === 'chatbot' ? (
  <Calculator />
) : (
  <PromptCalculator
    promptText={promptConfig.promptText}
    onPromptChange={(text) => setPromptConfig({ promptText: text })}
    // ... all other props
  />
)}
```

### Model-Aware Caching
```typescript
// Only show cache settings for Claude models
const model = getPricingModel(promptConfig.modelId);
const supportsCache = model?.supportsCache ?? false;

{supportsCache && onCacheHitRateChange && (
  <div className="bg-blue-50 p-4 rounded-md">
    <label>Cache Hit Rate (%)</label>
    {/* Cache hit rate slider */}
  </div>
)}
```

## Common Pitfalls & Solutions

### Pitfall 1: Token Estimation Accuracy
**Problem**: Simple char/4 may not be accurate for code or special characters
**Solution**: Document ±10% estimation variance, recommend using actual token counts for production

### Pitfall 2: Cache Hit Rate Assumptions
**Problem**: 90% cache hit rate may not be realistic for all use cases
**Solution**: Provide guidance on typical cache hit rates, allow user customization

### Pitfall 3: Context Growth
**Problem**: Linear context growth assumption may not match real usage
**Solution**: Document assumptions, provide context strategy presets

### Pitfall 4: Empty Prompt Calculation
**Problem**: Calculating costs for empty prompts causes errors
**Solution**: Validate prompt text before calculation, return null for empty prompts

### Pitfall 5: Real-Time Calculation Performance
**Problem**: Calculating on every keystroke is expensive
**Solution**: 100ms debounce for auto-calculation, prevent calculation spam
