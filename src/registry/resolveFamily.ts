import type { TokenizerFamily, AccuracyTier } from '@/types/registry';

type Rule = { re: RegExp; family: TokenizerFamily; tier: AccuracyTier };

// First match wins. Applied to the lowercased id.
// Order matters: claude/gemini run before openai so a family name inside a provider path
// cannot be hijacked, and open-family finetunes run before the generic OpenAI rule so a
// "...gpt4" substring in a Llama finetune id does not misroute to openai.
const RULES: Rule[] = [
  { re: /claude/, family: 'claude', tier: 'estimate' },
  { re: /gemini|gemma|(^|\/)palm|bison|unicorn|medlm|gecko/, family: 'gemini_gemma', tier: 'approx' },
  // open-family finetunes BEFORE the generic openai rule, so "...gpt4" in a Llama id does not hijack
  { re: /mistral|mixtral|ministral|codestral|pixtral|magistral|wizardlm|zephyr|openchat/, family: 'mistral', tier: 'exact_unverified' },
  { re: /llama|nemotron|hermes|mythomax|airoboros|remm-slerp|lzlv|firefunction|(^|\/)dolphin/, family: 'llama', tier: 'exact_unverified' },
  { re: /qwen|qwq|qwerky/, family: 'qwen', tier: 'exact_unverified' },
  { re: /deepseek/, family: 'deepseek', tier: 'exact_unverified' },
  { re: /kimi|moonshot/, family: 'kimi', tier: 'exact_unverified' },
  { re: /command|(^|\/)cohere|(^|\/)c4ai|(^|\/)embed-(english|multilingual)|embed-v[- ]?4/, family: 'cohere', tier: 'exact_unverified' },
  { re: /jamba|jurassic|(^|\/)j2-|ai21|jais/, family: 'ai21', tier: 'exact_unverified' },
  { re: /(^|\/)phi-|phi3|phi4|phi-4/, family: 'phi', tier: 'exact_unverified' },
  { re: /(^|\/)yi-|(^|\/)01-ai/, family: 'yi', tier: 'exact_unverified' },
  { re: /granite/, family: 'granite', tier: 'exact_unverified' },
  { re: /dbrx|databricks/, family: 'dbrx', tier: 'exact_unverified' },
  { re: /sonar|perplexity|(^|\/)pplx/, family: 'perplexity', tier: 'exact_unverified' },
  { re: /grok/, family: 'grok', tier: 'approx' },
  { re: /titan|amazon\.nova|amazon\.titan|(^|\/)nova($|[-/])/, family: 'amazon', tier: 'estimate' },
  { re: /voyage/, family: 'voyage', tier: 'estimate' },
  { re: /aleph|luminous/, family: 'aleph_alpha', tier: 'estimate' },
  // generic OpenAI LAST among named families so finetunes above win
  { re: /gpt|chatgpt|(^|\/)o1|(^|\/)o3|(^|\/)o4|davinci|curie|babbage|(^|\/)ada($|[-/])|text-embedding-(ada|3)|codex|computer-use/, family: 'openai', tier: 'exact_unverified' },
];

export function resolveFamily(id: string): { family: TokenizerFamily; tier: AccuracyTier } {
  const k = id.toLowerCase();
  for (const rule of RULES) {
    if (rule.re.test(k)) return { family: rule.family, tier: rule.tier };
  }
  return { family: 'unknown', tier: 'estimate' };
}
