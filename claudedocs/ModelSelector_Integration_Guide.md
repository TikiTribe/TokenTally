# ModelSelector Integration Guide

## Quick Reference

### Current State
- **Status**: NOT extracted as separate component
- **Location**: Inline in `Calculator.tsx` lines 27-42
- **Pattern**: Simple HTML `<select>` with Zustand store integration

### Extract to Reusable Component
- **Recommended**: YES - needed for PromptCalculator
- **Difficulty**: Easy (straightforward extraction)
- **Files to Create**: `src/components/ModelSelector.tsx`
- **Files to Modify**: `Calculator.tsx`, `PromptCalculator.tsx`

---

## Component Usage Patterns

### Pattern 1: With Zustand Store (Recommended)

```typescript
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { ModelSelector } from '@/components/ModelSelector';

export function Calculator() {
  const { config, setConfig } = useCalculatorStore();

  return (
    <ModelSelector
      value={config.modelId}
      onChange={(modelId) => setConfig({ modelId })}
    />
  );
}
```

**Benefits**:
- ✅ Automatic recalculation on model change
- ✅ Centralized state management
- ✅ Real-time updates across all components
- ✅ Consistent cache settings per model

### Pattern 2: With Local State (Alternative)

```typescript
import { useState } from 'react';
import { ModelSelector } from '@/components/ModelSelector';

export function MyComponent() {
  const [modelId, setModelId] = useState('claude-3-5-sonnet-20241022');

  return (
    <ModelSelector
      value={modelId}
      onChange={setModelId}
    />
  );
}
```

**Use Case**: Isolated components not needing shared state

### Pattern 3: With Filter (Cache-Only Models)

```typescript
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { ModelSelector } from '@/components/ModelSelector';

export function CacheOptimizedCalculator() {
  const { promptConfig, setPromptConfig } = useCalculatorStore();

  return (
    <ModelSelector
      value={promptConfig.modelId}
      onChange={(modelId) => setPromptConfig({ modelId })}
      supportsCache={true}  // Only show Claude models
    />
  );
}
```

**Use Case**: Features specific to cache-supporting models

---

## Data Flow Diagram

### Current (Before Extraction)
```
User selects model
       ↓
<select onChange> fires
       ↓
setConfig({ modelId })
       ↓
useCalculatorStore updates config
       ↓
Auto-trigger calculate() (100ms debounce)
       ↓
Results update in real-time
```

### After Extraction (No Change)
```
User selects model
       ↓
ModelSelector onChange handler
       ↓
Parent component handler (e.g., setConfig)
       ↓
Store/State updates
       ↓
Recalculation triggered
       ↓
Results update in real-time
```

---

## Props Deep Dive

### Props Interface

```typescript
interface ModelSelectorProps {
  // Required: Current selected model ID
  value: string;
  
  // Required: Handler when user selects model
  onChange: (modelId: string) => void;
  
  // Optional: Disable interaction
  disabled?: boolean;
  // Default: false
  // Use case: Disable during calculation, API calls
  
  // Optional: Show "Model Selection" label
  showLabel?: boolean;
  // Default: true
  // Use case: Hide label if used in compact UI or labeled parent
  
  // Optional: Filter to cache-supporting models
  supportsCache?: boolean;
  // Default: false
  // Use case: Show only Claude models for caching features
}
```

### Props Examples

**Basic Usage**:
```tsx
<ModelSelector
  value={modelId}
  onChange={setModelId}
/>
// Shows all 10 models with label
```

**Compact Usage**:
```tsx
<ModelSelector
  value={modelId}
  onChange={setModelId}
  showLabel={false}
/>
// No header label, just select dropdown
```

**Cache-Optimized**:
```tsx
<ModelSelector
  value={modelId}
  onChange={setModelId}
  supportsCache={true}
/>
// Shows only 5 Claude models (3.5/3 Sonnet, 3.5/3 Haiku, Opus)
```

**Disabled State**:
```tsx
<ModelSelector
  value={modelId}
  onChange={setModelId}
  disabled={isCalculating}
/>
// Prevents selection during calculation
```

---

## Integration Checklist

### Step 1: Create Component File

- [ ] Create `src/components/ModelSelector.tsx`
- [ ] Implement component with full TypeScript
- [ ] Add JSDoc comments
- [ ] Include prop validation

### Step 2: Update Calculator.tsx

- [ ] Import ModelSelector
- [ ] Replace inline select with component
- [ ] Test model selection still works
- [ ] Verify auto-calculation triggers

### Step 3: Update PromptCalculator.tsx

- [ ] Import ModelSelector
- [ ] Add to component (likely before PromptInput)
- [ ] Wire onChange to setPromptConfig
- [ ] Test model selection for prompt calculator
- [ ] Verify cost calculations update

### Step 4: Testing

