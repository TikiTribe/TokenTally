# Prompt Calculator Feature Specification

## Executive Summary

**Feature**: Integrated prompt cost calculator for developers/engineers doing LLM prompt engineering
**Target Users**: Developers, prompt engineers, technical teams testing LLM integrations
**Integration**: Equal prominence tab alongside existing chatbot calculator
**Timeline**: 2-3 weeks (phased implementation)

## Core Requirements

### 1. Feature Scope
- **Integration Type**: New tab in existing single-page app with toggle between "Chatbot Calculator" and "Prompt Calculator"
- **Visual Hierarchy**: Equal prominence - neither mode is primary
- **Use Case**: Cost prediction for development/testing LLM prompts with batch operation support
- **Multi-Turn Support**: Yes, with context accumulation modeling
- **Accuracy Target**: ±5% (same as chatbot calculator)

### 2. Token Prediction
- **Method**: Character-based estimation using existing utility (~4 chars = 1 token)
- **Reuse**: `src/utils/tokenEstimator.ts` existing functions
- **Advantage**: No external dependencies, fast, maintains zero-backend promise
- **Accuracy**: Sufficient for ±5% cost prediction target

### 3. Model Support & Pricing Data

#### Initial Population (One-Time Script)
- **Script**: `scripts/scrape-pricing.ts` (Node.js + Cheerio/Puppeteer)
- **Sources**:
  - OpenAI: https://platform.openai.com/docs/pricing#text-tokens
  - Claude: https://docs.claude.com/en/docs/about-claude/pricing#model-pricing
- **Output**: Extended `src/config/pricingData.ts` with all available models
- **Run**: `npm run scrape-pricing` (one-time setup, then manual periodic updates)

#### Model Coverage
**Current 6 Models** (keep existing):
- GPT-4o, GPT-4o-mini, o1-mini
- Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus

**Add from Scraper** (estimated 10-15 additional models):
- OpenAI: GPT-4 Turbo, GPT-3.5 Turbo variants, older GPT-4 versions
- Claude: Claude 3 Sonnet, Claude 3 Haiku, older versions
- Organize by provider and date (newest first)

#### Maintenance Strategy
- **Manual updates**: Every 4-6 weeks or when providers announce pricing changes
- **Update process**: 
  1. Re-run `npm run scrape-pricing`
  2. Review diff in `pricingData.ts`
  3. Commit + deploy
- **Update tracking**: `lastUpdated` field per provider (OpenAI, Anthropic)

### 4. User Input & Experience

#### Input Fields
1. **Prompt Text** (textarea, multiline)
   - Label: "Enter your prompt"
   - Placeholder: "You are a helpful assistant...\n\nUser: What is the capital of France?"
   - Character counter: "X characters (~Y tokens)"
   - Real-time token estimation

2. **Response Length Preset** (dropdown)
   - Options:
     - Short: 100-300 tokens (avg 200) - "Brief answers, simple confirmations"
     - Medium: 300-800 tokens (avg 550) - "Standard responses, short explanations"
     - Long: 800-2000 tokens (avg 1400) - "Detailed answers, code examples, essays"
   - Tooltip: "Base estimate on typical response length. Short = 1-2 paragraphs, Medium = 1/2 page, Long = 1+ pages"
   - Show selected range in UI: "Expected: 300-800 tokens (avg 550)"

3. **Batch Operations** (number input)
   - Label: "Number of API calls per month"
   - Default: 1000
   - Range: 1 - 10,000,000
   - Validation: Same as chatbot calculator

4. **Multi-Turn Settings** (optional, expandable)
   - Checkbox: "Model multi-turn conversation" (default: unchecked)
   - If checked, show:
     - Conversation turns: 1-50 (default: 5)
     - Context strategy: Minimal/Moderate/Full (reuse existing)
     - Explanation: "Simulates context accumulation across turns"

5. **Model Selection** (dropdown, same as chatbot calculator)
   - Grouped by provider: OpenAI Models | Claude Models
   - Show pricing hint: "$X.XX per 1M input tokens"

6. **Caching Settings** (Claude models only, auto-show)
   - Same as chatbot calculator
   - Cache hit rate: 0-100% (default: 90%)
   - Only visible when Claude model selected

### 5. Cost Calculation Logic

