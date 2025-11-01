/**
 * Test script to verify TokenTally calculation accuracy
 *
 * Run with: npx tsx test-calculations.ts
 */

import { calculateChatbotCost } from './src/utils/costCalculator';
import type { ChatbotConfig } from './src/types';

// Test configuration
const baseConfig: ChatbotConfig = {
  modelId: '', // Will be set per test
  systemPromptTokens: 1000,
  avgUserMessageTokens: 50,
  avgResponseTokens: 200,
  conversationTurns: 5,
  conversationsPerMonth: 10000,
  contextStrategy: 'moderate', // 150 tokens per turn
  cacheHitRate: 0.90,
};

// Expected results from hand calculations
const expectedResults = {
  'gpt-4o': {
    perConversation: 0.04725,
    monthlyCost: 472.50,
  },
  'gpt-4o-mini': {
    perConversation: 0.0015675,
    monthlyCost: 15.675,
  },
  'gpt-3.5-turbo': {
    perConversation: 0.004725,
    monthlyCost: 47.25,
  },
  'claude-3-5-sonnet': {
    perConversation: 0.02838,
    monthlyCost: 283.80,
  },
  'claude-3-5-haiku': {
    perConversation: 0.00946,
    monthlyCost: 94.60,
  },
  'claude-3-haiku': {
    perConversation: 0.0023705,
    monthlyCost: 23.705,
  },
};

console.log('='.repeat(80));
console.log('TokenTally Calculation Accuracy Test');
console.log('Target: ±5% accuracy');
console.log('='.repeat(80));
console.log();

// Test each model
const modelIds = Object.keys(expectedResults);
const results: Array<{
  model: string;
  expected: number;
  actual: number;
  difference: number;
  accuracy: number;
  pass: boolean;
}> = [];

modelIds.forEach((modelId) => {
  const config = { ...baseConfig, modelId };
  const result = calculateChatbotCost(config);
  const expected = expectedResults[modelId as keyof typeof expectedResults];

  const difference = result.monthlyCost - expected.monthlyCost;
  const accuracy = Math.abs(difference) / expected.monthlyCost * 100;
  const pass = accuracy <= 5.0;

  results.push({
    model: result.model,
    expected: expected.monthlyCost,
    actual: result.monthlyCost,
    difference,
    accuracy,
    pass,
  });

  console.log(`Model: ${result.model}`);
  console.log(`  Expected Monthly Cost: $${expected.monthlyCost.toFixed(2)}`);
  console.log(`  Actual Monthly Cost:   $${result.monthlyCost.toFixed(2)}`);
  console.log(`  Difference:            $${difference.toFixed(4)}`);
  console.log(`  Accuracy:              ${accuracy.toFixed(2)}%`);
  console.log(`  Status:                ${pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log();

  // Detailed breakdown
  console.log('  Breakdown:');
  console.log(`    System Prompt Cost:     $${result.breakdown.systemPromptCost.toFixed(6)}`);
  console.log(`    Cache Savings:          $${result.breakdown.cacheSavings.toFixed(6)}`);
  console.log(`    Input Tokens Cost:      $${result.breakdown.inputTokensCost.toFixed(6)}`);
  console.log(`    Output Tokens Cost:     $${result.breakdown.outputTokensCost.toFixed(6)}`);
  console.log(`    Context Accumulation:   $${result.breakdown.contextAccumulationCost.toFixed(6)}`);
  console.log();

  console.log('  Assumptions:');
  console.log(`    Cache Hit Rate:         ${result.assumptions.cacheHitRate}`);
  console.log(`    Context Strategy:       ${result.assumptions.contextStrategy}`);
  console.log(`    Avg Tokens Per Turn:    ${result.assumptions.avgTokensPerTurn}`);
  console.log(`    First Turn Cost:        $${result.assumptions.firstTurnCost.toFixed(6)}`);
  console.log(`    Later Turn Cost:        $${result.assumptions.laterTurnCost.toFixed(6)}`);
  console.log();
  console.log('-'.repeat(80));
  console.log();
});

// Summary
console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log();

const passCount = results.filter(r => r.pass).length;
const failCount = results.length - passCount;

console.log(`Total Tests: ${results.length}`);
console.log(`Passed: ${passCount} ✅`);
console.log(`Failed: ${failCount} ${failCount > 0 ? '❌' : ''}`);
console.log();

if (failCount === 0) {
  console.log('🎉 ALL TESTS PASSED - ±5% accuracy requirement met for all models!');
} else {
  console.log('⚠️  SOME TESTS FAILED - Investigation required:');
  console.log();
  results.filter(r => !r.pass).forEach(r => {
    console.log(`  ${r.model}: ${r.accuracy.toFixed(2)}% error (limit: 5%)`);
  });
}

console.log();
console.log('='.repeat(80));
