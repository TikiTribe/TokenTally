# ModelSelector Component - Quick Reference Card

## One-Minute Summary

**What**: Model selection UI for LLM cost calculators  
**Where**: Currently inline in `Calculator.tsx` (lines 27-42)  
**Status**: NOT extracted (should be for reusability)  
**Models**: 10 total (5 OpenAI + 5 Claude)  
**Auto-calc**: Yes, 100ms debounce after model change  

---

## Current Implementation (Copy-Paste Ready)

```tsx
// From Calculator.tsx
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

**Data prep needed above this**:
```tsx
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

---

## Recommended Extraction (Ready to Copy)

### File: `src/components/ModelSelector.tsx`

```typescript
import React from 'react';
import { getModelsByProvider, LLM_PRICING } from '@/config/pricingData';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  showLabel?: boolean;
  supportsCache?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  showLabel = true,
  supportsCache = false,
}: ModelSelectorProps) {
  const openaiIds = getModelsByProvider('openai');
  const claudeIds = getModelsByProvider('anthropic');

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

---

## Usage Examples

### Basic (With Store)
```tsx
import { useCalculatorStore } from '@/store/useCalculatorStore';
import { ModelSelector } from '@/components/ModelSelector';

export function MyCalculator() {
  const { config, setConfig } = useCalculatorStore();

  return (
    <ModelSelector
      value={config.modelId}
      onChange={(modelId) => setConfig({ modelId })}
    />
  );
}
```

### With Props
```tsx
// Compact (no label)
<ModelSelector
  value={modelId}
  onChange={setModelId}
  showLabel={false}
/>

// Cache-only models
<ModelSelector
  value={modelId}
  onChange={setModelId}
  supportsCache={true}
/>

// During calculation (disabled)
<ModelSelector
  value={modelId}
  onChange={setModelId}
  disabled={isCalculating}
/>
```

---

## Props Reference

| Prop | Type | Required | Default | Purpose |
|------|------|----------|---------|---------|
| `value` | `string` | ✅ Yes | - | Currently selected model ID |
| `onChange` | `(id: string) => void` | ✅ Yes | - | Called when user selects new model |
| `disabled` | `boolean` | ❌ No | `false` | Prevent selection |
| `showLabel` | `boolean` | ❌ No | `true` | Show "Model Selection" header |
| `supportsCache` | `boolean` | ❌ No | `false` | Show only Claude models |

---

## Models Available

### OpenAI (5 models)
```
gpt-4o
gpt-4o-mini
gpt-3.5-turbo
gpt-4-turbo
gpt-4 (deprecated)
```

### Claude (5 models)
```
claude-3-5-sonnet-20241022
claude-3-5-haiku-20241022
claude-3-haiku-20240307
claude-3-opus-20240229
claude-3-sonnet-20240229 (deprecated)
```

---

## Integration Checklist

- [ ] Create `src/components/ModelSelector.tsx`
- [ ] Update `Calculator.tsx` to use component
- [ ] Update `PromptCalculator.tsx` to use component
- [ ] Test model selection works in both calculators
- [ ] Verify cost calculations update on model change
- [ ] Test cache settings appear/disappear correctly
- [ ] Run `npm run lint` and `npm run build`
- [ ] Manual test in browser (all 10 models selectable)

---

## Common Issues & Solutions

### Issue: Cache settings don't update
**Solution**: Component only passes modelId, parent handles cache visibility:
```tsx
{config.modelId.includes('claude') && (
  <CacheRateInput
    value={config.cacheHitRate}
    onChange={(rate) => setConfig({ cacheHitRate: rate })}
  />
)}
```

### Issue: Model name shows as ID
**Solution**: Check LLM_PRICING has `modelFamily` field:
```tsx
LLM_PRICING['gpt-4o'].modelFamily  // Should be 'GPT-4o'
```

### Issue: Dropdown doesn't trigger calculation
**Solution**: Parent handler must call setConfig (which auto-calculates):
```tsx
onChange={(modelId) => setConfig({ modelId })}  // ✅ Triggers calculate()
onChange={(modelId) => setSelectedModel(modelId)}  // ❌ Doesn't auto-calculate
```

### Issue: TypeScript errors
**Solution**: Import types:
```tsx
import type { ChatbotConfig } from '@/types';
import { LLM_PRICING } from '@/config/pricingData';
```

---

## Performance Notes

✅ No performance concerns with 10 models  
✅ Optgroup rendering is instant  
✅ Store auto-calc has 100ms debounce (prevents rapid recalcs)  
✅ Re-renders only when value prop changes  

---

## Type Definitions Needed

```typescript
// src/types/index.ts (already has these)
interface ChatbotConfig {
  modelId: string;
  // ... other fields
}