#### Single-Turn (Simple)
```typescript
const inputTokens = estimateTokensFromChars(promptText);
const outputTokens = responsePresetAverage; // 200, 550, or 1400
const costPerCall = (inputTokens / 1M × inputPrice) + (outputTokens / 1M × outputPrice);
const monthlyCost = costPerCall × batchOperations;
```

#### Multi-Turn (Advanced)
```typescript
// Reuse chatbot calculator logic
const firstTurnCost = (inputTokens + outputTokens / 1M × prices);
const laterTurnsCost = (cachedInput + context + outputTokens / 1M × prices);
const conversationCost = firstTurn + (laterTurns × (turns - 1));
const monthlyCost = conversationCost × batchOperations;
```

#### Caching (Claude Only)
```typescript
// Apply same caching logic as chatbot calculator
const cacheSavings = (inputTokens / 1M) × (inputPrice - cacheReadPrice) × cacheHitRate;
const effectiveCost = baseCost - (cacheSavings × (turns - 1));
```

### 6. Output Display

#### Cost Summary (Primary)
- **Per-Call Cost**: $X.XXXX (4 decimal places for precision)
- **Monthly Cost**: $X,XXX.XX (2 decimal places, comma-separated)
- **Cost Breakdown**:
  - Input tokens: X,XXX tokens × $X.XX/1M = $X.XX
  - Output tokens: X,XXX tokens × $X.XX/1M = $X.XX
  - Cache savings (if applicable): -$X.XX (XX% of input)
  - Context accumulation (if multi-turn): +$X.XX

#### Model Comparison (Secondary)
- Show 3 cheapest alternatives
- Same format as chatbot calculator
- "Switch to [model] to save $XXX/month (XX%)"

#### Optimization Recommendations
- Extend existing optimization engine
- Add prompt-specific recommendations:
  - "Reduce prompt length by X% to save $X/month"
  - "Enable caching for X% savings (Claude models)"
  - "Consider [model] for X% cost reduction"

### 7. Export & Reporting

#### PDF Report Extension
Add new section: "Prompt Calculator Results"
- Prompt summary: First 200 chars + "..." (if truncated)
- Token counts: Input/Output/Total
- Batch configuration: N calls/month, multi-turn settings
- Cost breakdown table (same format as chatbot)
- Recommendations

#### CSV Export Extension
Add columns:
- calculator_mode (chatbot | prompt)
- prompt_text (truncated to 500 chars)
- response_preset (short | medium | long)
- input_tokens, output_tokens
- batch_operations
- per_call_cost, monthly_cost

### 8. UI/UX Design

#### Tab Navigation
```
┌─────────────────────────────────────────┐
│  [Chatbot Calculator] [Prompt Calculator] │
│                                           │
│  ... calculator content ...              │
└─────────────────────────────────────────┘
```

#### Layout Structure (Prompt Calculator Tab)
```
┌─────────────────────────────────────────┐
│ Model Selection: [Dropdown]              │
├─────────────────────────────────────────┤
│ Prompt Input                             │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │  [Textarea - 8 rows]                │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ 500 characters (~125 tokens)            │
├─────────────────────────────────────────┤
│ Response Length: [Short ▼]  [?tooltip]  │
│ Expected: 100-300 tokens (avg 200)      │
├─────────────────────────────────────────┤
│ Batch Operations: [1000]                │
├─────────────────────────────────────────┤
│ ☐ Model multi-turn conversation         │
│   [Expandable settings if checked]      │
├─────────────────────────────────────────┤
│ [Claude models only]                    │
│ Cache Hit Rate: [90%] slider            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Cost Results (same format as chatbot)   │
│ - Per-call cost: $0.0015                │
│ - Monthly cost: $1,500.00               │
│ - Breakdown table                       │
│ - Model comparison                      │
│ - Recommendations                       │
└─────────────────────────────────────────┘

[Export PDF] [Export CSV]
```

#### Responsive Design
- Same breakpoints as chatbot calculator
- Stack inputs vertically on mobile
- Collapse multi-turn settings by default on small screens

## Technical Architecture

### New Files

#### 1. `scripts/scrape-pricing.ts`
**Purpose**: One-time scraper to populate pricing data
**Dependencies**: `cheerio`, `node-fetch`, `@types/node`
**Run**: `npm run scrape-pricing`
**Output**: Updated `src/config/pricingData.ts`

