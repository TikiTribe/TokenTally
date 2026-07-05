// Centralized help copy for field tooltips + per-mode explainers. Kept as data (no JSX) so it is easy to
// review/edit and reuse across panels. Content is grounded in the actual cost model (see src/workloads/*,
// src/engine/*). Plain strings render as text nodes only (CSP/XSS-safe). Owner: TokenTally UI. Version: help-1.

// Rough English conversions, surfaced wherever a token count is entered.
export const TOKEN_CONVERSION =
  'Rough conversions (English): ~1.3 tokens per word, ~4 characters per token. So 1,000 words ≈ 1,300 tokens ≈ 5,200 characters. Where a real tokenizer runs (OpenAI models here) the count is exact; otherwise it is a labeled estimate.';

export const MODEL_HELP =
  'Provider + deployment to price against. Prices come from a committed, hash-verified snapshot (community-mirrored, not verified against provider billing). The accuracy badge on the result reflects token-count fidelity: “exact” where a real tokenizer runs, “estimate” otherwise. Changing the model reprices instantly.';

// Field tooltips keyed by a stable id (mode.field).
export const FIELD_HELP: Record<string, string> = {
  // Chatbot
  'chatbot.systemPrompt':
    'Your bot’s fixed instructions, sent on every turn. This is the cacheable prefix and the single biggest cost lever: with prompt caching, turns after the first read it at a steep discount. Paste the real text. It is tokenized live in your browser and never uploaded. ' + TOKEN_CONVERSION,
  'chatbot.avgUserMessageTokens':
    'Typical length of one user message. ~1.3 tokens/word (a 40-word question ≈ 50 tokens). Drives per-turn input cost.',
  'chatbot.avgResponseTokens':
    'Typical length of the bot’s reply. Output tokens cost 3 to 4× input on most models, so this is a large lever. A 150-word answer ≈ 200 tokens.',
  'chatbot.turnsPerConversation':
    'Back-and-forth exchanges in one conversation. Later turns re-send the accumulated context, so total cost grows faster than linearly with turns.',
  'chatbot.conversationsPerMonth':
    'Total conversations per month. Multiplies everything below. Usually the top sensitivity factor. See the tornado chart on the result.',
  'chatbot.contextStrategy':
    'How much prior conversation is re-sent each turn: Minimal 50, Moderate 150, Full 300 tokens/turn. More context means better continuity but more input cost on every turn.',
  // Prompt / Batch
  'prompt.promptText':
    'The full prompt sent per call. Tokenized live in your browser (never uploaded). ' + TOKEN_CONVERSION,
  'prompt.sharedSystemPromptTokens':
    'Tokens in a shared, cacheable prefix reused across calls (0 = none). A shared prefix unlocks cache discounts; without one, batch calls cannot reuse cache and each pays full input price.',
  'prompt.responseTokens':
    'Expected output tokens per call. For short prompts, output is the dominant cost. ~1.3 tokens/word.',
  'prompt.callsPerMonth':
    'Total API calls per month. Multiplies the per-call cost.',
  'prompt.turnsPerCall':
    'Turns per call if you loop the model (1 = single-shot). Each extra turn re-sends the accumulated context.',
  // Agent
  'agent.preset':
    'Seed defaults for common agent frameworks (LangChain, CrewAI, AutoGen, LlamaIndex). It is only a starting point. Every number below stays editable.',
  'agent.toolSchemaTokens':
    'Tokens in your tool/function definitions, re-sent (and cached) every step. A stable cached prefix, so larger schemas cost more on every step.',
  'agent.stepsPerRun':
    'Tool-call iterations per run. Each step re-sends the growing observation history, so cost accumulates across steps. See the per-step chart on the result.',
  'agent.observationGrowthPerStep':
    'Tokens each tool result adds to the context, then re-sent on every later step. This super-linear growth is why long agent loops get expensive fast.',
  'agent.actionOutputTokens':
    'Model output tokens per step (the action or reasoning it emits). Priced at the model’s output rate.',
  'agent.runsPerMonth':
    'Total agent runs per month. Multiplies the per-run cost.',
  // Crew / multi-agent
  'crew.memberCount':
    'Number of agents in the crew. Modeled up to 64; a larger number is capped at 64 for the estimate (the excess is not modeled). Each member runs its own step loop.',
  'crew.stepsPerMember':
    'Tool-call steps each member takes per run.',
  'crew.sharedTranscriptGrowthPerStep':
    'Tokens the shared transcript grows each step. Every member re-reads the growing transcript, so cost scales with members × steps × growth.',
  'crew.runsPerMonth':
    'Total crew runs per month.',
  // Denial of Wallet
  'dow.attackerRequestsPerMonth':
    'Assumed hostile request volume per month. A defensive planning input. It bounds YOUR worst-case bill and is not for planning an attack.',
  'dow.retryCeiling':
    'Worst-case forced-retry multiplier (minimum 1). Model a bug or adversary that retries each request several times.',
  'dow.fallbackInputTokens':
    'Used only if the model does not publish a context-window limit. The worst case assumes an adversary fills the maximum input context.',
  'dow.fallbackOutputTokens':
    'Used only if the model does not publish an output limit. The worst case assumes an adversary maxes the output length.',
};

// Typed accessor: returns '' for an unknown key (satisfies strict noUncheckedIndexedAccess; a '' help is
// treated as "no tooltip" by the field wrappers).
export function fieldHelp(key: string): string {
  return FIELD_HELP[key] ?? '';
}

// Per-mode "How this works" explainer (rendered collapsed at the top of each panel).
export const MODE_EXPLAINER: Record<string, { title: string; body: string }> = {
  chatbot: {
    title: 'How chatbot cost is modeled',
    body:
      'Cost = first turn + (later turns × (turns − 1)), multiplied by conversations/month. Your system prompt is a cacheable prefix: with caching, later turns read it cheaply, which is the main savings lever. Context accumulates each turn per your context strategy. The result shows a central estimate, a conservative “no warm cache” upper bound, a per-component breakdown, and a sensitivity (tornado) chart.',
  },
  prompt: {
    title: 'How batch / prompt cost is modeled',
    body:
      'Cost = per-call (input + output) × calls/month. A shared system prefix, if set, is cacheable across calls. Output tokens usually dominate for short prompts. Set turns > 1 to model looping the model, which re-sends the accumulated context each turn.',
  },
  agent: {
    title: 'How agent cost is modeled',
    body:
      'Cost accumulates across steps. The tool schema is a cached prefix re-sent each step; each observation grows the context re-sent on every later step, so cost is super-linear in steps. The per-step chart shows this: the first step pays the cold cache write, later steps read the warm cache.',
  },
  crew: {
    title: 'How multi-agent (crew) cost is modeled',
    body:
      'Cost sums each member’s own step loop plus a shared transcript that every member re-reads as it grows. Modeled up to 64 members (larger crews are capped for the estimate). A sensitivity chart is not yet provided for crews.',
  },
  denial_of_wallet: {
    title: 'What Denial of Wallet estimates',
    body:
      'A DEFENSIVE, opt-in worst-case estimator. It bounds YOUR maximum monthly spend if an adversary fills the maximum context, maxes output, and forces retries, so you can set budget, rate-limit, and output caps. Test only systems you are authorized to test.',
  },
};
