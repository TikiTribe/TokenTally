// OpenAI chat-format wrapper overhead (B6). Per the OpenAI token-counting cookbook, each message
// costs a fixed structural wrapper PLUS the encoded role token(s) (`user` = 1, etc.), and the reply
// is primed once. The plan's earlier flat `3n + 3` omitted the per-message role token and so
// under-counted by ~1 token/message on a count labeled Exact; this includes it.
//
// Tool/function-schema overhead and provider-injected system tokens are NOT derivable client-side
// and are deliberately excluded here; Phase 1 marks any tool-inclusive count as Approx. Request-level
// message assembly (which roles, names) is a Phase 1 concern; this module provides the correct formula.
import { tiktokenCount } from '@/tokenizer/tiktokenAdapter';
import type { TiktokenEncoding } from '@/types/tokenizer';

export const PER_MESSAGE_STRUCT = 3; // <|start|>{role}\n … <|end|> structural tokens
export const PRIMING = 3; // reply priming (<|start|>assistant)

export function messageOverhead(roles: readonly string[], encoding: TiktokenEncoding): number {
  if (roles.length === 0) return 0;
  const perMessage = roles.reduce(
    (sum, role) => sum + PER_MESSAGE_STRUCT + tiktokenCount(role, encoding),
    0,
  );
  return perMessage + PRIMING;
}
