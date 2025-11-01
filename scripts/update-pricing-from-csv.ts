#!/usr/bin/env node
/**
 * CSV Pricing Update Utility
 *
 * Processes data/pricing-update.csv and updates src/config/pricingData.ts
 * with comprehensive validation and error reporting.
 *
 * Usage: npm run update-pricing
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { parseCSVFile } from './parsers/csvParser.js';
import { businessRuleValidators } from './validators/csvValidator.js';
import { transformAllRows } from './transformers/dataTransformer.js';
import { generatePricingFileContent } from './utils/pricingHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'data', 'pricing-update.csv');
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'config', 'pricingData.ts');

interface ExecutionResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  executionTimeMs: number;
}

async function main(): Promise<ExecutionResult> {
  const startTime = Date.now();

  console.log('🚀 CSV Pricing Update Utility');
  console.log('━'.repeat(60));
  console.log(`📄 Input:  ${CSV_PATH}`);
  console.log(`📝 Output: ${OUTPUT_PATH}`);
  console.log('━'.repeat(60));

  // Step 1: Parse CSV file
  console.log('\n📋 Step 1: Parsing CSV file...');
  const parseResult = await parseCSVFile(CSV_PATH);

  if (parseResult.errors.length > 0) {
    console.error('\n❌ Parsing Errors:');
    for (const error of parseResult.errors) {
      console.error(`   Row ${error.rowNumber}, ${error.field}: ${error.error}`);
      console.error(`   Value: "${error.value}"`);
    }
  }

  if (parseResult.warnings.length > 0) {
    console.warn('\n⚠️  Parsing Warnings:');
    for (const warning of parseResult.warnings) {
      console.warn(`   Row ${warning.rowNumber}, ${warning.field}: ${warning.error}`);
      console.warn(`   Value: "${warning.value}"`);
    }
  }

  if (parseResult.errors.length > 0) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Validation failed with ${parseResult.errors.length} error(s)`);
    console.error(`⏱️  Execution time: ${elapsed}ms`);
    return {
      success: false,
      totalRows: parseResult.rows.length + parseResult.errors.length,
      validRows: parseResult.rows.length,
      errorCount: parseResult.errors.length,
      warningCount: parseResult.warnings.length,
      executionTimeMs: elapsed
    };
  }

  console.log(`✅ Parsed ${parseResult.rows.length} row(s) successfully`);

  // Step 2: Business rule validation
  console.log('\n🔍 Step 2: Validating business rules...');
  const businessErrors: Array<{rowNumber: number; field: string; value: string; error: string; severity: 'error' | 'warning'}> = [];
  const businessWarnings: Array<{rowNumber: number; field: string; value: string; error: string; severity: 'error' | 'warning'}> = [];

  const businessValidationResults = await Promise.all([
    Promise.resolve(businessRuleValidators.uniqueModelIds(parseResult.rows)),
    Promise.resolve(businessRuleValidators.cacheConsistency(parseResult.rows)),
    Promise.resolve(businessRuleValidators.priceReasonability(parseResult.rows)),
    Promise.resolve(businessRuleValidators.providerConsistency(parseResult.rows))
  ]);

  for (const results of businessValidationResults) {
    for (const result of results) {
      if (result.severity === 'error') {
        businessErrors.push(result);
      } else {
        businessWarnings.push(result);
      }
    }
  }

  if (businessErrors.length > 0) {
    console.error('\n❌ Business Rule Errors:');
    for (const error of businessErrors) {
      console.error(`   Row ${error.rowNumber}, ${error.field}: ${error.error}`);
      console.error(`   Value: "${error.value}"`);
    }
  }

  if (businessWarnings.length > 0) {
    console.warn('\n⚠️  Business Rule Warnings:');
    for (const warning of businessWarnings) {
      console.warn(`   Row ${warning.rowNumber}, ${warning.field}: ${warning.error}`);
      console.warn(`   Value: "${warning.value}"`);
    }
  }

  if (businessErrors.length > 0) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ Business rule validation failed with ${businessErrors.length} error(s)`);
    console.error(`⏱️  Execution time: ${elapsed}ms`);
    return {
      success: false,
      totalRows: parseResult.rows.length,
      validRows: 0,
      errorCount: businessErrors.length,
      warningCount: businessWarnings.length,
      executionTimeMs: elapsed
    };
  }

  console.log(`✅ All business rules passed`);

  // Step 3: Transform data
  console.log('\n🔄 Step 3: Transforming data...');
  const scrapedModels = transformAllRows(parseResult.rows);
  console.log(`✅ Transformed ${scrapedModels.length} model(s)`);

  // Step 4: Generate TypeScript file
  console.log('\n📝 Step 4: Generating pricingData.ts...');
  const fileContent = generatePricingFileContent(scrapedModels);

  // Write file atomically (write to temp, then rename)
  const tempPath = `${OUTPUT_PATH}.tmp`;
  fs.writeFileSync(tempPath, fileContent, 'utf-8');
  fs.renameSync(tempPath, OUTPUT_PATH);

  console.log(`✅ Successfully wrote ${OUTPUT_PATH}`);

  // Summary
  const elapsed = Date.now() - startTime;
  console.log('\n' + '━'.repeat(60));
  console.log('✅ SUCCESS');
  console.log('━'.repeat(60));
  console.log(`📊 Total rows processed: ${parseResult.rows.length}`);
  console.log(`   - OpenAI models: ${scrapedModels.filter(m => m.provider === 'openai').length}`);
  console.log(`   - Claude models: ${scrapedModels.filter(m => m.provider === 'anthropic').length}`);
  console.log(`   - Deprecated: ${scrapedModels.filter(m => m.isDeprecated).length}`);
  console.log(`   - With caching: ${scrapedModels.filter(m => m.supportsCache).length}`);

  if (parseResult.warnings.length + businessWarnings.length > 0) {
    console.log(`⚠️  Total warnings: ${parseResult.warnings.length + businessWarnings.length}`);
  }

  console.log(`⏱️  Execution time: ${elapsed}ms`);
  console.log('━'.repeat(60));

  return {
    success: true,
    totalRows: parseResult.rows.length,
    validRows: parseResult.rows.length,
    errorCount: 0,
    warningCount: parseResult.warnings.length + businessWarnings.length,
    executionTimeMs: elapsed
  };
}

main()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Unexpected error:', error);
    process.exit(1);
  });
