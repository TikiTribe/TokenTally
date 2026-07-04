# TokenTally Pricing CSV Implementation Session

**Date**: 2025-11-01  
**Focus**: CSV-based manual pricing update system design and implementation  
**Status**: In Progress - User creating pricing-update.csv

## Session Summary

### Context
User requested validation that `scripts/scrape-pricing.ts` can automatically update pricing data. Comprehensive analysis revealed:
- OpenAI pricing page: **IMPOSSIBLE** to scrape (Cloudflare protection, 403 errors)
- Claude pricing page: **POSSIBLE** but fragile (client-side rendering, unstable selectors)
- Current implementation: Hardcoded models (correct approach for MVP)
- Manual quarterly updates are most reliable strategy

### User Decision: CSV-Based Manual Update System

**Rationale**: 
- Web scraping infeasible for OpenAI (Cloudflare)
- Web scraping fragile for Claude (client-side rendering)
- Manual updates more reliable than automated scraping
- CSV provides non-technical-friendly workflow

**CSV Schema Designed** (Minimal, 8 columns):
```csv
model_id,provider,input_price,output_price,cache_write_price,cache_read_price,supports_cache,is_deprecated
gpt-4o,openai,5.00,15.00,,,false,false
claude-3-5-sonnet-20241022,anthropic,3.00,15.00,3.75,0.30,true,false
```

**Key Design Decisions**:
- NO human-readable model name in CSV (auto-derived from model_id)
- NO optional fields (release_date, notes, etc.)
- 8 columns only: model_id, provider, 4 price fields, 2 boolean flags
- Blank cells for cache pricing on OpenAI models

## Completed Work

### Phase 1: Helper Function Extraction ✅
- Created `scripts/utils/pricingHelpers.ts` (150 lines)
- Extracted functions:
  - `sanitizeForCSV()` - CSV formula injection prevention
  - `formatCSVRow()` - CSV formatting with quoting
  - `groupModelsByProvider()` - Provider grouping
  - `generatePricingFileContent()` - TypeScript code generation
- Updated `scripts/scrape-pricing.ts` to use new utilities
- Net reduction: 72 lines (-22%)
- Scraper tested and validated ✅

