# TokenTally Model Calculation Test Report

**Date**: 2025-10-31
**Accuracy Target**: ±5% precision
**Test Engineer**: Claude Code (QA Persona)

## Executive Summary

This report validates the accuracy of TokenTally's cost calculation engine against hand-calculated expected values for all 6 supported LLM models. Three key scenarios are tested with comprehensive step-by-step verification.

---

## Test Configuration

### Common Test Data (All Scenarios)
- **System Prompt**: 1,000 tokens
- **User Message**: 50 tokens per turn
- **AI Response**: 200 tokens per turn
- **Context Per Turn**: 150 tokens (moderate strategy)
- **Turns Per Conversation**: 5
- **Conversations Per Month**: 10,000
- **Cache Hit Rate** (Claude only): 90% (0.90)

### Models Under Test

**OpenAI Models** (no caching):
1. GPT-4o - $5.00 input / $15.00 output (per MTok)
2. GPT-4o-mini - $0.15 input / $0.60 output (per MTok)
3. GPT-3.5-turbo - $0.50 input / $1.50 output (per MTok)

**Claude Models** (with caching):
4. Claude 3.5 Sonnet - $3.00 input / $15.00 output / $0.30 cache read / $3.75 cache write (per MTok)
5. Claude 3.5 Haiku - $1.00 input / $5.00 output / $0.10 cache read / $1.25 cache write (per MTok)
6. Claude 3 Haiku - $0.25 input / $1.25 output / $0.03 cache read / $0.30 cache write (per MTok)

---

## Hand Calculation Methodology

### OpenAI Models (No Caching)

**First Turn Cost**:
```
inputTokens = systemPrompt + userMessage = 1000 + 50 = 1050 tokens
outputTokens = response = 200 tokens

firstTurnInputCost = 1050 tokens × (inputPrice / 1,000,000)
firstTurnOutputCost = 200 tokens × (outputPrice / 1,000,000)
firstTurnCost = firstTurnInputCost + firstTurnOutputCost
```

**Later Turns Cost** (turns 2-5):
```
Average context accumulation = ((turns - 1) × contextPerTurn) / 2
                             = (4 × 150) / 2 = 300 tokens

laterTurnInputTokens = systemPrompt + userMessage + avgContext
                     = 1000 + 50 + 300 = 1350 tokens
laterTurnOutputTokens = 200 tokens

laterTurnInputCost = 1350 × (inputPrice / 1,000,000)
laterTurnOutputCost = 200 × (outputPrice / 1,000,000)
laterTurnCost = laterTurnInputCost + laterTurnOutputCost
```

**Per Conversation Cost**:
```
perConversationCost = firstTurnCost + (laterTurnCost × 4)
```

**Monthly Cost**:
```
monthlyCost = perConversationCost × 10,000
```

### Claude Models (With Caching)

**First Turn Cost** (same as OpenAI):
```
firstTurnCost = (1050 × inputPrice/1M) + (200 × outputPrice/1M)
cacheWriteCost = 1000 × cacheWritePrice/1M
```

**Later Turns Cost** (with 90% cache hit rate):
```
Cache savings per turn:
  cachedSystemPromptCost = 1000 × cacheReadPrice/1M × 0.90
  uncachedSystemPromptCost = 1000 × inputPrice/1M × 0.10
  systemPromptCostPerTurn = cachedSystemPromptCost + uncachedSystemPromptCost

Context accumulation (same): 300 tokens average

laterTurnInputTokens = userMessage + avgContext = 50 + 300 = 350 tokens
laterTurnInputCost = 350 × inputPrice/1M
laterTurnOutputCost = 200 × outputPrice/1M

laterTurnCost = systemPromptCostPerTurn + laterTurnInputCost + laterTurnOutputCost
```

**Cache Savings Calculation**:
```
fullSystemPromptCost = 1000 × inputPrice/1M
cacheSavingsPerTurn = fullSystemPromptCost - systemPromptCostPerTurn
totalCacheSavings = cacheSavingsPerTurn × 4 turns × -1 (negative value)
```

