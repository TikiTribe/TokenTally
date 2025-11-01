# TokenTally - Technology Stack

## Frontend Framework
- **React**: 18.3.1 (modern React with hooks)
- **TypeScript**: 5.6.3 (strict mode enabled)
- **Build Tool**: Vite 5.4.21 (fast dev server, optimized production builds)

## Styling & UI
- **CSS Framework**: Tailwind CSS 3.4.15
- **PostCSS**: 8.4.49 + Autoprefixer 10.4.20
- **Chart Library**: Recharts 2.12.7 (cost breakdowns and comparisons)

## State Management
- **Zustand**: 4.5.5 (lightweight state management)
- Centralized calculator state in `src/store/useCalculatorStore.ts`

## Export & Reporting
- **PDF Generation**: jsPDF 3.0.3 + jsPDF-AutoTable 5.0.2
- **CSV Export**: Native Blob API
- Executive summaries, cost breakdowns, optimization recommendations

## Development Tools
- **Linter**: ESLint 9.39.0
  - TypeScript ESLint Plugin 8.15.0
  - React Plugin 7.37.2
  - React Hooks Plugin 5.0.0
  - Security Plugin 3.0.1
- **Type Checking**: TypeScript compiler with strict mode

## Browser Support
- Modern browsers (ES2020+)
- No IE11 support
- Client-side only (no server-side rendering)

## Node Version
- Node.js version specified in `.nvmrc`