- [ ] All 10 models selectable in Calculator
- [ ] All 10 models selectable in PromptCalculator
- [ ] Cache settings update for Claude models
- [ ] No cache input for OpenAI models
- [ ] onChange handler fires correctly
- [ ] Component renders with/without label
- [ ] Disabled state prevents interaction
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes all checks
- [ ] Accessibility check (keyboard nav)

### Step 5: Validation

- [ ] Cost calculations update on model change
- [ ] Recommendations regenerate for new model
- [ ] Model comparison shows alternatives correctly
- [ ] PDF/CSV exports use selected model
- [ ] No console errors or warnings

---

## File Structure Changes

### Before Extraction
```
src/components/
├── Calculator.tsx          (has inline model select)
├── PromptCalculator.tsx    (no model selection)
└── ... other components
```

### After Extraction
```
src/components/
├── Calculator.tsx          (uses ModelSelector)
├── PromptCalculator.tsx    (uses ModelSelector)
├── ModelSelector.tsx       (NEW: reusable component)
└── ... other components
```

---

## Available Models Reference

### OpenAI Models (5)

| Model ID | Display Name | Input | Output | Cache? |
|----------|--------------|-------|--------|--------|
| `gpt-4o` | GPT-4o | $5.00/M | $15.00/M | ❌ |
| `gpt-4o-mini` | GPT-4o-mini | $0.15/M | $0.60/M | ❌ |
| `gpt-3.5-turbo` | GPT-3.5 Turbo | $0.50/M | $1.50/M | ❌ |
| `gpt-4-turbo` | GPT-4 Turbo | $10.00/M | $30.00/M | ❌ |
| `gpt-4` | GPT-4 | $30.00/M | $60.00/M | ❌ ⚠️ Deprecated |

### Claude Models (5)

| Model ID | Display Name | Input | Output | Cache Read | Cache Write |
|----------|--------------|-------|--------|------------|-------------|
| `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet | $3.00/M | $15.00/M | $0.30/M | $3.75/M |
| `claude-3-5-haiku-20241022` | Claude 3.5 Haiku | $1.00/M | $5.00/M | $0.10/M | $1.25/M |
| `claude-3-haiku-20240307` | Claude 3 Haiku | $0.25/M | $1.25/M | $0.03/M | $0.30/M |
| `claude-3-opus-20240229` | Claude 3 Opus | $15.00/M | $75.00/M | $1.50/M | $18.75/M |
| `claude-3-sonnet-20240229` | Claude 3 Sonnet | $3.00/M | $15.00/M | $0.30/M | $3.75/M | ⚠️ Deprecated |

---

## Implementation Details

### Getting Model List

```typescript
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';

// Get model IDs
const openaiIds = getModelsByProvider('openai');      // ['gpt-4o', ...]
const claudeIds = getModelsByProvider('anthropic');   // ['claude-3-5-...', ...]

// Map to display objects
const models = openaiIds.map(id => ({
  id,                                    // e.g., 'gpt-4o'
  name: LLM_PRICING[id]?.modelFamily,    // e.g., 'GPT-4o'
}));

// Access pricing
const model = LLM_PRICING['claude-3-5-sonnet-20241022'];
model.inputPerMToken;      // 3.00
model.outputPerMToken;     // 15.00
model.cacheReadPerMToken;  // 0.30
model.supportsCache;       // true
```

### Filtering by Cache Support

```typescript
// Only models that support caching
const cacheModels = Object.entries(LLM_PRICING)
  .filter(([_, model]) => model.supportsCache === true)
  .map(([id, _]) => id);
// Result: All 5 Claude models (OpenAI not included)
```

---

## State Management Patterns

### Calculator Pattern (Current)
```typescript
// In store:
interface ChatbotConfig {
  modelId: string;
  systemPromptTokens: number;
  avgUserMessageTokens: number;
  avgResponseTokens: number;
  conversationTurns: number;
  conversationsPerMonth: number;
  contextStrategy: ContextStrategy;
  cacheHitRate: number;  // Only used if model supports cache
}

// In component:
const { config, setConfig } = useCalculatorStore();

<ModelSelector
  value={config.modelId}
  onChange={(modelId) => setConfig({ modelId })}
/>
```

### PromptCalculator Pattern (Current)
```typescript
// In store:
interface PromptCalculatorConfig {
  promptText: string;
  responsePreset: ResponsePreset;
  batchOperations: number;
  multiTurnEnabled: boolean;
  turns?: number;
  contextStrategy?: ContextStrategy;
  modelId: string;
  cacheHitRate?: number;  // 0-100, percentage
}

// In component:
const { promptConfig, setPromptConfig } = useCalculatorStore();

<ModelSelector
  value={promptConfig.modelId}
  onChange={(modelId) => setPromptConfig({ modelId })}
/>
```

---

## Auto-Calculation Behavior

When model changes via ModelSelector:

```typescript
// 1. User selects new model
<ModelSelector onChange={(modelId) => setConfig({ modelId })} />

