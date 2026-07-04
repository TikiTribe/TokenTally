/**
 * Comprehensive QA Test Execution Script
 *
 * Executes all 10 test scenarios programmatically and validates against
 * hand calculations with ±5% accuracy target.
 */

import { calculateChatbotCost, calculatePromptCost } from './src/utils/costCalculator';
import type { ChatbotConfig, PromptCalculatorConfig } from './src/types';

// Test result tracking
interface TestResult {
  testName: string;
  expected: number;
  actual: number;
  difference: number;
  percentDiff: number;
  passed: boolean;
  details?: any;
}

const results: TestResult[] = [];
const ACCURACY_THRESHOLD = 0.05; // ±5%

function validateResult(testName: string, expected: number, actual: number, details?: any): TestResult {
  const difference = Math.abs(actual - expected);
  const percentDiff = expected !== 0 ? (difference / expected) : 0;
  const passed = percentDiff <= ACCURACY_THRESHOLD;

  const result: TestResult = {
    testName,
    expected,
    actual,
    difference,
    percentDiff: percentDiff * 100,
    passed,
    details
  };

  results.push(result);
  return result;
}

console.log('='.repeat(80));
console.log('TokenTally QA Test Execution');
console.log('='.repeat(80));
console.log('');

// ============================================================================
// PART 1: CHATBOT CALCULATOR TESTS
// ============================================================================

console.log('PART 1: CHATBOT CALCULATOR TESTS');
console.log('-'.repeat(80));
console.log('');