```typescript
interface ScrapedModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic';
  inputPerMToken: number;
  outputPerMToken: number;
  cacheWritePerMToken?: number;
  cacheReadPerMToken?: number;
  supportsCache: boolean;
  isDeprecated: boolean;
  releaseDate?: string;
}

async function scrapeOpenAIPricing(): Promise<ScrapedModel[]>
async function scrapeClaudePricing(): Promise<ScrapedModel[]>
async function generatePricingDataFile(models: ScrapedModel[]): Promise<void>
```

#### 2. `src/components/PromptCalculator.tsx`
**Purpose**: Main prompt calculator UI component
**Dependencies**: React, Zustand store, utilities
**Exports**: `PromptCalculator` component

```typescript
interface PromptCalculatorProps {
  // No props - uses global state
}

export const PromptCalculator: React.FC<PromptCalculatorProps> = () => {
  // Component implementation
}
```

#### 3. `src/components/PromptInput.tsx`
**Purpose**: Textarea with real-time token estimation
**Exports**: `PromptInput` component

```typescript
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  estimatedTokens: number;
}
```

#### 4. `src/components/ResponsePresets.tsx`
**Purpose**: Response length preset selector with tooltip
**Exports**: `ResponsePresets` component

```typescript
type ResponsePreset = 'short' | 'medium' | 'long';

interface ResponsePresetsProps {
  value: ResponsePreset;
  onChange: (preset: ResponsePreset) => void;
}
```

#### 5. `src/components/BatchConfig.tsx`
**Purpose**: Batch operations and multi-turn settings
**Exports**: `BatchConfig` component

```typescript
interface BatchConfigProps {
  batchOperations: number;
  onBatchChange: (value: number) => void;
  multiTurnEnabled: boolean;
  onMultiTurnToggle: () => void;
  turns?: number;
  contextStrategy?: ContextStrategy;
}
```

#### 6. `src/components/TabNavigation.tsx`
**Purpose**: Tab switcher for Chatbot/Prompt calculators
**Exports**: `TabNavigation` component

```typescript
type CalculatorMode = 'chatbot' | 'prompt';

interface TabNavigationProps {
  activeMode: CalculatorMode;
  onModeChange: (mode: CalculatorMode) => void;
}
```

### Modified Files

#### 1. `src/store/useCalculatorStore.ts`
**Changes**: Add prompt calculator state

```typescript
interface CalculatorState {
  // Existing chatbot state...
  
  // New prompt calculator state
  promptCalculatorConfig: {
    promptText: string;
    responsePreset: 'short' | 'medium' | 'long';
    batchOperations: number;
    multiTurnEnabled: boolean;
    turns?: number;
    contextStrategy?: ContextStrategy;
  };
  promptCalculatorResults: PromptCostBreakdown | null;
  
  // New actions
  setPromptConfig: (config: Partial<PromptCalculatorConfig>) => void;
  calculatePromptCost: () => void;
}
```

#### 2. `src/utils/costCalculator.ts`
**Changes**: Add prompt-specific calculation functions

```typescript
export function calculatePromptCost(
  promptTokens: number,
  responsePreset: 'short' | 'medium' | 'long',
  model: ModelId,
  batchOperations: number,
  options?: {
    multiTurn?: boolean;
    turns?: number;
    contextStrategy?: ContextStrategy;
    cacheHitRate?: number;
  }
): PromptCostBreakdown;
```

#### 3. `src/utils/pdfExporter.ts`
**Changes**: Add prompt calculator section

```typescript
export function generatePDF(
  results: CostBreakdown | PromptCostBreakdown,
  config: ChatbotConfig | PromptCalculatorConfig,
  mode: 'chatbot' | 'prompt'
): void;
```

#### 4. `src/utils/csvExporter.ts`
**Changes**: Add prompt calculator columns

```typescript
export function exportToCSV(
  results: CostBreakdown | PromptCostBreakdown,
  config: ChatbotConfig | PromptCalculatorConfig,
  mode: 'chatbot' | 'prompt'
): void;
```

#### 5. `src/config/pricingData.ts`
**Changes**: Extended with scraped models