### Phase 2: Scraping Feasibility Analysis ✅
**OpenAI Platform Pricing** (https://platform.openai.com/docs/pricing):
- Status: ❌ **IMPOSSIBLE** to scrape
- Cloudflare protection returns 403 Forbidden
- Bot detection prevents all automated access
- Workarounds (Playwright stealth) violate terms of service
- Verdict: Manual updates ONLY

**Claude Documentation Pricing** (https://docs.anthropic.com/pricing):
- Status: ⚠️ **POSSIBLE** but fragile
- Client-side rendered (requires Playwright, not cheerio)
- No semantic data attributes (class-based selectors break easily)
- HTML structure changes break scraper
- Verdict: Playwright optional, maintain hardcoded fallback

### Phase 3: CSV Schema Design ✅
**Minimal Schema** (per user requirements):
- 8 required columns (no optional fields)
- Model name auto-derived from model_id using transformation rules
- Cache pricing fields optional (blank for OpenAI)
- Boolean values: lowercase `true`/`false`

**Design Trade-offs**:
- Model Name Derivation: Auto-generate from model_id (no CSV column)
  - `gpt-4o` → `GPT-4o`
  - `claude-3-5-sonnet-20241022` → `Claude 3.5 Sonnet`
- Release Date: Removed (not in minimal CSV)
- Notes: Removed (not in minimal CSV)

## In-Progress Work

### Current Task: User Creating pricing-update.csv
**Status**: User has created `pricing-update.csv` file  
**Format**: Similar to minimal schema template  
**Next Step**: Review user's CSV content and implement update utility

### Pending Implementation

**File 1**: `scripts/update-pricing-from-csv.ts`
- CSV parser with validation
- Model name derivation logic
- Integration with `generatePricingFileContent()`
- Error handling and reporting
- Estimated: 100-150 lines

**File 2**: `pricing-update.csv.template`
- Template with 8-column minimal schema
- Example rows for OpenAI and Claude models
- Comments/documentation header

**Package Updates**:
- Add `csv-parse` dependency: `npm install -D csv-parse`
- Add npm script: `"update-pricing": "tsx scripts/update-pricing-from-csv.ts"`

## Technical Decisions

### Model Name Derivation Strategy
**Chosen Approach**: Auto-derive from model_id

**OpenAI Transformation**:
```typescript
'gpt-4o' → 'GPT-4o'
'gpt-4o-mini' → 'GPT-4o-mini'
'gpt-3.5-turbo' → 'GPT-3.5 Turbo'
```

**Claude Transformation**:
```typescript
'claude-3-5-sonnet-20241022' → 'Claude 3.5 Sonnet'
'claude-3-5-haiku-20241022' → 'Claude 3.5 Haiku'
'claude-3-haiku-20240307' → 'Claude 3 Haiku'
```

**Implementation**:
```typescript
function deriveModelName(modelId: string, provider: string): string {
  if (provider === 'openai') {
    return modelId
      .replace('gpt-', 'GPT-')
      .replace('turbo', 'Turbo')
      .replace(/-/g, ' ')
      .trim();
  } else {
    return modelId
      .replace(/claude-(\d)-(\d)-/, 'Claude $1.$2 ')
      .replace(/claude-(\d)-/, 'Claude $1 ')
      .replace(/-\d{8}$/, '') // Remove date suffix
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}
```

### Validation Rules
**Required Validations**:
1. Model ID: Non-empty, unique across CSV
2. Provider: Must be exactly "openai" or "anthropic"
3. Input Price: Positive decimal number
4. Output Price: Positive decimal number
5. Supports Cache: Lowercase "true" or "false"
6. Is Deprecated: Lowercase "true" or "false"
7. Cache Pricing: Required for Claude if supports_cache=true

**Error Reporting**:
- Row number (1-indexed, accounting for header)
- Field name
- Error message
- Fail fast on validation errors (don't generate if invalid)

## Next Steps

1. **Review User's CSV** - Examine `pricing-update.csv` content
2. **Implement Update Utility** - Create `scripts/update-pricing-from-csv.ts`
3. **Add CSV Template** - Create `pricing-update.csv.template`
4. **Update Package.json** - Add script and dependency
5. **Test End-to-End** - Run utility, verify generated `pricingData.ts`
6. **Documentation** - Optional: Create usage guide

## File Artifacts

### Created This Session
- `scripts/utils/pricingHelpers.ts` (150 lines)
- User creating: `pricing-update.csv`

### Modified This Session
- `scripts/scrape-pricing.ts` (reduced from 330 to 258 lines)

### Pending Creation
- `scripts/update-pricing-from-csv.ts`
- `pricing-update.csv.template`

## Key Learnings

1. **Web Scraping Limitations**: Cloudflare and client-side rendering make automated pricing scraping infeasible
2. **Manual Updates Superior**: For quarterly pricing updates, manual CSV editing is faster and more reliable than fragile scraping
3. **CSV Workflow Benefits**: Non-technical users can update pricing in Excel/Google Sheets
4. **Minimal Schema Wins**: 8 columns sufficient, auto-derivation reduces human error
5. **Security Compliance**: CSV sanitization already implemented in `csvExporter.ts` and `pricingHelpers.ts`

## Context for Next Session

**Immediate Task**: Implement `scripts/update-pricing-from-csv.ts` utility

**User Expectation**: Simple workflow:
1. Edit `pricing-update.csv` in spreadsheet software
2. Run `npm run update-pricing`
3. Verify generated `src/config/pricingData.ts`
4. Commit changes

**Critical Requirements**:
- Minimal CSV schema (8 columns, no optional fields)
- Auto-derive model names from model_id
- Validate all data before generation
- Use existing `generatePricingFileContent()` from pricingHelpers.ts
- Clear error messages for validation failures