// ----------------------------------------------------------------------------
// Test 1: Zero Conversations
// ----------------------------------------------------------------------------
console.log('Test 1: Zero Conversations');
try {
  const config: ChatbotConfig = {
    modelId: 'gpt-4o',
    systemPromptTokens: 1000,
    avgUserMessageTokens: 100,
    avgResponseTokens: 200,
    conversationTurns: 5,
    conversationsPerMonth: 0, // KEY: Zero conversations
    contextStrategy: 'moderate',
    cacheHitRate: 0.90
  };

  const result = calculateChatbotCost(config);
  const expected = 0.00;

  console.log(`  Expected: $${expected.toFixed(2)}`);
  console.log(`  Actual: $${result.monthlyCost.toFixed(2)}`);

  const testResult = validateResult('Test 1: Zero Conversations', expected, result.monthlyCost, result);
  console.log(`  Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 2: Single-Turn Conversation
// ----------------------------------------------------------------------------
console.log('Test 2: Single-Turn Conversation (Claude)');
try {
  const config: ChatbotConfig = {
    modelId: 'claude-3-5-sonnet-20241022',
    systemPromptTokens: 1000,
    avgUserMessageTokens: 100,
    avgResponseTokens: 200,
    conversationTurns: 1, // KEY: Single turn only
    conversationsPerMonth: 1000,
    contextStrategy: 'moderate',
    cacheHitRate: 0.90
  };

  const result = calculateChatbotCost(config);
  const expected = 10.05; // From manual calculation

  console.log(`  Expected: $${expected.toFixed(2)}`);
  console.log(`  Actual: $${result.monthlyCost.toFixed(2)}`);
  console.log(`  Cache Savings: $${result.breakdown.cacheSavings.toFixed(4)}`);
  console.log(`  Expected Cache Savings: $0.00 (no later turns)`);

  const testResult = validateResult('Test 2: Single-Turn', expected, result.monthlyCost, result);
  console.log(`  Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 3: High-Volume Caching (HAND VERIFICATION #1)
// ----------------------------------------------------------------------------
console.log('Test 3: High-Volume Caching (HAND VERIFICATION #1)');
try {
  const config: ChatbotConfig = {
    modelId: 'claude-3-5-sonnet-20241022',
    systemPromptTokens: 1000,
    avgUserMessageTokens: 100,
    avgResponseTokens: 200,
    conversationTurns: 10,
    conversationsPerMonth: 10000,
    contextStrategy: 'moderate', // 150 tokens/turn
    cacheHitRate: 0.90
  };

  const result = calculateChatbotCost(config);
  const expected = 631.05; // From detailed hand calculation

  console.log(`  Expected: $${expected.toFixed(2)}`);
  console.log(`  Actual: $${result.monthlyCost.toFixed(2)}`);
  console.log(`  Per-Conversation Expected: $0.063105`);
  console.log(`  Per-Conversation Actual: $${result.perConversationCost.toFixed(6)}`);
  console.log('');
  console.log('  Breakdown:');
  console.log(`    System Prompt Cost: $${result.breakdown.systemPromptCost.toFixed(5)}`);
  console.log(`    Cache Savings: $${result.breakdown.cacheSavings.toFixed(5)}`);
  console.log(`    Input Tokens Cost: $${result.breakdown.inputTokensCost.toFixed(5)}`);
  console.log(`    Output Tokens Cost: $${result.breakdown.outputTokensCost.toFixed(5)}`);
  console.log(`    Context Accumulation: $${result.breakdown.contextAccumulationCost.toFixed(5)}`);
  console.log('');
  console.log('  Expected Breakdown:');
  console.log(`    System Prompt Cost: $0.01218`);
  console.log(`    Cache Savings: -$0.02187`);
  console.log(`    Input Tokens Cost: $0.00300`);
  console.log(`    Output Tokens Cost: $0.03000`);
  console.log(`    Context Accumulation: $0.018225`);

  const testResult = validateResult('Test 3: High-Volume Caching', expected, result.monthlyCost, result);
  console.log('');
  console.log(`  Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Difference: $${testResult.difference.toFixed(2)} (${testResult.percentDiff.toFixed(2)}%)`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 4: Context Accumulation Comparison
// ----------------------------------------------------------------------------
console.log('Test 4: Context Accumulation Comparison');
try {
  const baseConfig = {
    modelId: 'gpt-4o-mini',
    systemPromptTokens: 500,
    avgUserMessageTokens: 100,
    avgResponseTokens: 200,
    conversationTurns: 10,
    conversationsPerMonth: 5000,
    cacheHitRate: 0.90
  };

  const minimalConfig: ChatbotConfig = {
    ...baseConfig,
    contextStrategy: 'minimal' // 50 tokens/turn
  };

  const fullConfig: ChatbotConfig = {
    ...baseConfig,
    contextStrategy: 'full' // 300 tokens/turn
  };

  const minimalResult = calculateChatbotCost(minimalConfig);
  const fullResult = calculateChatbotCost(fullConfig);

  const expectedMinimal = 12.02;
  const expectedFull = 19.61;

  console.log('  Minimal Strategy:');
  console.log(`    Expected: $${expectedMinimal.toFixed(2)}`);
  console.log(`    Actual: $${minimalResult.monthlyCost.toFixed(2)}`);

  console.log('');
  console.log('  Full Strategy:');
  console.log(`    Expected: $${expectedFull.toFixed(2)}`);
  console.log(`    Actual: $${fullResult.monthlyCost.toFixed(2)}`);

  const difference = fullResult.monthlyCost - minimalResult.monthlyCost;
  const percentIncrease = (difference / minimalResult.monthlyCost) * 100;

  console.log('');
  console.log(`  Difference: $${difference.toFixed(2)} (${percentIncrease.toFixed(1)}% increase)`);
  console.log(`  Expected Difference: $7.59 (63% increase)`);

  const minimalTest = validateResult('Test 4A: Minimal Strategy', expectedMinimal, minimalResult.monthlyCost);
  const fullTest = validateResult('Test 4B: Full Strategy', expectedFull, fullResult.monthlyCost);

  console.log('');
  console.log(`  Minimal Status: ${minimalTest.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Full Status: ${fullTest.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Full > Minimal: ${fullResult.monthlyCost > minimalResult.monthlyCost ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 5: Model Comparison (HAND VERIFICATION #2)
// ----------------------------------------------------------------------------
console.log('Test 5: Model Comparison (HAND VERIFICATION #2)');
try {
  const baseConfig = {
    systemPromptTokens: 1000,
    avgUserMessageTokens: 150,
    avgResponseTokens: 300,
    conversationTurns: 5,
    conversationsPerMonth: 5000,
    contextStrategy: 'moderate' as const,
    cacheHitRate: 0.90
  };

  const models = [
    { id: 'gpt-4o', expected: 286.25 },
    { id: 'gpt-4o-mini', expected: 9.71 },
    { id: 'gpt-3.5-turbo', expected: 28.63 },
    { id: 'claude-3-5-sonnet-20241022', expected: 386.90 },
    { id: 'claude-3-5-haiku-20241022', expected: 62.30 },
    { id: 'claude-3-haiku-20240307', expected: 15.60 }
  ];

  console.log('  Model Costs:');
  console.log('  ' + '-'.repeat(60));

  const modelResults: Array<{model: string, cost: number, expected: number}> = [];

  for (const model of models) {
    const config: ChatbotConfig = {
      ...baseConfig,
      modelId: model.id
    };

    const result = calculateChatbotCost(config);
    modelResults.push({
      model: model.id,
      cost: result.monthlyCost,
      expected: model.expected
    });

    const diff = Math.abs(result.monthlyCost - model.expected);
    const percentDiff = (diff / model.expected) * 100;
    const status = percentDiff <= 5 ? '✅' : '❌';

    console.log(`  ${status} ${model.id}`);
    console.log(`     Expected: $${model.expected.toFixed(2)}, Actual: $${result.monthlyCost.toFixed(2)}`);
    console.log(`     Difference: ${percentDiff.toFixed(2)}%`);

    validateResult(`Test 5: ${model.id}`, model.expected, result.monthlyCost);
  }

  // Find cheapest model
  const cheapest = modelResults.reduce((prev, curr) =>
    curr.cost < prev.cost ? curr : prev
  );

  console.log('');
  console.log(`  Cheapest Model: ${cheapest.model} at $${cheapest.cost.toFixed(2)}/month`);
  console.log(`  Expected: gpt-4o-mini at $9.71/month`);
  console.log(`  Status: ${cheapest.model === 'gpt-4o-mini' ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ============================================================================
// PART 2: PROMPT CALCULATOR TESTS
// ============================================================================

console.log('');
console.log('PART 2: PROMPT CALCULATOR TESTS');
console.log('-'.repeat(80));
console.log('');

// ----------------------------------------------------------------------------
// Test 6: Zero Batch Operations
// ----------------------------------------------------------------------------
console.log('Test 6: Zero Batch Operations');
try {
  const config: PromptCalculatorConfig = {
    modelId: 'gpt-4o',
    promptText: 'Analyze this customer feedback and provide sentiment score',
    responsePreset: 'medium',
    batchOperations: 0, // KEY: Zero operations
    multiTurnEnabled: false
  };

  const result = calculatePromptCost(config);
  const expected = 0.00;

  console.log(`  Expected: $${expected.toFixed(2)}`);
  console.log(`  Actual: $${result.monthlyCost.toFixed(2)}`);

  const testResult = validateResult('Test 6: Zero Batch Operations', expected, result.monthlyCost, result);
  console.log(`  Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 7: Single-Turn Prompt
// ----------------------------------------------------------------------------
console.log('Test 7: Single-Turn Prompt (No Multi-turn)');
try {
  const config: PromptCalculatorConfig = {
    modelId: 'claude-3-5-haiku-20241022',
    promptText: 'You are a helpful assistant. Translate the following English text to Spanish: Hello, how are you today?',
    responsePreset: 'short', // 200 tokens
    batchOperations: 10000,
    multiTurnEnabled: false // KEY: Single turn
  };

  const result = calculatePromptCost(config);
  const expected = 10.50;

  console.log(`  Input Tokens: ${result.inputTokens}`);
  console.log(`  Output Tokens: ${result.outputTokens}`);
  console.log(`  Expected: $${expected.toFixed(2)}`);
  console.log(`  Actual: $${result.monthlyCost.toFixed(2)}`);

  const testResult = validateResult('Test 7: Single-Turn Prompt', expected, result.monthlyCost, result);
  console.log(`  Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 8: Multi-Turn with Caching
// ----------------------------------------------------------------------------
console.log('Test 8: Multi-Turn with Caching (Claude)');
try {
  const config: PromptCalculatorConfig = {
    modelId: 'claude-3-5-sonnet-20241022',
    promptText: 'You are a customer service AI. You have access to order database and can help customers track orders, process returns, and answer product questions. Always be polite and professional.',
    responsePreset: 'medium', // 550 tokens
    batchOperations: 5000,
    multiTurnEnabled: true,
    turns: 5,
    contextStrategy: 'moderate',
    cacheHitRate: 90
  };

  const result = calculatePromptCost(config);
  const expected = 226.89;

  console.log(`  Input Tokens: ${result.inputTokens}`);
  console.log(`  Output Tokens: ${result.outputTokens}`);
  console.log(`  Expected: $${expected.toFixed(2)}`);
  console.log(`  Actual: $${result.monthlyCost.toFixed(2)}`);
  console.log(`  Cache Savings: $${result.cacheSavings ? (result.cacheSavings * 5000).toFixed(2) : '0.00'} (monthly)`);

  const testResult = validateResult('Test 8: Multi-Turn Caching', expected, result.monthlyCost, result);
  console.log(`  Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 9: Context Strategy Comparison (Prompt)
// ----------------------------------------------------------------------------
console.log('Test 9: Context Strategy Comparison (Prompt Calculator)');
try {
  const baseConfig = {
    modelId: 'gpt-3.5-turbo',
    promptText: 'Summarize this article',
    responsePreset: 'long' as const, // 1400 tokens
    batchOperations: 3000,
    multiTurnEnabled: true,
    turns: 8
  };

  const minimalConfig: PromptCalculatorConfig = {
    ...baseConfig,
    contextStrategy: 'minimal'
  };

  const fullConfig: PromptCalculatorConfig = {
    ...baseConfig,
    contextStrategy: 'full'
  };

  const minimalResult = calculatePromptCost(minimalConfig);
  const fullResult = calculatePromptCost(fullConfig);

  const expectedMinimal = 52.48;
  const expectedFull = 61.67;

  console.log('  Minimal Strategy:');
  console.log(`    Expected: $${expectedMinimal.toFixed(2)}`);
  console.log(`    Actual: $${minimalResult.monthlyCost.toFixed(2)}`);

  console.log('');
  console.log('  Full Strategy:');
  console.log(`    Expected: $${expectedFull.toFixed(2)}`);
  console.log(`    Actual: $${fullResult.monthlyCost.toFixed(2)}`);

  const difference = fullResult.monthlyCost - minimalResult.monthlyCost;
  const percentIncrease = (difference / minimalResult.monthlyCost) * 100;

  console.log('');
  console.log(`  Difference: $${difference.toFixed(2)} (${percentIncrease.toFixed(1)}% increase)`);
  console.log(`  Expected Difference: $9.19 (17.5% increase)`);

  const minimalTest = validateResult('Test 9A: Minimal Strategy', expectedMinimal, minimalResult.monthlyCost);
  const fullTest = validateResult('Test 9B: Full Strategy', expectedFull, fullResult.monthlyCost);

  console.log('');
  console.log(`  Minimal Status: ${minimalTest.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Full Status: ${fullTest.passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Full > Minimal: ${fullResult.monthlyCost > minimalResult.monthlyCost ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ----------------------------------------------------------------------------
// Test 10: Model Comparison (Prompt)
// ----------------------------------------------------------------------------
console.log('Test 10: Model Comparison (Prompt Calculator)');
try {
  const baseConfig = {
    promptText: 'You are a code reviewer. Review the following Python code for security vulnerabilities and best practices.',
    responsePreset: 'long' as const, // 1400 tokens
    batchOperations: 2000,
    multiTurnEnabled: false
  };

  const models = [
    { id: 'gpt-4o', expected: 42.60 },
    { id: 'gpt-4o-mini', expected: 1.70 },
    { id: 'gpt-3.5-turbo', expected: 4.26 },
    { id: 'claude-3-5-sonnet-20241022', expected: 42.36 },
    { id: 'claude-3-5-haiku-20241022', expected: 14.12 },
    { id: 'claude-3-haiku-20240307', expected: 3.53 }
  ];

  console.log('  Model Costs:');
  console.log('  ' + '-'.repeat(60));

  const modelResults: Array<{model: string, cost: number, expected: number}> = [];

  for (const model of models) {
    const config: PromptCalculatorConfig = {
      ...baseConfig,
      modelId: model.id
    };

    const result = calculatePromptCost(config);
    modelResults.push({
      model: model.id,
      cost: result.monthlyCost,
      expected: model.expected
    });

    const diff = Math.abs(result.monthlyCost - model.expected);
    const percentDiff = (diff / model.expected) * 100;
    const status = percentDiff <= 5 ? '✅' : '❌';

    console.log(`  ${status} ${model.id}`);
    console.log(`     Expected: $${model.expected.toFixed(2)}, Actual: $${result.monthlyCost.toFixed(2)}`);
    console.log(`     Difference: ${percentDiff.toFixed(2)}%`);

    validateResult(`Test 10: ${model.id}`, model.expected, result.monthlyCost);
  }

  // Find cheapest model
  const cheapest = modelResults.reduce((prev, curr) =>
    curr.cost < prev.cost ? curr : prev
  );

  console.log('');
  console.log(`  Cheapest Model: ${cheapest.model} at $${cheapest.cost.toFixed(2)}/month`);
  console.log(`  Expected: gpt-4o-mini at $1.70/month`);
  console.log(`  Status: ${cheapest.model === 'gpt-4o-mini' ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
} catch (error) {
  console.error('  ❌ ERROR:', error);
  console.log('');
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================

console.log('');
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log('');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`Total Tests: ${total}`);
console.log(`Passed: ${passed} ✅`);
console.log(`Failed: ${failed} ❌`);
console.log(`Pass Rate: ${((passed / total) * 100).toFixed(1)}%`);
console.log('');

if (failed > 0) {
  console.log('Failed Tests:');
  console.log('-'.repeat(80));
  results.filter(r => !r.passed).forEach(r => {
    console.log(`❌ ${r.testName}`);
    console.log(`   Expected: $${r.expected.toFixed(2)}`);
    console.log(`   Actual: $${r.actual.toFixed(2)}`);
    console.log(`   Difference: ${r.percentDiff.toFixed(2)}% (threshold: 5%)`);
    console.log('');
  });
}

console.log('');
console.log('Accuracy Assessment:');
const avgPercentDiff = results.reduce((sum, r) => sum + r.percentDiff, 0) / results.length;
console.log(`Average Difference: ${avgPercentDiff.toFixed(2)}%`);
console.log(`Accuracy Target: ±5%`);
console.log(`Status: ${avgPercentDiff <= 5 ? '✅ MEETS TARGET' : '❌ EXCEEDS TARGET'}`);
console.log('');

console.log('='.repeat(80));
console.log('TEST EXECUTION COMPLETE');
console.log('='.repeat(80));