```typescript
// Add 10-15 more models from scraper
export const LLM_PRICING = {
  // Existing 6 models...
  
  // OpenAI additions
  'gpt-4-turbo': { ... },
  'gpt-3.5-turbo': { ... },
  // ... more OpenAI models
  
  // Claude additions
  'claude-3-sonnet': { ... },
  'claude-3-haiku': { ... },
  // ... more Claude models
};

export const PRICING_METADATA = {
  openai: {
    lastUpdated: '2025-01-15',
    source: 'https://platform.openai.com/docs/pricing#text-tokens'
  },
  anthropic: {
    lastUpdated: '2025-01-15',
    source: 'https://docs.claude.com/en/docs/about-claude/pricing#model-pricing'
  }
};
```

#### 6. `src/App.tsx`
**Changes**: Add tab navigation and conditional rendering

```typescript
function App() {
  const [calculatorMode, setCalculatorMode] = useState<'chatbot' | 'prompt'>('chatbot');
  
  return (
    <div className="app">
      <TabNavigation activeMode={calculatorMode} onModeChange={setCalculatorMode} />
      
      {calculatorMode === 'chatbot' ? (
        <Calculator /> // Existing component
      ) : (
        <PromptCalculator /> // New component
      )}
    </div>
  );
}
```

### Type Definitions

#### New Types (`src/types/index.ts`)

```typescript
export type ResponsePreset = 'short' | 'medium' | 'long';

export interface ResponsePresetConfig {
  min: number;
  max: number;
  average: number;
  description: string;
}

export const RESPONSE_PRESETS: Record<ResponsePreset, ResponsePresetConfig> = {
  short: { min: 100, max: 300, average: 200, description: 'Brief answers, simple confirmations' },
  medium: { min: 300, max: 800, average: 550, description: 'Standard responses, short explanations' },
  long: { min: 800, max: 2000, average: 1400, description: 'Detailed answers, code examples, essays' }
};

export interface PromptCalculatorConfig {
  promptText: string;
  responsePreset: ResponsePreset;
  batchOperations: number;
  multiTurnEnabled: boolean;
  turns?: number;
  contextStrategy?: ContextStrategy;
  modelId: string;
  cacheHitRate?: number;
}

export interface PromptCostBreakdown {
  perCallCost: number;
  monthlyCost: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  cacheSavings?: number;
  contextCost?: number;
  breakdown: {
    firstTurn?: number;
    laterTurns?: number;
    cacheHitSavings?: number;
  };
}
```

## Implementation Phases

### Phase 1: Pricing Scraper (Week 1, Days 1-2)
**Tasks**:
1. Install dependencies: `npm install cheerio node-fetch @types/cheerio`
2. Create `scripts/scrape-pricing.ts`
3. Implement OpenAI pricing scraper
4. Implement Claude pricing scraper
5. Add `scrape-pricing` npm script
6. Run scraper and review output
7. Extend `pricingData.ts` with scraped data
8. Add `PRICING_METADATA` with lastUpdated dates
9. Test pricing data integrity

**Deliverable**: Extended `pricingData.ts` with 15-20 total models

### Phase 2: Core UI Components (Week 1, Days 3-5)
**Tasks**:
1. Create `TabNavigation.tsx` component
2. Create `PromptInput.tsx` with token estimation
3. Create `ResponsePresets.tsx` with tooltip
4. Create `BatchConfig.tsx` with multi-turn expansion
5. Integrate tab navigation in `App.tsx`
6. Test component rendering and interactions
7. Ensure responsive design on mobile

**Deliverable**: All UI components rendering correctly

### Phase 3: Calculation Logic (Week 2, Days 1-2)
**Tasks**:
1. Extend Zustand store with prompt calculator state
2. Add `calculatePromptCost()` to `costCalculator.ts`
3. Implement single-turn calculation
4. Implement multi-turn calculation with context
5. Implement Claude caching logic
6. Add optimization recommendations for prompts
7. Test calculations with known values (±5% accuracy)

**Deliverable**: Working calculation engine

### Phase 4: Integration & Export (Week 2, Days 3-4)
**Tasks**:
1. Connect UI components to Zustand store
2. Wire up real-time calculations
3. Extend PDF exporter with prompt calculator section
4. Extend CSV exporter with prompt calculator columns
5. Test exports with sample data
6. Verify formula injection prevention in CSV

**Deliverable**: Complete prompt calculator with exports

### Phase 5: Testing & Documentation (Week 2, Day 5 - Week 3, Day 1)
**Tasks**:
1. Manual testing: 8 test scenarios (similar to chatbot calculator)
2. Verify ±5% accuracy target with hand calculations
3. Test responsive design on mobile/tablet
4. Update README with prompt calculator section
5. Update CLAUDE.md with new feature documentation
6. Create user guide for prompt calculator
7. Production build and bundle size analysis

