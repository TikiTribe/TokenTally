# Product Requirements Document (PRD): Prompt Calculator Feature

## Document Information

**Product**: TokenTally - Prompt Calculator Feature  
**Version**: 1.0  
**Date**: 2025-01-31  
**Status**: Approved for Development  
**Owner**: Development Team  
**Stakeholders**: Developers, Prompt Engineers, Technical Teams

---

## 1. Executive Summary

### 1.1 Product Overview
TokenTally is expanding from a chatbot-specific cost forecasting tool to a dual-purpose LLM cost calculator supporting both chatbot operations and prompt engineering workflows. The Prompt Calculator feature enables developers and prompt engineers to predict token counts and API costs for LLM prompts across multiple providers (OpenAI, Anthropic).

### 1.2 Problem Statement
**Current State**: Developers testing LLM integrations lack a reliable tool to:
- Estimate token consumption before running expensive API calls
- Compare cost differences between 15+ LLM models
- Calculate batch operation costs for production deployment planning
- Model multi-turn conversation costs with context accumulation
- Account for Claude's prompt caching feature (40-90% savings)

**Impact**: Teams overspend on LLM APIs due to uninformed model selection, lack of caching strategies, and inability to forecast costs at scale.

### 1.3 Solution
A browser-based prompt calculator that:
- Accepts user-written prompts (textarea input)
- Estimates token counts using character-based approximation (~4 chars = 1 token)
- Supports 15-20 LLM models from OpenAI and Anthropic
- Calculates per-call and monthly batch costs
- Models multi-turn conversations with context accumulation
- Supports Claude prompt caching with configurable hit rates
- Exports results to PDF and CSV formats
- Achieves ±5% cost prediction accuracy

### 1.4 Success Metrics
**Launch Goals (Week 3)**:
- ✅ Dual calculator modes operational (Chatbot + Prompt)
- ✅ 15-20 LLM models supported (vs. current 6)
- ✅ ±5% cost accuracy validated across 8 test scenarios
- ✅ PDF/CSV exports functional with prompt-specific data
- ✅ Responsive design working on mobile/tablet/desktop
- ✅ Production deployment with <1MB total bundle size

**Post-Launch Metrics (Month 1)**:
- Usage Distribution: Track chatbot vs. prompt calculator usage split
- Accuracy Feedback: Monitor user-reported cost discrepancies
- Model Popularity: Identify most-selected models for optimization
- Export Usage: Measure PDF vs. CSV download rates
- Device Mix: Track mobile vs. desktop usage patterns

---

## 2. User Personas

### 2.1 Primary Persona: AI/ML Developer
**Demographics**: Software engineers building LLM-powered applications  
**Technical Level**: High (comfortable with APIs, tokens, model parameters)  
**Goals**:
- Estimate API costs before implementing LLM features
- Compare cost/performance trade-offs between models
- Optimize prompt engineering for cost efficiency
- Plan budget for production deployments

**Pain Points**:
- Uncertainty about token consumption before API calls
- Difficulty comparing 15+ models across 2 providers
- No tooling for batch cost forecasting
- Manual calculation prone to errors

**Use Cases**:
1. Testing different prompts to find most cost-effective approach
2. Comparing GPT-4o vs Claude 3.5 Sonnet for specific use case
3. Estimating monthly costs for 10,000 API calls
4. Evaluating Claude caching savings for production deployment

### 2.2 Secondary Persona: Technical Product Manager
**Demographics**: Non-developer technical leaders planning LLM projects  
**Technical Level**: Medium (understands APIs, needs simplified tooling)  
**Goals**:
- Create budget proposals for LLM integrations
- Evaluate vendor pricing for procurement decisions
- Communicate cost implications to leadership
- Track actual vs. projected spending

**Pain Points**:
- Complex pricing pages from OpenAI/Anthropic
- Inability to model real-world usage patterns
- Difficulty creating budget justifications
- Lack of exportable cost reports

**Use Cases**:
1. Generating cost estimates for quarterly planning
2. Creating vendor comparison reports (PDF export)
3. Modeling different usage scenarios (low/medium/high volume)
4. Presenting cost analysis to leadership

### 2.3 Anti-Persona: Non-Technical End Users
**Why Not**: Prompt calculator targets developers/engineers, not general business users. The chatbot calculator serves small business owners with simpler inputs and explanations.

---

## 3. Product Requirements

### 3.1 Functional Requirements

#### FR-1: Model Support (Priority: P0 - Critical)
**Requirement**: Support 15-20 LLM models from OpenAI and Anthropic with current pricing data.

**Acceptance Criteria**:
- ✅ Include all current 6 models (GPT-4o, GPT-4o-mini, o1-mini, Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus)
- ✅ Add 9-14 additional models scraped from provider documentation
- ✅ Display models grouped by provider in dropdown
- ✅ Show pricing hint per model: "$X.XX per 1M input tokens"
- ✅ Include pricing metadata: `lastUpdated` date and source URL per provider
- ✅ Support deprecated models with visual indicator