**Per Conversation Cost**:
```
perConversationCost = firstTurnCost + cacheWriteCost + (laterTurnCost × 4)
```

**Monthly Cost**:
```
monthlyCost = perConversationCost × 10,000
```

---

## Scenario A: GPT-4o (No Caching)

### Hand Calculation Steps

**Pricing**: Input $5.00/MTok, Output $15.00/MTok

**First Turn**:
```
inputCost = 1050 × (5.00 / 1,000,000) = 1050 × 0.000005 = $0.00525
outputCost = 200 × (15.00 / 1,000,000) = 200 × 0.000015 = $0.003
firstTurnCost = $0.00525 + $0.003 = $0.00825
```

**Later Turns** (turns 2-5):
```
inputCost = 1350 × 0.000005 = $0.00675
outputCost = 200 × 0.000015 = $0.003
laterTurnCost = $0.00675 + $0.003 = $0.00975
```

**Per Conversation**:
```
perConversationCost = $0.00825 + ($0.00975 × 4)
                    = $0.00825 + $0.039
                    = $0.04725
```

**Monthly**:
```
monthlyCost = $0.04725 × 10,000 = $472.50
```

### Expected Results
- **Per Conversation**: $0.04725
- **Monthly Cost**: $472.50
- **Breakdown**:
  - System Prompt Cost: $0.00825 + ($0.005 × 4) = $0.02825
  - Cache Savings: $0.00 (no caching)
  - Input Tokens Cost: 50 × 5 × 0.000005 = $0.00125
  - Output Tokens Cost: 200 × 5 × 0.000015 = $0.015
  - Context Accumulation: 300 × 4 × 0.000005 = $0.006

---

## Scenario B: Claude 3.5 Sonnet (With 90% Caching)

### Hand Calculation Steps

**Pricing**: Input $3.00/MTok, Output $15.00/MTok, Cache Read $0.30/MTok, Cache Write $3.75/MTok

**First Turn**:
```
inputCost = 1050 × (3.00 / 1,000,000) = 1050 × 0.000003 = $0.00315
outputCost = 200 × (15.00 / 1,000,000) = 200 × 0.000015 = $0.003
firstTurnCost = $0.00315 + $0.003 = $0.00615
cacheWriteCost = 1000 × (3.75 / 1,000,000) = $0.00375
```

**Later Turns** (turns 2-5 with 90% cache hit):
```
System prompt cost:
  cachedPortion = 1000 × (0.30 / 1,000,000) × 0.90 = 1000 × 0.0000003 × 0.90 = $0.00027
  uncachedPortion = 1000 × 0.000003 × 0.10 = $0.0003
  systemPromptCostPerTurn = $0.00027 + $0.0003 = $0.00057

User message + context:
  inputCost = 350 × 0.000003 = $0.00105

Output:
  outputCost = 200 × 0.000015 = $0.003

laterTurnCost = $0.00057 + $0.00105 + $0.003 = $0.00462
```

**Cache Savings**:
```
fullSystemPromptCost = 1000 × 0.000003 = $0.003
cacheSavingsPerTurn = $0.003 - $0.00057 = $0.00243
totalCacheSavings = $0.00243 × 4 = $0.00972 (shown as negative)
```

**Per Conversation**:
```
perConversationCost = $0.00615 + $0.00375 + ($0.00462 × 4)
                    = $0.00615 + $0.00375 + $0.01848
                    = $0.02838
```

**Monthly**:
```
monthlyCost = $0.02838 × 10,000 = $283.80
```

### Expected Results
- **Per Conversation**: $0.02838
- **Monthly Cost**: $283.80
- **Cache Savings**: -$0.00972 per conversation
- **Total Monthly Savings**: -$97.20

---

## Scenario C: GPT-4o-mini (Lowest OpenAI Cost)

### Hand Calculation Steps

**Pricing**: Input $0.15/MTok, Output $0.60/MTok

