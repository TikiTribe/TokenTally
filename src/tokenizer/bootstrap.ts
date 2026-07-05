// The single tokenizer registration seam the Phase 2 worker imports (B13). Registers the adapters
// available in this build: tiktoken now; the Transformers.js adapter is registered HERE in Phase 0D.
// Exact promotion is deliberately NOT done here in 0B - it requires a real, provenance-carrying
// spot-check fixture captured out-of-band with the owner's API key (B1), so OpenAI stays
// exact_unverified until that capture lands. This keeps the badge honest and prevents a
// never-registered / never-promoted dead-code failure.
import { registerAdapter } from '@/tokenizer';
import { tiktokenAdapter } from '@/tokenizer/tiktokenAdapter';

export function bootstrapTokenizer(): void {
  registerAdapter(tiktokenAdapter);
}
