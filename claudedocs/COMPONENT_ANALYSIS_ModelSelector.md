# COMPONENT ANALYSIS: ModelSelector

## Executive Summary

**Finding**: TokenTally does NOT have a standalone `ModelSelector` component. Instead, the model selection UI is **inline within the Calculator component** as a simple HTML `<select>` element.

**Reusability**: The current implementation is **NOT extracted as a reusable component**, making it less modular but simpler for the current single-calculator use case.

---

## Current Implementation Details

### Location & Pattern
**File**: `src/components/Calculator.tsx` (lines 27-42)

**Current Code**:
```tsx
{/* Model Selector */}
<div className="card">
  <h2 className="text-xl font-semibold mb-4">Model Selection</h2>
  <select
    className="input-field"
    value={config.modelId}
    onChange={(e) => setConfig({ modelId: e.target.value })}
  >
    <optgroup label="OpenAI">
      {openai.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </optgroup>
    <optgroup label="Claude (Anthropic)">
      {claude.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </optgroup>
  </select>
</div>
```

### Props Interface (If Extracted)

If extracted as a reusable component, the interface would be:

```typescript
interface ModelSelectorProps {
  // State
  selectedModelId: string;
  
  // Handlers
  onModelChange: (modelId: string) => void;
  
  // Optional UI customization
  showProviderGroups?: boolean;  // Default: true
  className?: string;
  disabled?: boolean;
}
```

### Model Data Source

**Primary Source**: `src/config/pricingData.ts`

**Functions Used**:
```typescript
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';

// Get model IDs by provider
const openaiIds = getModelsByProvider('openai');      // Returns string[]
const claudeIds = getModelsByProvider('anthropic');   // Returns string[]

// Map IDs to display objects
const openai = openaiIds.map(id => ({
  id,
  name: LLM_PRICING[id]?.modelFamily || id,
}));

const claude = claudeIds.map(id => ({
  id,
  name: LLM_PRICING[id]?.modelFamily || id,
}));
```

**Available Models**:
```
OpenAI (5 models):
- gpt-4o
- gpt-4o-mini
- gpt-3.5-turbo
- gpt-4-turbo
- gpt-4 (deprecated)

Claude/Anthropic (5 models):
- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- claude-3-haiku-20240307
- claude-3-opus-20240229
- claude-3-sonnet-20240229 (deprecated)
```

### onChange Handler Pattern

**Current Pattern** (inline):
```tsx
onChange={(e) => setConfig({ modelId: e.target.value })}
```

**Store Integration**:
- Handler calls `setConfig({ modelId: newModelId })`
- `setConfig` in `useCalculatorStore` automatically triggers `calculate()`
- Calculation happens within 100ms of selection change
- No separate "Calculate" button needed (real-time updates)

**Store Method** (`src/store/useCalculatorStore.ts`):
```typescript
setConfig: (updates: Partial<ChatbotConfig>) => {
  set((state) => ({
    config: { ...state.config, ...updates },
  }));

  // Auto-calculate on config change
  setTimeout(() => get().calculate(), 100);
}
```

### UI Structure & Styling Classes

**Card Wrapper**:
```tsx
<div className="card">
  {/* Tailwind CSS custom class, likely defined in src/index.css */}
```

**Heading**:
```tsx
<h2 className="text-xl font-semibold mb-4">
  {/* Standard Tailwind: 20px font, bold, 16px bottom margin */}
</h2>
```

**Select Element**:
```tsx
<select className="input-field">
  {/* Tailwind CSS custom class for form inputs */}
```

**Styling Definition** (likely in `src/index.css`):
```css
.card {
  @apply bg-white rounded-lg shadow-md p-6 space-y-6;
}

.input-field {
  @apply w-full px-4 py-2 border border-gray-300 rounded-lg 
         focus:outline-none focus:ring-2 focus:ring-blue-500;
}
```

### Current Architecture Diagram