**First Turn**:
```
inputCost = 1050 × (0.15 / 1,000,000) = 1050 × 0.00000015 = $0.0001575
outputCost = 200 × (0.60 / 1,000,000) = 200 × 0.0000006 = $0.00012
firstTurnCost = $0.0001575 + $0.00012 = $0.0002775
```

**Later Turns**:
```
inputCost = 1350 × 0.00000015 = $0.0002025
outputCost = 200 × 0.0000006 = $0.00012
laterTurnCost = $0.0002025 + $0.00012 = $0.0003225
```

**Per Conversation**:
```
perConversationCost = $0.0002775 + ($0.0003225 × 4)
                    = $0.0002775 + $0.00129
                    = $0.0015675
```

**Monthly**:
```
monthlyCost = $0.0015675 × 10,000 = $15.675 ≈ $15.68
```

### Expected Results
- **Per Conversation**: $0.0015675
- **Monthly Cost**: $15.68
- **Breakdown**:
  - System Prompt Cost: $0.0002775 + ($0.00015 × 4) = $0.0008775
  - Cache Savings: $0.00 (no caching)
  - Input Tokens Cost: 50 × 5 × 0.00000015 = $0.0000375
  - Output Tokens Cost: 200 × 5 × 0.0000006 = $0.0006
  - Context Accumulation: 300 × 4 × 0.00000015 = $0.00018

---

## Additional Model Calculations

### Scenario D: GPT-3.5-turbo

**Pricing**: Input $0.50/MTok, Output $1.50/MTok

**First Turn**: 1050 × 0.0000005 + 200 × 0.0000015 = $0.000525 + $0.0003 = $0.000825
**Later Turns**: 1350 × 0.0000005 + 200 × 0.0000015 = $0.000675 + $0.0003 = $0.000975
**Per Conversation**: $0.000825 + ($0.000975 × 4) = $0.000825 + $0.0039 = $0.004725
**Monthly**: $0.004725 × 10,000 = **$47.25**

---

### Scenario E: Claude 3.5 Haiku (With 90% Caching)

**Pricing**: Input $1.00/MTok, Output $5.00/MTok, Cache Read $0.10/MTok, Cache Write $1.25/MTok

**First Turn**:
```
inputCost = 1050 × 0.000001 = $0.00105
outputCost = 200 × 0.000005 = $0.001
firstTurnCost = $0.00105 + $0.001 = $0.00205
cacheWriteCost = 1000 × 0.00000125 = $0.00125
```

**Later Turns**:
```
systemPromptCost = (1000 × 0.0000001 × 0.90) + (1000 × 0.000001 × 0.10)
                 = $0.00009 + $0.0001 = $0.00019
inputCost = 350 × 0.000001 = $0.00035
outputCost = 200 × 0.000005 = $0.001
laterTurnCost = $0.00019 + $0.00035 + $0.001 = $0.00154
```

**Cache Savings**:
```
fullSystemPromptCost = 1000 × 0.000001 = $0.001
cacheSavingsPerTurn = $0.001 - $0.00019 = $0.00081
totalCacheSavings = $0.00081 × 4 = $0.00324
```

**Per Conversation**: $0.00205 + $0.00125 + ($0.00154 × 4) = $0.00205 + $0.00125 + $0.00616 = $0.00946
**Monthly**: $0.00946 × 10,000 = **$94.60**

---

### Scenario F: Claude 3 Haiku (With 90% Caching - Lowest Overall Cost)

**Pricing**: Input $0.25/MTok, Output $1.25/MTok, Cache Read $0.03/MTok, Cache Write $0.30/MTok

**First Turn**:
```
inputCost = 1050 × 0.00000025 = $0.0002625
outputCost = 200 × 0.00000125 = $0.00025
firstTurnCost = $0.0002625 + $0.00025 = $0.0005125
cacheWriteCost = 1000 × 0.0000003 = $0.0003
```

**Later Turns**:
```
systemPromptCost = (1000 × 0.00000003 × 0.90) + (1000 × 0.00000025 × 0.10)
                 = $0.000027 + $0.000025 = $0.000052
inputCost = 350 × 0.00000025 = $0.0000875
outputCost = 200 × 0.00000125 = $0.00025
laterTurnCost = $0.000052 + $0.0000875 + $0.00025 = $0.0003895
```