**Implementation Tasks**:
- Task 1: Install scraper dependencies (cheerio, node-fetch, @types/*)
- Task 2-5: Create and implement pricing scraper script
- Task 6-10: Run scraper, review output, update pricingData.ts

**Dependencies**: None (Phase 1 foundation)

---

#### FR-2: Token Estimation (Priority: P0 - Critical)
**Requirement**: Estimate token counts from user-provided prompt text with ±5% accuracy.

**Acceptance Criteria**:
- ✅ Use character-based estimation (~4 chars = 1 token)
- ✅ Display real-time token count as user types: "X characters (~Y tokens)"
- ✅ Support prompts up to 100,000 characters (25,000 tokens)
- ✅ Reuse existing `estimateTokensFromChars()` utility
- ✅ No external API calls or library dependencies required
- ✅ Update token count with <50ms latency

**Implementation Tasks**:
- Task 12: Create PromptInput.tsx with textarea and real-time token counter
- Task 19: Add ResponsePreset types to type definitions
- Task 46: Verify ±5% accuracy target across test scenarios

**Dependencies**: Existing tokenEstimator.ts utility

---

#### FR-3: Prompt Input Interface (Priority: P0 - Critical)
**Requirement**: Provide intuitive UI for users to input prompts and configure calculation parameters.

**Acceptance Criteria**:
- ✅ Multiline textarea with 8 rows minimum height
- ✅ Placeholder text: "You are a helpful assistant...\n\nUser: What is the capital of France?"
- ✅ Character counter below textarea with token estimation
- ✅ Response length preset dropdown with 3 options:
  - Short: 100-300 tokens (avg 200) - "Brief answers, simple confirmations"
  - Medium: 300-800 tokens (avg 550) - "Standard responses, short explanations"
  - Long: 800-2000 tokens (avg 1400) - "Detailed answers, code examples, essays"
- ✅ Tooltip on preset explaining how to estimate response length
- ✅ Show selected range in UI: "Expected: 300-800 tokens (avg 550)"

**Implementation Tasks**:
- Task 12: Create PromptInput component
- Task 13: Create ResponsePresets component with tooltip
- Task 18: Verify responsive design on mobile viewport

**Dependencies**: FR-2 (token estimation)

---

#### FR-4: Batch Operations (Priority: P0 - Critical)
**Requirement**: Calculate monthly costs for batch API operations (1 to 10,000,000 calls).

**Acceptance Criteria**:
- ✅ Number input field: "Number of API calls per month"
- ✅ Default value: 1000
- ✅ Validation range: 1 - 10,000,000
- ✅ Format display with comma separators: "1,000 calls/month"
- ✅ Calculate: `monthlyCost = perCallCost × batchOperations`
- ✅ Show both per-call cost ($0.0015) and monthly cost ($1,500.00)

**Implementation Tasks**:
- Task 14: Create BatchConfig component with batch operations input
- Task 23: Implement single-turn cost calculation logic
- Task 41: Manual test case 5 - Batch scaling (verify linear scaling)

**Dependencies**: FR-3 (input interface)

---

#### FR-5: Multi-Turn Conversations (Priority: P1 - High)
**Requirement**: Model multi-turn conversation costs with context accumulation.

**Acceptance Criteria**:
- ✅ Checkbox: "Model multi-turn conversation" (default: unchecked)
- ✅ When checked, show expandable settings:
  - Conversation turns: 1-50 (default: 5)
  - Context strategy: Minimal (50t/turn), Moderate (150t/turn), Full (300t/turn)
  - Explanation text: "Simulates context accumulation across turns"
- ✅ Calculate first turn (no context) + later turns (with context accumulation)
- ✅ Reuse chatbot calculator's context accumulation logic
- ✅ Display breakdown: "First turn: $X.XX | Later turns: $Y.YY × 4 = $Z.ZZ"

**Implementation Tasks**:
- Task 14: Create BatchConfig with multi-turn expansion
- Task 24: Implement multi-turn cost calculation with context
- Task 38: Manual test case 2 - Multi-turn without caching

**Dependencies**: FR-4 (batch operations), FR-6 (caching logic)

---

#### FR-6: Claude Prompt Caching (Priority: P1 - High)
**Requirement**: Model Claude's prompt caching feature with configurable cache hit rates.

**Acceptance Criteria**:
- ✅ Auto-show caching settings when Claude model selected
- ✅ Hide caching settings for OpenAI models
- ✅ Cache hit rate slider: 0-100% (default: 90%)
- ✅ Explanation: "Percentage of calls with cached system prompt"
- ✅ Calculate cache savings: `(inputTokens/1M) × (inputPrice - cacheReadPrice) × cacheHitRate`
- ✅ Apply savings to turns 2+ only (first turn always writes cache)
- ✅ Display savings: "Cache savings: -$X.XX (XX% of input)"

**Implementation Tasks**:
- Task 25: Implement Claude caching logic for prompt calculator
- Task 39: Manual test case 3 - Claude caching (90% hit rate, 10 turns)

**Dependencies**: FR-5 (multi-turn conversations)

---

#### FR-7: Cost Calculation Engine (Priority: P0 - Critical)
**Requirement**: Calculate per-call and monthly costs with ±5% accuracy.

**Acceptance Criteria**:
- ✅ Single-turn formula:
  ```
  inputCost = (inputTokens / 1M) × inputPrice
  outputCost = (outputTokens / 1M) × outputPrice
  perCallCost = inputCost + outputCost
  monthlyCost = perCallCost × batchOperations
  ```
- ✅ Multi-turn formula:
  ```
  firstTurnCost = (inputTokens + outputTokens / 1M) × prices
  laterTurnsCost = (cachedInput + context + outputTokens / 1M) × prices
  conversationCost = firstTurn + (laterTurns × (turns - 1))
  monthlyCost = conversationCost × batchOperations
  ```
- ✅ Caching formula (Claude only):
  ```
  cacheSavings = (inputTokens / 1M) × (inputPrice - cacheReadPrice) × cacheHitRate
  effectiveCost = baseCost - (cacheSavings × (turns - 1))
  ```
- ✅ Display costs with appropriate precision:
  - Per-call: 4 decimal places ($0.0015)
  - Monthly: 2 decimal places with comma separators ($1,500.00)

**Implementation Tasks**:
- Task 22: Implement calculatePromptCost() function in costCalculator.ts
- Task 23-25: Implement single-turn, multi-turn, and caching logic
- Task 27: Test calculation accuracy with hand-calculated scenarios

**Dependencies**: FR-2 (token estimation), FR-1 (pricing data)

---

#### FR-8: Cost Results Display (Priority: P0 - Critical)
**Requirement**: Display cost breakdown and optimization recommendations.

**Acceptance Criteria**:
- ✅ Primary display (large, prominent):
  - Per-call cost: "$0.0015"
  - Monthly cost: "$1,500.00"
- ✅ Cost breakdown table:
  - Input tokens: "X,XXX tokens × $X.XX/1M = $X.XX"
  - Output tokens: "X,XXX tokens × $X.XX/1M = $X.XX"
  - Cache savings (if applicable): "-$X.XX (XX% of input)"
  - Context accumulation (if multi-turn): "+$X.XX"
- ✅ Model comparison (3 cheapest alternatives)
- ✅ Optimization recommendations:
  - "Reduce prompt length by X% to save $X/month"
  - "Enable caching for X% savings (Claude models)"
  - "Consider [model] for X% cost reduction"

**Implementation Tasks**:
- Task 15: Create PromptCalculator main component with results display
- Task 26: Add prompt-specific optimization recommendations
- Task 28-29: Connect UI to store and wire real-time calculations

**Dependencies**: FR-7 (calculation engine)

---

#### FR-9: Tab Navigation (Priority: P0 - Critical)
**Requirement**: Provide equal-prominence tab navigation between Chatbot and Prompt calculators.

**Acceptance Criteria**:
- ✅ Tab UI at top of application
- ✅ Two tabs: "Chatbot Calculator" | "Prompt Calculator"
- ✅ Active tab highlighted with visual indicator
- ✅ Click tab to switch modes instantly (<100ms)
- ✅ Maintain state when switching tabs (don't reset inputs)
- ✅ Responsive: Stack tabs vertically on mobile <768px
- ✅ Keyboard accessible: Tab/Enter navigation support

**Implementation Tasks**:
- Task 11: Create TabNavigation component
- Task 16: Integrate TabNavigation in App.tsx with conditional rendering
- Task 17: Test all UI components render correctly

**Dependencies**: FR-3 (input interface), FR-8 (results display)

---

#### FR-10: PDF Export (Priority: P1 - High)
**Requirement**: Export prompt calculator results to PDF report.

**Acceptance Criteria**:
- ✅ Extend existing PDF exporter to support prompt calculator mode
- ✅ Add new section: "Prompt Calculator Results"
- ✅ Include in report:
  - Prompt summary: First 200 characters + "..." (if truncated)
  - Token counts: Input, Output, Total
  - Batch configuration: N calls/month, multi-turn settings
  - Cost breakdown table (same format as chatbot calculator)
  - Optimization recommendations
- ✅ Sanitize prompt text: Truncate at 500 chars for PDF, escape special characters
- ✅ Maintain consistent branding and layout with chatbot PDF

**Implementation Tasks**:
- Task 30: Extend generatePDF() to support prompt calculator mode
- Task 31: Add prompt calculator section to PDF report
- Task 35: Test PDF export with sample prompt data

**Dependencies**: FR-8 (results display)

---

#### FR-11: CSV Export (Priority: P1 - High)
**Requirement**: Export prompt calculator results to CSV with security.

**Acceptance Criteria**:
- ✅ Extend existing CSV exporter to support prompt calculator mode
- ✅ Add columns:
  - `calculator_mode` (chatbot | prompt)
  - `prompt_text` (truncated to 500 chars)
  - `response_preset` (short | medium | long)
  - `input_tokens`, `output_tokens`
  - `batch_operations`
  - `per_call_cost`, `monthly_cost`
- ✅ Sanitize prompt text: Prevent CSV formula injection (escape =, +, -, @)
- ✅ Verify existing `sanitizeForCSV()` works with prompt text
- ✅ Test with 7 OWASP formula injection test cases

**Implementation Tasks**:
- Task 32: Extend exportToCSV() to support prompt calculator mode
- Task 33: Add prompt calculator columns to CSV
- Task 36: Test CSV export with sample prompt data
- Task 37: Verify CSV formula injection prevention

**Dependencies**: FR-8 (results display), SECURITY.md compliance

---

### 3.2 Non-Functional Requirements

#### NFR-1: Performance (Priority: P0 - Critical)
**Requirement**: Maintain sub-100ms user experience for real-time calculations.

**Acceptance Criteria**:
- ✅ Real-time token estimation: <50ms latency per keystroke
- ✅ Cost calculation: <20ms per input change
- ✅ Tab switching: <100ms transition time
- ✅ Bundle size increase: <20KB for prompt calculator components
- ✅ Total app bundle: <1MB (vs. current 960KB)
- ✅ No impact on chatbot calculator performance

**Implementation Tasks**:
- Task 53: Run production build and verify bundle size
- Task 54: Analyze bundle size breakdown
- All tasks: Monitor performance during development

**Testing**: Load testing with 10KB prompts, 100 rapid input changes

---

#### NFR-2: Accuracy (Priority: P0 - Critical)
**Requirement**: Achieve ±5% cost prediction accuracy (same as chatbot calculator).

**Acceptance Criteria**:
- ✅ Token estimation within ±5% of actual tokenizer counts
- ✅ Cost calculations match hand-calculated values within ±5%
- ✅ Multi-turn context accumulation accurate to ±5%
- ✅ Claude caching savings calculations accurate to ±5%
- ✅ Validate across all 15-20 supported models

**Implementation Tasks**:
- Task 27: Test calculation accuracy with 3 hand-calculated scenarios
- Task 38-45: 8 manual test cases covering all calculation modes
- Task 46: Hand-calculate scenarios and document in accuracy report
- Task 47: Verify ±5% accuracy target achieved

**Testing**: Compare to actual API costs for 10 real-world prompts

---

#### NFR-3: Security (Priority: P0 - Critical)
**Requirement**: Maintain zero-backend architecture with client-side security.

**Acceptance Criteria**:
- ✅ No API keys, authentication, or backend dependencies
- ✅ All data stays in user's browser (no external transmission)
- ✅ Input validation:
  - Prompt text: Max 100,000 characters
  - Batch operations: 1 - 10,000,000
  - Turns: 1 - 50
  - Cache hit rate: 0 - 100%
- ✅ CSV formula injection prevention for prompt text
- ✅ PDF string length limits (truncate at 500 chars)
- ✅ No code execution in exported files

**Implementation Tasks**:
- Task 37: Verify CSV formula injection prevention with prompt text
- Task 35-36: Test PDF/CSV exports for security vulnerabilities
- All input components: Implement validation

**Testing**: OWASP security test cases, penetration testing of exports

---

#### NFR-4: Usability (Priority: P1 - High)
**Requirement**: Maintain intuitive UX consistent with chatbot calculator.

**Acceptance Criteria**:
- ✅ Responsive design: Works on 320px mobile to 4K desktop
- ✅ Accessibility: WCAG 2.1 AA compliance
  - Keyboard navigation support
  - Screen reader compatible
  - Sufficient color contrast (4.5:1 minimum)
- ✅ Visual consistency: Match chatbot calculator design language
- ✅ Loading states: Show spinners during calculations (if >100ms)
- ✅ Error handling: Display user-friendly error messages
- ✅ Empty states: Guide users when no input provided

**Implementation Tasks**:
- Task 18: Verify responsive design on mobile viewport
- Task 48: Test responsive design across devices (320px, 768px, 1024px+)
- All UI tasks: Follow accessibility best practices

**Testing**: Manual testing on 5 devices, automated accessibility scanning

---

#### NFR-5: Maintainability (Priority: P1 - High)
**Requirement**: Ensure code quality and ease of future updates.

**Acceptance Criteria**:
- ✅ TypeScript strict mode: No implicit any, strict null checks
- ✅ Component modularity: <300 lines per component
- ✅ Reuse utilities: Leverage existing tokenEstimator, validators
- ✅ Documentation: Update README, CLAUDE.md, user guides
- ✅ Pricing updates: Document manual update process
- ✅ Code comments: Explain complex calculation logic
- ✅ Type safety: All interfaces and types properly defined

**Implementation Tasks**:
- Task 19: Add type definitions to types/index.ts
- Task 49-51: Update README, CLAUDE.md, create user guide
- All tasks: Follow TypeScript strict mode, document complex logic

**Testing**: Code review for maintainability, TypeScript compilation checks

---

### 3.3 Technical Requirements

#### TR-1: Technology Stack
**Frontend Framework**: React 18.3+ with TypeScript 5.6+ (strict mode)  
**Build Tool**: Vite 5.4  
**Styling**: Tailwind CSS 3.4  
**State Management**: Zustand 4.5  
**Charts**: Recharts 2.12 (reuse existing)  
**Exports**: jsPDF 3.0 + jsPDF-AutoTable 5.0 (reuse existing)  
**Scraper**: Cheerio + node-fetch (dev dependencies only)

**New Dependencies**:
```json
{
  "devDependencies": {
    "cheerio": "^1.0.0-rc.12",
    "node-fetch": "^3.3.2",
    "@types/cheerio": "^0.22.31",
    "@types/node-fetch": "^3.0.3"
  }
}
```

---

#### TR-2: Architecture Patterns
**Component Structure**: Functional React components with hooks  
**State Pattern**: Zustand store with actions and computed state  
**Calculation Pattern**: Pure TypeScript utilities (no side effects)  
**Export Pattern**: Factory functions returning Blob/PDF objects  
**Responsive Pattern**: Mobile-first Tailwind breakpoints (sm:, md:, lg:)

**New Files** (7 files):
1. `scripts/scrape-pricing.ts` - Pricing scraper
2. `src/components/TabNavigation.tsx` - Tab switcher
3. `src/components/PromptInput.tsx` - Textarea with token counter
4. `src/components/ResponsePresets.tsx` - Preset selector
5. `src/components/BatchConfig.tsx` - Batch/multi-turn config
6. `src/components/PromptCalculator.tsx` - Main component
7. `claudedocs/prompt_calculator_accuracy.md` - Test documentation

**Modified Files** (6 files):
1. `src/store/useCalculatorStore.ts` - Add prompt calculator state
2. `src/utils/costCalculator.ts` - Add calculatePromptCost()
3. `src/utils/pdfExporter.ts` - Add prompt section
4. `src/utils/csvExporter.ts` - Add prompt columns
5. `src/config/pricingData.ts` - Extended with scraped models
6. `src/App.tsx` - Add tab navigation

---

#### TR-3: Data Models

**PromptCalculatorConfig**:
```typescript
interface PromptCalculatorConfig {
  promptText: string;                // User-provided prompt
  responsePreset: ResponsePreset;    // 'short' | 'medium' | 'long'
  batchOperations: number;           // 1 - 10,000,000
  multiTurnEnabled: boolean;         // Enable multi-turn calculation
  turns?: number;                    // 1 - 50 (if multiTurnEnabled)
  contextStrategy?: ContextStrategy; // 'minimal' | 'moderate' | 'full'
  modelId: string;                   // Selected LLM model ID
  cacheHitRate?: number;             // 0 - 100 (Claude models only)
}
```

**PromptCostBreakdown**:
```typescript
interface PromptCostBreakdown {
  perCallCost: number;               // Cost per single API call
  monthlyCost: number;               // Total monthly cost
  inputTokens: number;               // Estimated input tokens
  outputTokens: number;              // Estimated output tokens
  inputCost: number;                 // Input token cost
  outputCost: number;                // Output token cost
  cacheSavings?: number;             // Cache savings (Claude only)
  contextCost?: number;              // Context accumulation cost
  breakdown: {
    firstTurn?: number;              // First turn cost
    laterTurns?: number;             // Later turns cost
    cacheHitSavings?: number;        // Cache hit savings
  };
}
```

**ResponsePreset**:
```typescript
type ResponsePreset = 'short' | 'medium' | 'long';

const RESPONSE_PRESETS: Record<ResponsePreset, ResponsePresetConfig> = {
  short: { min: 100, max: 300, average: 200, description: 'Brief answers' },
  medium: { min: 300, max: 800, average: 550, description: 'Standard responses' },
  long: { min: 800, max: 2000, average: 1400, description: 'Detailed answers' }
};
```

---

#### TR-4: Pricing Scraper Architecture

**Script**: `scripts/scrape-pricing.ts`  
**Execution**: Manual run via `npm run scrape-pricing`  
**Output**: Updated `src/config/pricingData.ts`  
**Schedule**: Every 4-6 weeks or when providers announce pricing changes

**Scraper Functions**:
```typescript
async function scrapeOpenAIPricing(): Promise<ScrapedModel[]>
async function scrapeClaudePricing(): Promise<ScrapedModel[]>
async function generatePricingDataFile(models: ScrapedModel[]): Promise<void>
```

**ScrapedModel Interface**:
```typescript
interface ScrapedModel {
  id: string;                        // Unique model ID
  name: string;                      // Display name
  provider: 'openai' | 'anthropic';  // Provider
  inputPerMToken: number;            // Input price per 1M tokens
  outputPerMToken: number;           // Output price per 1M tokens
  cacheWritePerMToken?: number;      // Cache write price (Claude)
  cacheReadPerMToken?: number;       // Cache read price (Claude)
  supportsCache: boolean;            // Caching support flag
  isDeprecated: boolean;             // Deprecation status
  releaseDate?: string;              // Release date (optional)
}
```

**Security Considerations**:
- Run scraper in Node.js (not browser) to bypass CORS
- No sensitive data in output (only public pricing)
- Manual review before committing scraped data
- Error handling for changed HTML structure
- Fallback to existing 6 models if scraper fails

---

#### TR-5: State Management Extension

**Zustand Store Extension**:
```typescript
interface CalculatorState {
  // Existing chatbot state...
  mode: 'chatbot' | 'prompt';  // Active calculator mode
  
  // Prompt calculator state
  promptCalculatorConfig: PromptCalculatorConfig;
  promptCalculatorResults: PromptCostBreakdown | null;
  
  // Actions
  setMode: (mode: 'chatbot' | 'prompt') => void;
  setPromptConfig: (config: Partial<PromptCalculatorConfig>) => void;
  calculatePromptCost: () => void;
  resetPromptCalculator: () => void;
}
```

**Real-Time Calculation Trigger**:
- Trigger on every `setPromptConfig()` call
- Debounce: 50ms delay to avoid excessive calculations
- Async calculation: Use `queueMicrotask()` for non-blocking updates

---

### 3.4 Constraints

#### C-1: Zero-Backend Requirement
**Constraint**: All functionality must run client-side in browser.  
**Impact**: No real-time pricing API, no server-side scraping  
**Mitigation**: Manual pricing updates via scraper script (dev-time only)

#### C-2: Character-Based Token Estimation
**Constraint**: No external tokenizer API or heavy WASM library.  
**Impact**: Token counts approximate (~4 chars = 1 token)  
**Mitigation**: Extensive testing to validate ±5% accuracy target, add disclaimer

#### C-3: Manual Pricing Updates
**Constraint**: Pricing data updated manually every 4-6 weeks.  
**Impact**: Pricing may lag behind provider changes by days/weeks  
**Mitigation**: Document update process, show `lastUpdated` dates in UI

#### C-4: Bundle Size Budget
**Constraint**: Total app must stay under 1MB.  
**Impact**: Limits addition of large libraries (e.g., tiktoken WASM)  
**Mitigation**: Code splitting, lazy loading, monitor build sizes

---

## 4. User Experience (UX) Requirements

### 4.1 User Flow: Prompt Calculator

**Entry Point**: User clicks "Prompt Calculator" tab in application

**Step 1: Input Prompt**
- User sees textarea with placeholder: "You are a helpful assistant..."
- As user types, character count updates: "500 characters (~125 tokens)"
- Real-time feedback (<50ms latency)

**Step 2: Configure Parameters**
- User selects response preset: "Medium (300-800 tokens)"
- Tooltip explains: "Standard responses, short explanations"
- User enters batch operations: "1000 calls/month"

**Step 3: Optional Multi-Turn**
- User checks "Model multi-turn conversation"
- Expandable section shows: Turns (5), Context strategy (Moderate)
- User adjusts based on use case

**Step 4: Select Model**
- User chooses model from grouped dropdown: "Claude 3.5 Sonnet"
- Caching settings auto-appear: Cache hit rate slider (90%)

**Step 5: View Results**
- Per-call cost displays: "$0.0015"
- Monthly cost displays: "$1,500.00"
- Cost breakdown table shows input/output/cache savings
- Model comparison shows 3 cheaper alternatives
- Optimization recommendations suggest improvements

**Step 6: Export (Optional)**
- User clicks "Export PDF" button
- Browser downloads: `tokentally-prompt-report-2025-01-31.pdf`
- Report includes all configuration and results

**Exit Point**: User switches to Chatbot Calculator tab or closes application

---

### 4.2 Responsive Design Requirements

**Mobile (320px - 767px)**:
- Stack tab navigation vertically
- Textarea: Full width, 6 rows
- Form fields: Full width, single column
- Results: Stack vertically
- Buttons: Full width, stacked vertically

**Tablet (768px - 1023px)**:
- Tabs: Horizontal navigation
- Textarea: Full width, 8 rows
- Form fields: Two columns where appropriate
- Results: Side-by-side where space allows
- Buttons: Horizontal layout

**Desktop (1024px+)**:
- Tabs: Horizontal navigation
- Textarea: 70% width, 8 rows
- Form fields: Multi-column layout
- Results: Side-by-side with cost breakdown
- Buttons: Horizontal layout with proper spacing

---

### 4.3 Error Handling

**Input Validation Errors**:
- Empty prompt: "Please enter a prompt to calculate costs"
- Prompt too long: "Prompt exceeds 100,000 character limit"
- Invalid batch operations: "Batch operations must be between 1 and 10,000,000"
- Invalid turns: "Conversation turns must be between 1 and 50"

**Calculation Errors**:
- Division by zero: "Invalid calculation parameters"
- NaN/Infinity: "Unable to calculate cost. Please check inputs."
- Negative costs: "Calculation error. Please verify inputs."

**Export Errors**:
- PDF generation failed: "Unable to generate PDF. Please try again."
- CSV generation failed: "Unable to generate CSV. Please try again."
- Browser compatibility: "Your browser does not support file downloads"

**Scraper Errors** (dev-time only):
- Network failure: "Unable to fetch pricing data from [provider]"
- Parse failure: "Pricing page structure has changed. Manual review required."
- Validation failure: "Scraped data contains invalid values"

---

## 5. Testing Requirements

### 5.1 Test Scenarios

**Test Case 1: Simple Single-Turn**
- Input: 500-char prompt, short response preset, 1000 calls
- Expected: Accurate per-call and monthly costs
- Validation: Compare to hand calculation (±5%)

**Test Case 2: Multi-Turn Without Caching**
- Input: 1000-char prompt, medium response, 5 turns, moderate context, 500 calls
- Expected: Context accumulation reflected in costs
- Validation: Verify turn-by-turn breakdown

**Test Case 3: Claude Caching Enabled**
- Input: 2000-char prompt, long response, 10 turns, 90% cache hit, 1000 calls
- Expected: Significant savings from caching (40-90%)
- Validation: Compare cached vs uncached costs

**Test Case 4: Model Comparison**
- Input: Same config across 3 models (GPT-4o, Claude 3.5 Sonnet, GPT-4o-mini)
- Expected: Accurate cost differences between models
- Validation: Verify ranking by cost

**Test Case 5: Batch Scaling**
- Input: Same config with 1 call, 1000 calls, 100,000 calls
- Expected: Linear cost scaling
- Validation: Verify multiplication accuracy

**Test Case 6: Response Preset Accuracy**
- Input: Test all 3 presets (short, medium, long)
- Expected: Token ranges match preset definitions
- Validation: Verify average token counts used

**Test Case 7: Export Functionality**
- Input: Generate PDF and CSV for sample prompt
- Expected: Complete, accurate, secure exports
- Validation: Manual review of export content

**Test Case 8: Edge Cases**
- Input: Empty prompt, 0 batch operations, single turn
- Expected: Graceful error handling or sensible defaults
- Validation: No crashes, clear error messages

---

### 5.2 Acceptance Testing

**Functional Acceptance**:
- ✅ All 58 todo tasks completed
- ✅ 8 manual test cases pass
- ✅ ±5% accuracy validated with 3 hand calculations
- ✅ PDF and CSV exports functional
- ✅ Responsive design works on 3 device sizes

**Performance Acceptance**:
- ✅ Real-time updates <100ms
- ✅ Bundle size increase <20KB
- ✅ Total bundle <1MB
- ✅ No impact on chatbot calculator

**Security Acceptance**:
- ✅ CSV formula injection prevention verified
- ✅ PDF string length limits implemented
- ✅ Input validation on all fields
- ✅ No code execution in exports

**Usability Acceptance**:
- ✅ 5 users complete tasks without confusion
- ✅ Accessibility scan passes (WCAG AA)
- ✅ Mobile users can complete full workflow
- ✅ Error messages clear and actionable

---

## 6. Implementation Plan

### 6.1 Phase Breakdown

**Phase 1: Pricing Scraper (2 days)** - Tasks 1-10
- Install dependencies
- Create scraper script
- Implement OpenAI and Claude scrapers
- Run scraper and update pricingData.ts
- Test data integrity

**Phase 2: UI Components (3 days)** - Tasks 11-18
- Create TabNavigation, PromptInput, ResponsePresets, BatchConfig, PromptCalculator
- Integrate in App.tsx
- Test rendering and responsive design

**Phase 3: Calculation Logic (2 days)** - Tasks 19-27
- Add type definitions
- Extend Zustand store
- Implement calculatePromptCost()
- Test calculation accuracy

**Phase 4: Export Integration (2 days)** - Tasks 28-37
- Connect UI to store
- Extend PDF and CSV exporters
- Test exports and security

**Phase 5: Testing & Documentation (2 days)** - Tasks 38-52
- Run 8 manual test scenarios
- Hand-calculate and verify accuracy
- Update README, CLAUDE.md, create user guide
- Production build and bundle analysis

**Phase 6: Launch Preparation (1 day)** - Tasks 53-58
- Git commit and push
- Deploy to production
- Smoke test
- Update project memories

**Total Timeline**: 12 days (2-3 weeks)

---

### 6.2 Risk Management

**Risk 1: Pricing Scraper Fragility**  
**Probability**: Medium | **Impact**: Medium  
**Mitigation**: Fallback to existing 6 models if scrape fails, manual review before commit, document maintenance process

**Risk 2: Token Estimation Accuracy**  
**Probability**: Low | **Impact**: High  
**Mitigation**: Extensive testing with real prompts, accuracy disclaimer in UI, option for manual token input, plan for tokenizer library in future

**Risk 3: Bundle Size Growth**  
**Probability**: Low | **Impact**: Medium  
**Mitigation**: Code splitting for pricing data, lazy load components, monitor builds, 1MB budget enforcement

**Risk 4: User Confusion Between Calculators**  
**Probability**: Medium | **Impact**: Low  
**Mitigation**: Clear tab labels, tooltips explaining use cases, examples in documentation, empty state guidance

**Risk 5: Maintenance Burden**  
**Probability**: Medium | **Impact**: Low  
**Mitigation**: Document pricing update process, automate with npm script, track provider change announcements

---

## 7. Launch Criteria

### 7.1 Go/No-Go Checklist

**Functionality** (Must Have):
- ✅ Both calculator modes operational
- ✅ 15-20 models supported with pricing
- ✅ Token estimation and cost calculation working
- ✅ Multi-turn and caching features functional
- ✅ PDF and CSV exports generating correctly

**Quality** (Must Have):
- ✅ ±5% accuracy validated
- ✅ 8 test scenarios pass
- ✅ No console errors in production build
- ✅ Responsive design works on mobile/tablet/desktop
- ✅ Accessibility scan passes

**Performance** (Must Have):
- ✅ Real-time updates <100ms
- ✅ Bundle size <1MB
- ✅ Page load time <2s on 3G

**Security** (Must Have):
- ✅ CSV formula injection prevention verified
- ✅ Input validation on all fields
- ✅ No security warnings in build

**Documentation** (Should Have):
- ✅ README updated
- ✅ CLAUDE.md updated
- ✅ User guide created
- ✅ Pricing update process documented

---

### 7.2 Post-Launch Plan

**Week 1-2: Monitoring**
- Track usage metrics: Chatbot vs Prompt calculator split
- Monitor error logs for calculation failures
- Collect user feedback via support channels
- Track export usage (PDF vs CSV)

**Week 3-4: Iteration**
- Fix critical bugs (if any)
- Implement quick wins from user feedback
- Run pricing update (if providers announce changes)
- Analyze most popular models for optimization

**Month 2+: Enhancements**
- Evaluate need for real-time pricing updates (serverless function)
- Consider adding tokenizer library for 100% accuracy
- Explore conversation templates (save/load prompts)
- Plan API integration for exact token counts

---

## 8. Success Metrics & KPIs

### 8.1 Launch Metrics (Week 3)

**Adoption**:
- ✅ 50%+ of active users try prompt calculator
- ✅ Average 10+ calculations per session (prompt calculator)
- ✅ 30%+ users switch between calculators

**Accuracy**:
- ✅ <5% user-reported cost discrepancies
- ✅ ±5% accuracy validated internally
- ✅ Zero critical calculation bugs

**Performance**:
- ✅ 95%+ users experience <100ms updates
- ✅ Bundle size <1MB achieved
- ✅ Page load time <2s (3G network)

**Quality**:
- ✅ Zero security vulnerabilities reported
- ✅ 90%+ accessibility score (automated scan)
- ✅ <2% error rate in production

---

### 8.2 Post-Launch Metrics (Month 1)

**Usage Distribution**:
- Target: 60% chatbot, 40% prompt calculator
- Measure: Calculator mode switches per session
- Analysis: Identify user segments (developers vs. business owners)

**Model Popularity**:
- Target: Identify top 5 most-selected models
- Measure: Model dropdown selections
- Analysis: Optimize UI for popular models (e.g., move to top of list)

**Export Usage**:
- Target: 20%+ of calculations result in export
- Measure: PDF vs CSV download rates
- Analysis: Improve export features based on preferences

**Device Mix**:
- Target: 30%+ mobile users
- Measure: Screen size distribution
- Analysis: Optimize mobile UX if usage higher than expected

**Accuracy Feedback**:
- Target: <1% users report cost discrepancies
- Measure: Support tickets mentioning "wrong cost"
- Analysis: Investigate patterns, improve estimation if needed

---

## 9. Dependencies & Assumptions

### 9.1 External Dependencies

**OpenAI Pricing Page**:
- URL: https://platform.openai.com/docs/pricing#text-tokens
- Stability: Assumed to maintain consistent HTML structure
- Frequency: Pricing changes quarterly (estimated)

**Claude Pricing Page**:
- URL: https://docs.claude.com/en/docs/about-claude/pricing#model-pricing
- Stability: Assumed to maintain consistent HTML structure
- Frequency: Pricing changes quarterly (estimated)

**Browser Compatibility**:
- Target: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Required: ES6, Fetch API, Blob API, localStorage
- Assumption: 95%+ users on modern browsers

---

### 9.2 Assumptions

**User Behavior**:
- Users will provide representative prompts (not edge cases)
- Users understand basic LLM concepts (tokens, models, API calls)
- Users will manually input realistic response length expectations

**Technical**:
- Character-based estimation sufficient for ±5% accuracy
- No need for exact tokenization (tradeoff: bundle size)
- Manual pricing updates acceptable (vs. real-time scraping)

**Business**:
- Pricing changes from OpenAI/Claude are infrequent (quarterly)
- Users value cost prediction over 100% accuracy
- Developers/engineers are primary audience for prompt calculator

---

## 10. Open Questions & Future Considerations

### 10.1 Open Questions

**Q1: Should we support custom models?**
- Context: Some users run self-hosted models with custom pricing
- Decision: Defer to Phase 7 (post-MVP)
- Rationale: Adds complexity, unclear demand

**Q2: Should we add usage tracking (analytics)?**
- Context: Track which models/features are most used
- Decision: Yes, add Google Analytics (privacy-conscious)
- Rationale: Critical for post-launch optimization

**Q3: Should we support batch API pricing (50% discount)?**
- Context: OpenAI offers 50% discount for batch API
- Decision: No for MVP, add in Phase 7
- Rationale: Batch API has 24h latency, different use case

**Q4: Should we allow users to download pricing data?**
- Context: Users may want to import into Excel/Sheets
- Decision: Yes, CSV export already includes pricing context
- Rationale: No additional work needed

---

### 10.2 Future Enhancements (Post-MVP)

**Phase 7: Advanced Features (Month 2-3)**
1. **Real-time pricing updates**: Vercel serverless function for scraping
2. **Advanced tokenization**: Add gpt-tokenizer library for 100% accuracy
3. **Conversation templates**: Save/load common prompt patterns
4. **API integration**: Connect to OpenAI/Claude APIs for exact token counts
5. **Usage tracking dashboard**: Visualize model popularity, usage trends
6. **Cost alerts**: Email/push notifications when costs exceed thresholds
7. **Batch API support**: Add 50% discount pricing for OpenAI batch API
8. **Custom model support**: Allow users to add self-hosted models
9. **Collaborative features**: Share prompts/configs with team members
10. **Historical cost tracking**: Track actual vs. predicted costs over time

**Priority**: Based on user feedback and usage metrics after launch

---

## 11. Appendices

### Appendix A: Glossary

**Batch Operations**: Multiple API calls with the same prompt configuration  
**Cache Hit Rate**: Percentage of API calls that benefit from cached system prompts (Claude)  
**Context Accumulation**: Growing conversation history included in multi-turn conversations  
**Per-Call Cost**: Cost of a single API call with given configuration  
**Prompt Caching**: Claude feature that caches system prompts for 40-90% cost savings  
**Response Preset**: Predefined token range for expected LLM response length  
**Token**: Unit of text measurement used by LLMs (~4 characters = 1 token)

---

### Appendix B: References

**OpenAI Documentation**:
- Pricing: https://platform.openai.com/docs/pricing#text-tokens
- Tokenization: https://platform.openai.com/tokenizer
- API Reference: https://platform.openai.com/docs/api-reference

**Anthropic Documentation**:
- Pricing: https://docs.claude.com/en/docs/about-claude/pricing#model-pricing
- Prompt Caching: https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- API Reference: https://docs.claude.com/en/api

**Internal Documentation**:
- TokenTally README: `/README.md`
- Development Guide: `/CLAUDE.md`
- Security Standards: `/SECURITY.md`
- Specification Document: `.serena/memories/prompt_calculator_specification.md`

---

### Appendix C: Contact Information

**Product Owner**: Development Team  
**Technical Lead**: Claude Code AI Agent  
**Stakeholders**: Developers, Prompt Engineers, Technical Product Managers  

**Feedback Channels**:
- GitHub Issues: https://github.com/TikiTribe/TokenTally/issues
- Support: (To be defined post-launch)

---

## Document Approval

**Status**: ✅ Approved for Development  
**Approved By**: User (via brainstorming session and todo list generation)  
**Approval Date**: 2025-01-31  
**Next Review**: Post-launch (Week 4)

**Version History**:
- v1.0 (2025-01-31): Initial PRD created based on brainstorming session and 58-task todo list

---

**End of PRD**