// 2. setConfig updates store
setConfig: (updates) => {
  set((state) => ({
    config: { ...state.config, ...updates },
  }));
  // 3. Auto-trigger calculation after 100ms
  setTimeout(() => get().calculate(), 100);
}

// 4. calculate() runs cost calculations
calculate: () => {
  const results = calculateChatbotCost(config);
  const recommendations = generateRecommendations(config, results);
  const comparison = generateModelComparison(config, results);
  set({ results, recommendations, comparison });
}

// 5. All dependent components re-render with new results
```

**Result**: User sees updated costs <100ms after model selection

---

## Conditional Rendering Example

### Show Cache Settings Only for Claude

```typescript
// In Calculator.tsx
{config.modelId.includes('claude') && (
  <div>
    <label className="block text-sm font-medium mb-2">
      Cache Hit Rate (%)
    </label>
    <input
      type="number"
      className="input-field"
      value={(config.cacheHitRate * 100).toFixed(0)}
      onChange={(e) =>
        setConfig({
          cacheHitRate: parseInt(e.target.value) / 100 || 0.9,
        })
      }
      min="0"
      max="100"
    />
  </div>
)}
```

This pattern works because:
1. ModelSelector only provides the modelId
2. Parent component decides how to handle it
3. Cache settings conditionally render based on model selection
4. Zustand store tracks both modelId and cacheHitRate separately

---

## Performance Considerations

### Current Performance
- ✅ Model list is small (10 items) - no performance issues
- ✅ Re-renders are fast (optgroup rendering is O(n) with n=10)
- ✅ 100ms debounce on calculation prevents excessive recalculations

### Scalability (If Models Grow)
If adding 20+ models in future:

**Option 1**: Keep simple list (works fine up to 50 models)
```tsx
// Current approach still works
```

**Option 2**: Add search/filter
```tsx
<input
  placeholder="Search models..."
  onChange={(e) => setSearchTerm(e.target.value)}
/>
<select>
  {filteredModels.map(...)}
</select>
```

**Option 3**: Grouped combobox (if >100 models)
- Autocomplete + provider grouping
- Out of scope for MVP

---

## Error Handling

### Invalid Model ID

```typescript
// If user somehow passes invalid modelId:
const defaultModel = 'claude-3-5-sonnet-20241022';
const selectedModel = LLM_PRICING[value] || LLM_PRICING[defaultModel];

// Component should handle gracefully:
if (!LLM_PRICING[value]) {
  console.warn(`Invalid model ID: ${value}, using default`);
  // Reset to default or show error
}
```

### Missing Pricing Data

```typescript
// Safe access pattern:
const modelName = LLM_PRICING[modelId]?.modelFamily || modelId;
// If modelFamily missing, falls back to ID
```

---

## Testing Examples

### Unit Tests (Pseudo-code)

```typescript
describe('ModelSelector', () => {
  it('renders all models', () => {
    render(<ModelSelector value="gpt-4o" onChange={vi.fn()} />);
    expect(screen.getAllByRole('option')).toHaveLength(10);
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<ModelSelector value="gpt-4o" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'claude-3-5-sonnet-20241022' },
    });
    expect(onChange).toHaveBeenCalledWith('claude-3-5-sonnet-20241022');
  });

  it('filters cache models when supportsCache=true', () => {
    render(
      <ModelSelector 
        value="claude-3-5-sonnet-20241022" 
        onChange={vi.fn()}
        supportsCache={true}
      />
    );
    expect(screen.getAllByRole('option')).toHaveLength(5); // Only Claude
  });

  it('disables when disabled prop is true', () => {
    render(
      <ModelSelector 
        value="gpt-4o" 
        onChange={vi.fn()}
        disabled={true}
      />
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
```

---

## Migration Path

### Phase 1: Extract Component (Non-Breaking)
```bash
1. Create src/components/ModelSelector.tsx
2. Update Calculator.tsx to use new component
3. Keep PromptCalculator.tsx unchanged
4. No breaking changes, backward compatible
```

### Phase 2: Integrate with PromptCalculator
```bash
1. Import ModelSelector in PromptCalculator
2. Add <ModelSelector /> before other inputs
3. Wire onChange to setPromptConfig
4. Users can now select different models for prompt calculation
```

### Phase 3: Enhanced Features (Optional)
```bash
1. Add cache filtering (supportsCache prop)
2. Add disabled state during calculation
3. Add accessibility enhancements
4. Add deprecation warnings
```

---

## Summary Table

| Aspect | Current | Extracted Component |
|--------|---------|-------------------|
| **Location** | Calculator.tsx inline | `ModelSelector.tsx` component |
| **Reusability** | Limited to Calculator | Available everywhere |
| **Props** | None (hardcoded) | 2 required + 3 optional |
| **Testing** | Hard to unit test | Easy to unit test |
| **Maintenance** | Changes affect Calculator | Centralized updates |
| **Type Safety** | Good | Excellent |
| **Documentation** | Minimal | Comprehensive |

