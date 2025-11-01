# TokenTally - Codebase Structure

## Root Directory Layout
```
TokenTally/
├── src/                    # Source code
├── dist/                   # Production build output
├── node_modules/           # Dependencies
├── .claude/                # Claude Code configuration
├── .serena/                # Serena project files
├── index.html              # Entry point HTML
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
├── .eslintrc.json          # ESLint configuration
├── CLAUDE.md               # Claude Code project instructions
├── SECURITY.md             # Security documentation
└── README.md               # Project documentation
```

## Source Directory Structure
```
src/
├── main.tsx                # Application entry point
├── App.tsx                 # Root component
├── index.css               # Global styles (Tailwind imports)
│
├── components/             # React components
│   └── Calculator.tsx      # Main calculator component
│
├── store/                  # State management
│   └── useCalculatorStore.ts  # Zustand store
│
├── utils/                  # Pure utility functions
│   ├── costCalculator.ts   # Core calculation engine
│   ├── optimizationEngine.ts  # Optimization recommendations
│   ├── pdfExporter.ts      # PDF report generation
│   ├── csvExporter.ts      # CSV export functionality
│   └── validators.ts       # Input validation helpers
│
├── config/                 # Configuration data
│   └── pricingData.ts      # Model pricing definitions
│
├── types/                  # TypeScript type definitions
│   └── index.ts            # Shared types
│
└── hooks/                  # Custom React hooks (empty currently)
```

## Path Aliases (tsconfig.json)
- `@/*` → `./src/*`
- `@components/*` → `./src/components/*`
- `@utils/*` → `./src/utils/*`
- `@config/*` → `./src/config/*`
- `@types/*` → `./src/types/*`
- `@hooks/*` → `./src/hooks/*`
- `@store/*` → `./src/store/*`

## Component Responsibilities
- **Single-Page Application** with progressive disclosure
- **Real-time updates** (<100ms) as inputs change
- **No "Calculate" button** - calculations happen automatically
- Components only render and dispatch state updates
- All calculations in pure TypeScript utilities