```
Calculator.tsx (Single Component)
│
├─ Model Selection (inline <select>)
│  ├─ OpenAI optgroup (5 models)
│  └─ Claude optgroup (5 models)
│
├─ Configuration Form
│  ├─ System Prompt Tokens
│  ├─ Avg User Message Tokens
│  ├─ Avg Response Tokens
│  ├─ Conversation Turns
│  ├─ Conversations Per Month
│  ├─ Context Strategy
│  └─ Cache Hit Rate (Claude only)
│
└─ Results Display (if calculated)
   ├─ Cost Display
   ├─ Cost Breakdown
   ├─ Model Comparison
   ├─ Recommendations
   └─ Export Buttons
```

---

## Integration Requirements

### For Parent Component Integration

If integrating into another calculator (e.g., PromptCalculator):

#### 1. **Import Requirements**
```typescript
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';
import type { ChatbotConfig } from '@/types';
```

#### 2. **State Management Required**
```typescript
// Parent must provide:
const [selectedModelId, setSelectedModelId] = useState('claude-3-5-sonnet-20241022');

// OR use Zustand store:
const { config, setConfig } = useCalculatorStore();
```

#### 3. **Data Preparation**
```typescript
// Must prepare model lists:
const openaiIds = getModelsByProvider('openai');
const claudeIds = getModelsByProvider('anthropic');

const openai = openaiIds.map(id => ({
  id,
  name: LLM_PRICING[id]?.modelFamily || id,
}));

const claude = claudeIds.map(id => ({
  id,
  name: LLM_PRICING[id]?.modelFamily || id,
}));
```

#### 4. **Handler Implementation**
```typescript
// Simple pattern:
onChange={(e) => setSelectedModelId(e.target.value)}

// With store:
onChange={(e) => setConfig({ modelId: e.target.value })}
```

#### 5. **Dependencies**
- `Zustand` (for store access if using store pattern)
- `src/config/pricingData.ts` (for model data)
- `src/types/index.ts` (for TypeScript types)
- Tailwind CSS with `.card` and `.input-field` classes

---

## Reusability Analysis

### Current State: LOW REUSABILITY ❌

**Why Not Extracted**:
1. ✅ Simple enough to inline (just a `<select>` element)
2. ✅ Limited customization needs
3. ✅ Only used once in Calculator.tsx
4. ❌ Code duplication if needed elsewhere
5. ❌ No clear separation of concerns

### Extraction Justification

Would benefit from extraction if:
- ✅ PromptCalculator needs a model selector (YES - it does!)
- ✅ Future pages/features need model selection (likely)
- ✅ Want testable, reusable components (recommended practice)
- ✅ Need consistent styling across calculators (important for UX)

### Recommended Extraction

**Create**: `src/components/ModelSelector.tsx`

```typescript
import React from 'react';
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
  supportsCache?: boolean;  // Optional: filter to cache-supporting models only
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  supportsCache = false,
}: ModelSelectorProps) {
  // Get model IDs by provider
  const openaiIds = getModelsByProvider('openai');
  const claudeIds = getModelsByProvider('anthropic');

  // Filter cache-supporting models if requested
  const filterModels = (ids: string[]) => {
    if (!supportsCache) return ids;
    return ids.filter(id => LLM_PRICING[id]?.supportsCache === true);
  };

  const openai = filterModels(openaiIds).map(id => ({
    id,
    name: LLM_PRICING[id]?.modelFamily || id,
  }));

  const claude = filterModels(claudeIds).map(id => ({
    id,
    name: LLM_PRICING[id]?.modelFamily || id,
  }));

  return (
    <div className="card">
      {showLabel && (
        <h2 className="text-xl font-semibold mb-4">Model Selection</h2>
      )}
      <select
        className="input-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {openai.length > 0 && (
          <optgroup label="OpenAI">
            {openai.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </optgroup>
        )}
        {claude.length > 0 && (
          <optgroup label="Claude (Anthropic)">
            {claude.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
```

