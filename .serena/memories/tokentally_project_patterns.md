# TokenTally - Project Patterns and Architectural Decisions

## Component Architecture

### Store-First Pattern
All components access Zustand store directly - NO prop drilling:
```typescript
// Component pattern
const { promptConfig, promptResults, promptRecommendations, setPromptConfig } = useCalculatorStore();

// Store pattern
interface CalculatorState {
  config: ChatbotConfig;
  results: CostBreakdown | null;
  recommendations: Recommendation[];
  promptConfig: PromptCalculatorConfig;
  promptResults: PromptCostBreakdown | null;
  promptRecommendations: Recommendation[];
}
```

### Calculation Separation
Pure TypeScript utilities perform ALL calculations - components ONLY render:
- Calculations: src/utils/costCalculator.ts
- Recommendations: src/utils/optimizationEngine.ts
- Components: src/components/*.tsx (render only)

### Export Function Dual Structure
Pattern: `generate[Scope]Report() → exportAndDownload[Scope]Report()`
- **Chatbot**: generatePDFReport() + exportAndDownloadPDF()
- **Prompt**: generatePromptPDFReport() + exportAndDownloadPromptPDF()
- **Reason**: Separation prevents naming collisions, enables future extensibility

## State Management Patterns

### Auto-Calculation Pattern
Store automatically recalculates on config changes:
```typescript
setConfig: (updates: Partial<ChatbotConfig>) => {
  set((state) => ({
    config: { ...state.config, ...updates },
  }));
  setTimeout(() => get().calculate(), 100); // Auto-calculate after state update
}
```

### Conditional Calculation Pattern
Empty inputs skip calculation and clear results:
```typescript
if (!promptConfig.promptText || promptConfig.promptText.trim().length === 0) {
  set({
    promptResults: null,
    promptRecommendations: [],
    isCalculating: false,
  });
  return;
}
```

### Recommendation Generation Pattern
Always generate recommendations when results calculated:
```typescript
const promptResults = calculatePromptCost(promptConfig);
const promptRecommendations = generatePromptRecommendations(promptConfig, promptResults);

set({
  promptResults,
  promptRecommendations,
  isCalculating: false,
});
```

## Security Patterns

### CSV Formula Injection Prevention (OWASP A03:2021)
```typescript
function sanitizeForCSV(value: string | number): string {
  const str = String(value);
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some((char) => str.startsWith(char))) {
    return `'${str}`; // Prefix with quote to treat as text
  }
  return str.replace(/"/g, '""'); // Escape double quotes
}
```

Applied to ALL user inputs before CSV export:
- promptConfig.promptText
- breakdown.model
- Any string fields in recommendations

### Vercel Security Headers
Standard security headers for production deployment:
```json
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin"
}
```

## TypeScript Patterns

### Strict Mode Configuration (tsconfig.json)
11 strict-mode flags enabled:
- strict: true (enables 9 checks)
- noUnusedLocals: true
- noUnusedParameters: true
- noFallthroughCasesInSwitch: true
- noUncheckedIndexedAccess: false (intentional - allows array access)

### Type Import Pattern
Use type imports for clarity:
```typescript
import type {
  ChatbotConfig,
  CostBreakdown,
  Recommendation,
} from '@/types';
```

### Interface Over Type Pattern
Prefer interfaces for object shapes (better error messages):
```typescript
interface CalculatorState {
  config: ChatbotConfig;
  results: CostBreakdown | null;
  // ...
}
```

## Build and Deployment Patterns

### Bundle Optimization
- Vite automatic code splitting
- Gzip compression: 3.3:1 ratio (305 KB gzipped from ~1 MB)
- Asset caching: 1 year immutable cache for /assets/*
- Target: <500 KB initial bundle (currently 305 KB ✅)

### SPA Routing Pattern
All routes rewrite to index.html for client-side routing:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Development vs Production
- Dev: Fast refresh with Vite HMR, no optimization
- Build: TypeScript compile → Vite production build → gzip compression
- Preview: Test production build locally before deployment

## Naming Conventions

### File Naming
- Components: PascalCase (Calculator.tsx, PromptCalculator.tsx)
- Utils: camelCase (costCalculator.ts, pdfExporter.ts)
- Config: camelCase (pricingData.ts)
- Types: types.ts (centralized type definitions)

### Function Naming
- Generators: generate[Noun]() - generatePDFReport(), generateRecommendations()
- Actions: [verb][Noun]() - calculateChatbotCost(), exportAndDownloadPDF()
- Utilities: [verb][Noun]() - sanitizeForCSV(), formatCurrency()

### Variable Naming
- Configs: [scope]Config (chatbotConfig, promptConfig)
- Results: [scope]Results (results, promptResults)
- State: descriptive (isCalculating, error, recommendations)

## Error Handling Patterns

### Try-Catch with State Updates
```typescript
try {
  const results = calculateChatbotCost(config);
  set({ results, isCalculating: false });
} catch (error) {
  set({
    error: error instanceof Error ? error.message : 'Calculation failed',
    isCalculating: false,
  });
}
```

### Validation Pattern
Input validation at boundaries (store setters):
```typescript
setConfig: (updates: Partial<ChatbotConfig>) => {
  // Implicit validation through TypeScript types
  set((state) => ({
    config: { ...state.config, ...updates },
  }));
}
```

## Testing Strategy

### Manual Testing Pattern
No automated tests in MVP - comprehensive manual scenarios:
1. Zero conversations (edge case)
2. Single-turn conversation (no caching)
3. High-volume caching scenario (validate 90% savings)
4. Context accumulation (full vs minimal strategy)
5. Model comparison (verify cheapest model identification)

### Accuracy Verification
Hand-calculate 3+ scenarios, compare to tool output:
- Acceptable variance: ±5%
- Actual achieved: 0.00% - 3.90%
- Method: Excel spreadsheet with exact formulas

## Common Mistakes to Avoid

### Agent Errors (From This Session)
1. ❌ **Wrong function names**: Importing chatbot versions instead of prompt-specific
   - Fix: Always check function naming convention before importing
2. ❌ **Missing store state**: Assuming state exists without verification
   - Fix: Grep search store before using new state properties
3. ❌ **Skipping TypeScript check**: Not running tsc before claiming completion
   - Fix: Always run npx tsc --noEmit before marking tasks complete

### Development Errors
1. ❌ **Prop drilling**: Passing store state through props
   - Fix: Access store directly in components
2. ❌ **Calculations in components**: Performing math in React components
   - Fix: Keep calculations in pure TypeScript utilities
3. ❌ **Missing sanitization**: Exporting user input directly to CSV
   - Fix: Always sanitize with sanitizeForCSV() for OWASP compliance

## Future Extension Patterns

### Adding New Calculator Type
1. Add to CalculatorMode union type: 'chatbot' | 'prompt' | 'newType'
2. Create [scope]Config interface and [scope]CostBreakdown interface
3. Add [scope]Config, [scope]Results, [scope]Recommendations to store
4. Create calculate[Scope]() in costCalculator.ts
5. Create generate[Scope]Recommendations() in optimizationEngine.ts
6. Create Component with store access pattern
7. Add to TabNavigation component

### Adding New Export Format
1. Create generate[Scope][Format]Report() function
2. Create exportAndDownload[Scope][Format]() wrapper
3. Add handler to component: handle[Format]Export()
4. Add button to Export Reports card
5. Apply sanitization if format requires (e.g., XML, JSON)

### Adding New Model
1. Update LLM_PRICING in pricingData.ts
2. Add to provider groups in getModelsByProvider()
3. Test calculations with new pricing structure
4. Update documentation with new model capabilities