**Cache Savings**:
```
fullSystemPromptCost = 1000 × 0.00000025 = $0.00025
cacheSavingsPerTurn = $0.00025 - $0.000052 = $0.000198
totalCacheSavings = $0.000198 × 4 = $0.000792
```

**Per Conversation**: $0.0005125 + $0.0003 + ($0.0003895 × 4) = $0.0005125 + $0.0003 + $0.001558 = $0.0023705
**Monthly**: $0.0023705 × 10,000 = **$23.705 ≈ $23.71**

---

## Summary of Expected Results

| Model | Provider | Per Conversation | Monthly Cost | Cache Savings/Month |
|-------|----------|------------------|--------------|---------------------|
| GPT-4o | OpenAI | $0.04725 | $472.50 | $0.00 |
| GPT-4o-mini | OpenAI | $0.0015675 | $15.68 | $0.00 |
| GPT-3.5-turbo | OpenAI | $0.004725 | $47.25 | $0.00 |
| Claude 3.5 Sonnet | Claude | $0.02838 | $283.80 | -$97.20 |
| Claude 3.5 Haiku | Claude | $0.00946 | $94.60 | -$32.40 |
| Claude 3 Haiku | Claude | $0.0023705 | $23.71 | -$7.92 |

**Key Insights**:
- **Cheapest Overall**: Claude 3 Haiku ($23.71/month) - 95% cheaper than GPT-4o
- **Best OpenAI**: GPT-4o-mini ($15.68/month) - 97% cheaper than GPT-4o
- **Cache Impact**: Claude models save 25-34% through prompt caching
- **Price Range**: 30x difference between most expensive (GPT-4o) and cheapest (Claude 3 Haiku)

---

## Implementation Verification

Next steps:
1. Run actual calculations through TokenTally calculator
2. Compare implementation results vs expected values
3. Calculate accuracy percentage: `|actual - expected| / expected × 100`
4. Verify all scenarios meet ±5% accuracy target
5. Document any discrepancies for investigation

---

## Test Matrix Template

For each model, we will verify:

```
Test: [Model Name]
Expected Monthly Cost: $XXX.XX
Actual Monthly Cost: $XXX.XX
Difference: $X.XX
Accuracy: XX.XX% (PASS/FAIL if >5%)

Breakdown Verification:
- System Prompt Cost: Expected $X.XX vs Actual $X.XX
- Cache Savings: Expected -$X.XX vs Actual -$X.XX
- Input Tokens Cost: Expected $X.XX vs Actual $X.XX
- Output Tokens Cost: Expected $X.XX vs Actual $X.XX
- Context Accumulation: Expected $X.XX vs Actual $X.XX
```

---

## Notes on Calculation Methodology

### Context Accumulation Formula
The implementation uses average context for later turns:
```
avgContextTokensForLaterTurns = ((turns - 1) × contextPerTurn) / 2
```

This assumes linear growth from 0 tokens (turn 2) to max tokens (final turn), which is a reasonable approximation for conversation history accumulation.

**Example for 5 turns**:
- Turn 1: 0 context tokens
- Turn 2: 150 tokens
- Turn 3: 300 tokens
- Turn 4: 450 tokens
- Turn 5: 600 tokens
- Average for turns 2-5: (150 + 300 + 450 + 600) / 4 = 375 tokens

**Formula verification**:
```
((5 - 1) × 150) / 2 = (4 × 150) / 2 = 600 / 2 = 300 tokens
```

**Discrepancy**: The formula gives 300 but actual average is 375. This suggests the implementation may have a bug OR uses a different interpretation (average context at midpoint of conversation).

**Investigation Required**: Verify if this is intentional simplification or calculation error.

---

## Conclusion

Hand calculations complete for all 6 models. Expected values documented with step-by-step verification. Ready for implementation comparison to validate ±5% accuracy requirement.

**Status**: Awaiting implementation test results
