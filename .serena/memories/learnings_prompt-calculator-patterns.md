# Learnings: Prompt Calculator Architecture Patterns

**Context**: Insights gained from model selector integration session (2025-11-01)

## Store-First Architecture Pattern

TokenTally uses a **store-first pattern** where components connect directly to Zustand store rather than receiving data via props.

### Pattern Example

❌ **Wrong (Props Drilling)**:
```typescript
// Parent passes data down
<PromptCalculator promptResults={promptResults} />

// Child receives as prop
interface Props {
  promptResults: PromptCostBreakdown;
}
```

✅ **Correct (Store-First)**:
```typescript
// Child connects to store directly
const { promptResults } = useCalculatorStore();

// No props needed for state data
```

### Why This Matters
- Reduces prop drilling across component tree
- Simplifies component interfaces
- Enables direct store subscription for reactivity
- Matches chatbot calculator pattern

## Auto-Calculation Pattern

All calculator config changes trigger automatic recalculation after 100ms debounce.

### Implementation
```typescript
// In useCalculatorStore.ts
setPromptConfig: (updates: Partial<PromptCalculatorConfig>) => {
  set((state) => ({
    promptConfig: { ...state.promptConfig, ...updates },
  }));
  
  // Auto-calculate on config change
  setTimeout(() => get().calculatePrompt(), 100);
}
```

### Benefits
- No "Calculate" button needed
- Real-time cost updates
- Better user experience
- Consistent with chatbot calculator

### Pattern Application
When adding new inputs to calculator:
1. Call `setPromptConfig({ fieldName: value })` in onChange
2. Auto-calculation triggers automatically
3. Results update in real-time

## Model Selection Pattern

### Data Source Pattern
```typescript
// Get models by provider
const openaiIds = getModelsByProvider('openai');
const claudeIds = getModelsByProvider('anthropic');

// Map to display format
const openai = openaiIds.map(id => ({
  id,
  name: LLM_PRICING[id]?.modelFamily || id,
}));
```

### UI Rendering Pattern
```typescript
<select value={config.modelId} onChange={handler}>
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
```

### Key Points
- Always group models by provider (OpenAI/Claude)
- Use modelId as value, modelFamily as display name
- Connect to store with `setPromptConfig({ modelId })`

## Cost Calculator Integration

### Flow Pattern
```
User Input → Store Update → Auto-Calculation → Cost Display

1. onChange={(e) => setPromptConfig({ modelId: e.target.value })}
2. setPromptConfig updates store
3. setTimeout triggers calculatePrompt() after 100ms
4. calculatePromptCost(promptConfig) uses updated config
5. getPricingModel(config.modelId) fetches pricing
6. Results stored in store.promptResults
7. Display components re-render automatically
```

### Critical Integration Points
- **Store**: `promptConfig.modelId` must exist
- **Calculation**: `calculatePromptCost()` must use `config.modelId`
- **Pricing**: `getPricingModel()` must return valid PricingModel
- **UI**: Components must read from store, not props

## Validation Workflow

### TypeScript Validation
```bash
npx tsc --noEmit  # Must return 0 errors
```

### HMR Validation
- Check dev server output for successful updates
- No page reloads (hmr update, not page reload)
- No error messages in console

### Cost Calculation Validation
- Verify store.setPromptConfig triggers auto-calculation
- Confirm calculatePromptCost uses modelId parameter
- Test getPricingModel returns correct pricing data

## Parallel Agent Coordination

### Wave-Based Execution
**Wave 1 (Parallel)**: Independent analysis tasks
- Agent 1: Component structure analysis
- Agent 2: Store integration analysis

**Wave 2 (Sequential)**: Dependent integration tasks
- Agent 3: UI integration (depends on Wave 1)
- Agent 4: Validation (depends on Agent 3)

### When to Use Parallel Execution
✅ Tasks are independent (no shared dependencies)
✅ Multiple components/files to analyze
✅ Time-sensitive implementations

❌ Tasks have dependencies (A must complete before B)
❌ Single file modifications
❌ Complex state changes requiring careful ordering

## Component Placement Strategy

### Form Input Ordering
1. Model Selection (affects all calculations)
2. Primary Inputs (prompt text, response preset)
3. Advanced Configuration (batch operations, multi-turn)

### Why Model Selection Goes First
- Affects pricing for all subsequent inputs
- User needs to select model before entering detailed config
- Consistent with chatbot calculator UX
- Matches mental model: "Choose model, then configure usage"

## Reusable Patterns for Future Work

### Adding New Calculator Inputs
1. Add field to config type (PromptCalculatorConfig)
2. Update DEFAULT_PROMPT_CONFIG with default value
3. Create/modify UI component for input
4. Connect via `onChange={(e) => setPromptConfig({ field: value })}`
5. Auto-calculation handles the rest

### Adding New Cost Display Components
1. Connect to store: `const { promptResults } = useCalculatorStore()`
2. Return null if no results: `if (!promptResults) return null;`
3. Render based on promptResults data
4. No props needed for result data

### Model-Specific Features
```typescript
// Check if model supports caching
const supportsCache = getPricingModel(config.modelId)?.supportsCache ?? false;

// Conditionally show cache-related UI
{supportsCache && (
  <div>Cache Hit Rate Controls</div>
)}
```

## Common Pitfalls Avoided

❌ **Prop Drilling**: Don't pass promptResults as props
✅ **Store Connection**: Use `useCalculatorStore()` directly

❌ **Manual Calculation**: Don't call `calculatePrompt()` manually
✅ **Auto-Calculation**: Trust `setPromptConfig()` to trigger it

❌ **Separate Component**: Don't create ModelSelector.tsx yet
✅ **Inline Pattern**: Keep inline until reuse is needed

❌ **Wrong Data Source**: Don't hardcode model lists
✅ **Pricing Data**: Always use `getModelsByProvider()` + `LLM_PRICING`

## Architecture Principles

1. **Store-First**: Components connect to store, not props
2. **Auto-Calculation**: Config changes trigger automatic recalculation
3. **Real-Time Updates**: No manual "Calculate" buttons needed
4. **Consistent Patterns**: Match existing calculator implementations
5. **Type Safety**: All code must pass TypeScript strict mode
6. **HMR Friendly**: Changes should hot-reload without page refresh

## Performance Characteristics

- **Auto-Calculation Debounce**: 100ms delay prevents rapid recalculations
- **Store Updates**: Shallow merge pattern for efficient state updates
- **Component Re-renders**: Only components subscribed to changed state re-render
- **TypeScript Compilation**: ~2-3 seconds for full validation
- **HMR Updates**: <500ms for hot module replacement