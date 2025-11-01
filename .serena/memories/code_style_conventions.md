# TokenTally - Code Style & Conventions

## TypeScript Configuration
**Strict Mode Enabled** - All files must comply with:
- `strict: true` - All strict type-checking options enabled
- `noImplicitAny: true` - No implicit any types
- `strictNullChecks: true` - Strict null checking
- `noUnusedLocals: true` - Detect unused local variables
- `noUnusedParameters: true` - Detect unused parameters
- `noImplicitReturns: true` - Functions must have explicit returns
- `noUncheckedIndexedAccess: true` - Strict indexed access

## File Naming Conventions
- **React Components**: PascalCase (e.g., `Calculator.tsx`, `ModelSelector.tsx`)
- **Utilities**: camelCase (e.g., `costCalculator.ts`, `optimizationEngine.ts`)
- **Types**: PascalCase for interfaces/types (e.g., `ChatbotConfig`, `CostBreakdown`)
- **Hooks**: camelCase with `use` prefix (e.g., `useCalculatorStore.ts`)

## Import Organization
1. External dependencies (React, Zustand, etc.)
2. Type imports (if needed separately)
3. Internal utilities and config
4. Components
5. Styles

Example:
```typescript
import React from 'react';
import { create } from 'zustand';
import type { ChatbotConfig } from '@types';
import { calculateCost } from '@utils/costCalculator';
import { ModelSelector } from '@components/ModelSelector';
import './styles.css';
```

## Component Patterns
- **Functional Components Only** - No class components
- **React Hooks** - Use modern hooks (useState, useEffect, etc.)
- **Zustand for State** - Global state in store, local state in components
- **TypeScript Interfaces** - Define prop types with interfaces
- **Explicit Return Types** - Functions should declare return types

Example Component:
```typescript
interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function MyComponent({ value, onChange }: Props): React.ReactElement {
  // Component logic
  return <div>{value}</div>;
}
```

## Utility Function Patterns
- **Pure Functions** - No side effects, same input = same output
- **Explicit Types** - All parameters and returns must be typed
- **Input Validation** - Validate with min/max bounds
- **Error Handling** - Throw descriptive errors for invalid inputs

Example:
```typescript
function validateConversationsPerMonth(value: number): number {
  const MIN = 1, MAX = 10_000_000;
  if (!Number.isFinite(value)) {
    throw new Error('Invalid number: must be finite');
  }
  return Math.max(MIN, Math.min(MAX, Math.floor(value)));
}
```

## Naming Conventions
- **Variables**: camelCase (e.g., `conversationsPerMonth`, `systemPromptTokens`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `LLM_PRICING`, `CACHE_HIT_RATE`)
- **Functions**: camelCase, verb-based (e.g., `calculateCost`, `validateInput`)
- **Types/Interfaces**: PascalCase (e.g., `ChatbotConfig`, `CostBreakdown`)
- **Boolean variables**: Prefixed with `is`, `has`, `should` (e.g., `isLoading`, `hasCache`)

## Comments & Documentation
- **TSDoc for public APIs**: Document function purpose, parameters, returns
- **Inline comments**: Explain complex logic, not obvious code
- **No commented-out code**: Delete unused code, use git for history
- **TODO/FIXME**: Only for non-critical items, not security issues

## ESLint Security Rules
- **No eval()**: `no-eval: error`
- **No Function()**: `no-new-func: error`
- **No console.log**: `no-console: warn` (allow console.warn and console.error)
- **Security plugin**: Detects unsafe patterns (timing attacks, unsafe regex, etc.)

## Financial Calculation Standards
- Use precise decimal calculations (avoid floating point errors)
- Round to appropriate precision (typically 2 decimal places for currency)
- Document units clearly (tokens, dollars, percentages)
- Validate inputs before calculations