// From pricingData.ts (already defined)
export const LLM_PRICING: Record<string, LLMPricing>;
export function getModelsByProvider(provider: 'openai' | 'anthropic'): string[];
```

---

## State Management Integration

### With Zustand Store
```typescript
// Store automatically handles model changes:
setConfig: (updates) => {
  set((state) => ({
    config: { ...state.config, ...updates },
  }));
  setTimeout(() => get().calculate(), 100);  // Auto-calculate
}

// Component just calls it:
<ModelSelector onChange={(id) => setConfig({ modelId: id })} />
```

### Manual State (if not using store)
```typescript
const [modelId, setModelId] = useState('claude-3-5-sonnet-20241022');

<ModelSelector value={modelId} onChange={setModelId} />
// Then handle calculation separately with useEffect
```

---

## Styling Classes Used

| Class | Definition | Purpose |
|-------|-----------|---------|
| `.card` | `bg-white rounded-lg shadow-md p-6 space-y-6` | Container |
| `.input-field` | `w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500` | Select styling |

Located in `src/index.css`

---

## Testing Snapshots

### Component Renders Correctly
```
ModelSelector
├── h2 "Model Selection" (if showLabel=true)
└── select
    ├── optgroup[label="OpenAI"]
    │  ├── option gpt-4o
    │  ├── option gpt-4o-mini
    │  ├── option gpt-3.5-turbo
    │  ├── option gpt-4-turbo
    │  └── option gpt-4
    └── optgroup[label="Claude (Anthropic)"]
       ├── option claude-3-5-sonnet-20241022
       ├── option claude-3-5-haiku-20241022
       ├── option claude-3-haiku-20240307
       ├── option claude-3-opus-20240229
       └── option claude-3-sonnet-20240229
```

---

## FAQ

**Q: Should I extract this now?**  
A: Not urgent for MVP, but recommended for Phase 2 when PromptCalculator needs it.

**Q: Will extraction break anything?**  
A: No, it's a pure extraction with identical behavior.

**Q: What about deprecated models?**  
A: They're included in the list. Add warning tooltips in Phase 3 if needed.

**Q: Can I customize the option labels?**  
A: Currently uses `modelFamily` from pricingData. Can add custom mapping in future.

**Q: Does this work with custom models?**  
A: Yes, just add them to LLM_PRICING and they'll appear automatically.

---

## References

**Documentation Files**:
- `claudedocs/COMPONENT_ANALYSIS_ModelSelector.md` - Full analysis
- `claudedocs/ModelSelector_Integration_Guide.md` - Integration patterns

**Source Files**:
- `src/config/pricingData.ts` - Model data
- `src/components/Calculator.tsx` - Current usage
- `src/types/index.ts` - Type definitions
- `src/store/useCalculatorStore.ts` - State management

---

## Copy-Paste Summary

**To extract ModelSelector**:
1. Create file: `src/components/ModelSelector.tsx`
2. Paste the component code from "Recommended Extraction" section
3. Update `Calculator.tsx`: Replace inline select with `<ModelSelector ... />`
4. Update `PromptCalculator.tsx`: Add `<ModelSelector ... />` 
5. Run: `npm run lint && npm run build`
6. Test: Model selection works in both calculators

**Expected outcome**: Same behavior, better code organization, ready for reuse.