**Deliverable**: Production-ready prompt calculator

### Phase 6: Launch Preparation (Week 3, Days 2-3)
**Tasks**:
1. Git commit with detailed feature description
2. Push to GitHub
3. Deploy to Vercel/Netlify
4. Smoke test production deployment
5. Update project status in memories

**Deliverable**: Live prompt calculator feature

## Testing Strategy

### Manual Test Cases
1. **Simple single-turn**: 500-char prompt, short response, 1000 calls
2. **Multi-turn without caching**: 1000-char prompt, medium response, 5 turns, 500 calls
3. **Claude caching enabled**: 2000-char prompt, long response, 10 turns, 90% cache hit, 1000 calls
4. **Model comparison**: Same config across 3 models, verify cost differences
5. **Batch scaling**: 1 call vs 1000 vs 100,000 - verify linear scaling
6. **Response preset accuracy**: Verify short/medium/long token ranges
7. **Export functionality**: Generate PDF and CSV, verify content
8. **Edge cases**: Empty prompt, 0 batch operations, single turn

### Accuracy Validation
- Hand-calculate 3 scenarios
- Compare to tool output
- Must be within ±5% (same as chatbot calculator)
- Document calculations in `claudedocs/prompt_calculator_accuracy.md`

## Security Considerations

### Input Validation
- Prompt text: Max 100,000 characters (prevent DoS)
- Batch operations: 1 - 10,000,000 (same as chatbot)
- Turns: 1 - 50 (if multi-turn enabled)
- Cache hit rate: 0 - 100% (if Claude model)

### Export Security
- Reuse existing CSV formula injection prevention
- Add PDF string length limits for prompt text (truncate at 500 chars)
- Sanitize user input before export

### Scraper Security
- Run scraper in Node.js (not browser)
- No sensitive data in output
- Review scraped data before committing
- Add rate limiting to avoid scraper detection

## Performance Targets

### Bundle Size Impact
- Scraper: 0KB (dev dependency only)
- New components: ~15KB (3 small React components)
- Total app increase: <20KB
- Target total bundle: <1MB

### Calculation Speed
- Real-time updates: <50ms per input change
- Token estimation: <10ms
- Cost calculation: <20ms
- Total UX: <100ms (maintains snappy feel)

### Load Performance
- Initial page load: <2s on 3G
- Tab switching: <100ms
- No impact on chatbot calculator performance

## Future Enhancements (Post-MVP)

### Phase 7 (Optional)
1. **Real-time pricing updates**: Add Vercel serverless function for scraping
2. **Advanced tokenization**: Add gpt-tokenizer library for 100% accuracy
3. **Conversation templates**: Save/load common prompt patterns
4. **API integration**: Connect to OpenAI/Claude APIs for exact token counts
5. **Usage tracking**: Track which models are most popular
6. **Cost alerts**: Email/push notifications when costs exceed thresholds

## Success Metrics

### Launch Goals (Week 3)
- ✅ Both calculators functional with tab navigation
- ✅ 15-20 LLM models supported
- ✅ ±5% cost accuracy validated
- ✅ PDF/CSV exports working
- ✅ Responsive design on mobile
- ✅ Production deployment live

### Post-Launch Goals (Month 1)
- Usage split: Track chatbot vs prompt calculator usage
- Accuracy feedback: Monitor user-reported cost discrepancies
- Model popularity: Track which models are most selected
- Export usage: Track PDF vs CSV export rates
- Mobile usage: Track mobile vs desktop users

## Documentation Updates

### README.md
- Add "Prompt Calculator" section after "Chatbot Calculator"
- Update feature list: "Two calculation modes: Chatbot & Prompt"
- Update model count: "15-20 LLM Models" (instead of 6)
- Add pricing update instructions

### CLAUDE.md
- Add "Prompt Calculator Architecture" section
- Document calculation formulas for prompt mode
- Add component responsibilities for new components
- Update state management patterns
- Add testing strategy for prompt calculator

### SECURITY.md
- Add scraper security considerations
- Update input validation for prompt text
- Add PDF string length limits

## Risks & Mitigations