**Usage Example**:
```typescript
// In Calculator.tsx
<ModelSelector
  value={config.modelId}
  onChange={(modelId) => setConfig({ modelId })}
/>

// In PromptCalculator.tsx
<ModelSelector
  value={promptConfig.modelId}
  onChange={(modelId) => setPromptConfig({ modelId })}
  supportsCache={true}  // Optional: show only Claude models
/>
```

---

## Integration Points

### PromptCalculator Integration Status

**Current**: PromptCalculator DOES need a model selector

**Current Code** (`PromptCalculator.tsx`):
```typescript
interface PromptCalculatorProps {
  // ... other props ...
  // MISSING: No modelId or onModelChange prop!
}
```

**Issue**: PromptCalculator doesn't expose model selection to users - model is only in store state.

**Solution**: Extract ModelSelector component and integrate into PromptCalculator:

```typescript
// In PromptCalculator.tsx (updated)
export const PromptCalculator: React.FC<PromptCalculatorProps> = ({
  // ... props ...
}) => {
  const { promptConfig, setPromptConfig } = useCalculatorStore();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <ModelSelector
        value={promptConfig.modelId}
        onChange={(modelId) => setPromptConfig({ modelId })}
      />
      {/* ... rest of component ... */}
    </div>
  );
};
```

---

## Key Metrics & Properties

| Property | Value | Notes |
|----------|-------|-------|
| **Component Type** | Inline `<select>` | Not extracted into separate component |
| **Current Users** | Calculator.tsx | Only used in main calculator |
| **Model Count** | 10 total | 5 OpenAI + 5 Claude |
| **Props Needed** | 2 required | value, onChange |
| **Styling Classes** | 2 custom | .card, .input-field |
| **Dependencies** | 2 imports | pricingData, types |
| **Auto-calculation** | Yes | 100ms debounce on change |
| **Cache Awareness** | Partial | Shows cache rate only for Claude models |

---

## Security & Validation

### Input Validation
No validation needed - dropdown only allows predefined model IDs from `pricingData.ts`

### Type Safety
- ✅ TypeScript strict mode enabled
- ✅ Model IDs validated against `LLM_PRICING` keys
- ✅ onChange handler properly typed with `string` parameter

### Accessibility
- ⚠️ Could improve with aria-labels
- ⚠️ Native `<select>` is accessible by default
- ✅ Optgroup labels provide context

**Recommended Enhancement**:
```tsx
<select
  className="input-field"
  value={value}
  onChange={(e) => onChange(e.target.value)}
  aria-label="Model selection"
  aria-describedby="model-description"
>
  {/* ... options ... */}
</select>
```

---

## Recommendations

### Short-term (MVP)
✅ Keep current inline implementation (working well)

### Medium-term (Phase 2)
1. **Extract ModelSelector** component for reusability
2. **Integrate into PromptCalculator** for model selection
3. **Add accessibility enhancements** (aria-labels)
4. **Optional: cache-filtering** prop for Claude-only scenarios

### Long-term (Phase 3+)
- Model search/filter for 20+ models
- Provider logos and badges
- Performance metrics in tooltip
- Deprecation warnings for old models

---

## Testing Checklist

If extracting ModelSelector component:

- [ ] Model list populated correctly (all 10 models)
- [ ] OpenAI optgroup displays correctly (5 models)
- [ ] Claude optgroup displays correctly (5 models)
- [ ] onChange handler fires on selection change
- [ ] Value prop updates UI correctly
- [ ] Disabled prop disables selection
- [ ] Works with both store and local state
- [ ] TypeScript compilation succeeds
- [ ] ESLint passes
- [ ] Accessibility tested (keyboard navigation)

---

## File References

**Related Files**:
- `src/config/pricingData.ts` - Model data source
- `src/types/index.ts` - ChatbotConfig type definition
- `src/store/useCalculatorStore.ts` - State management
- `src/components/Calculator.tsx` - Current location
- `src/components/PromptCalculator.tsx` - Future integration point
- `src/index.css` - Tailwind style definitions

