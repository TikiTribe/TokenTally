// Exact-badge gate (I7/B1): a family+encoding earns Exact only when its local tokenizer reproduces
// captured provider `usage` counts within tolerance across every case. `count(modelId, text)` is the
// caller's request-level counter (content + role-aware wrapper). A single out-of-tolerance case fails
// the whole set, and an empty set never passes (nothing was verified).
//
// This harness validates the MECHANICS. A real promotion (markFamilyExact) must be driven by cases
// carrying real capture provenance (SpotCheckCase.capturedAt/endpoint/apiModelSnapshot/rawUsage);
// numbers must NEVER be edited toward the tool's own output — reconcile only by re-capturing from the
// API or fixing the wrapper constants.
import type { SpotCheckCase, SpotCheckResult } from '@/types/tokenizer';

export function spotCheckFamily(
  cases: readonly SpotCheckCase[],
  count: (modelId: string, text: string) => number,
  tolerance: number,
): SpotCheckResult {
  const results = cases.map((c) => {
    const actual = count(c.modelId, c.text);
    const relError =
      c.expectedTokens === 0
        ? actual === 0
          ? 0
          : 1
        : Math.abs(actual - c.expectedTokens) / c.expectedTokens;
    return { modelId: c.modelId, actual, expected: c.expectedTokens, relError, ok: relError <= tolerance };
  });
  return { passed: cases.length > 0 && results.every((r) => r.ok), cases: results };
}