### Risk 1: Pricing Scraper Fragility
**Risk**: OpenAI/Claude change their pricing page HTML structure
**Mitigation**: 
- Add error handling in scraper
- Fallback to existing 6 models if scrape fails
- Manual review before committing scraped data
- Document scraper maintenance in README

### Risk 2: Token Estimation Accuracy
**Risk**: Character-based estimation doesn't hit ±5% target for all models
**Mitigation**:
- Test extensively with real prompts
- Add accuracy disclaimer in UI
- Provide option to manually input token counts
- Plan for gpt-tokenizer integration in Phase 7

### Risk 3: Bundle Size Growth
**Risk**: Adding 15+ models increases bundle size significantly
**Mitigation**:
- Use code splitting for pricing data
- Lazy load prompt calculator components
- Monitor bundle size in builds
- Set 1MB total budget

### Risk 4: User Confusion
**Risk**: Two calculators confuse users about which to use
**Mitigation**:
- Clear tab labels: "Chatbot Calculator" vs "Prompt Calculator"
- Add tooltips explaining use cases
- Guide users to appropriate calculator in empty state
- Add examples in documentation

## Appendix: Scraper Implementation Sketch

```typescript
// scripts/scrape-pricing.ts
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import * as fs from 'fs';

async function scrapeOpenAIPricing(): Promise<ScrapedModel[]> {
  const response = await fetch('https://platform.openai.com/docs/pricing#text-tokens');
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const models: ScrapedModel[] = [];
  
  // Find pricing table and parse rows
  $('table tr').each((i, row) => {
    const cols = $(row).find('td');
    if (cols.length < 3) return;
    
    const name = $(cols[0]).text().trim();
    const inputPrice = parseFloat($(cols[1]).text().replace(/[^0-9.]/g, ''));
    const outputPrice = parseFloat($(cols[2]).text().replace(/[^0-9.]/g, ''));
    
    models.push({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      provider: 'openai',
      inputPerMToken: inputPrice,
      outputPerMToken: outputPrice,
      supportsCache: false,
      isDeprecated: false
    });
  });
  
  return models;
}

async function scrapeClaudePricing(): Promise<ScrapedModel[]> {
  // Similar implementation for Claude pricing page
  // Parse cache pricing if available
}

async function generatePricingDataFile(models: ScrapedModel[]): Promise<void> {
  const content = `
// Auto-generated by scripts/scrape-pricing.ts
// Last updated: ${new Date().toISOString()}

export const LLM_PRICING = {
${models.map(m => `
  '${m.id}': {
    name: '${m.name}',
    provider: '${m.provider}',
    inputPerMToken: ${m.inputPerMToken},
    outputPerMToken: ${m.outputPerMToken},
    ${m.cacheWritePerMToken ? `cacheWritePerMToken: ${m.cacheWritePerMToken},` : ''}
    ${m.cacheReadPerMToken ? `cacheReadPerMToken: ${m.cacheReadPerMToken},` : ''}
    supportsCache: ${m.supportsCache},
    isDeprecated: ${m.isDeprecated}
  }`).join(',')}
};

export const PRICING_METADATA = {
  openai: {
    lastUpdated: '${new Date().toISOString().split('T')[0]}',
    source: 'https://platform.openai.com/docs/pricing#text-tokens'
  },
  anthropic: {
    lastUpdated: '${new Date().toISOString().split('T')[0]}',
    source: 'https://docs.claude.com/en/docs/about-claude/pricing#model-pricing'
  }
};
`;
  
  await fs.promises.writeFile('src/config/pricingData.ts', content, 'utf-8');
}

// Main execution
async function main() {
  console.log('Scraping OpenAI pricing...');
  const openaiModels = await scrapeOpenAIPricing();
  
  console.log('Scraping Claude pricing...');
  const claudeModels = await scrapeClaudePricing();
  
  const allModels = [...openaiModels, ...claudeModels];
  
  console.log(`Found ${allModels.length} models total`);
  console.log('Generating pricingData.ts...');
  
  await generatePricingDataFile(allModels);
  
  console.log('✅ Pricing data updated successfully');
}

main().catch(console.error);
```

## End of Specification

This specification provides a complete blueprint for implementing the prompt calculator feature. All requirements from the discovery phase have been incorporated with technical details, implementation phases, and risk mitigations.

**Next Steps**: 
1. User approval of this specification
2. Begin Phase 1: Pricing scraper implementation
3. Track progress with TodoWrite for each phase
