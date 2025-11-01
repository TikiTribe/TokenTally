/**
 * Token Estimation Utilities
 *
 * Provides character-based token estimation for user inputs.
 * Uses ~4 characters = 1 token rule of thumb.
 *
 * Note: This is an approximation. Actual token counts may vary
 * based on the specific tokenizer used by each model.
 */

/**
 * Estimates token count from character count
 * Rule of thumb: ~4 chars = 1 token
 */
export function estimateTokensFromChars(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Remove excessive whitespace for more accurate estimation
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const charCount = normalizedText.length;

  // ~4 characters per token (average across models)
  return Math.ceil(charCount / 4);
}

/**
 * Estimates token count from word count
 * Rule of thumb: ~1.3 tokens per word
 */
export function estimateTokensFromWords(words: number): number {
  if (!words || words <= 0) {
    return 0;
  }

  // ~1.3 tokens per word (average across models)
  return Math.ceil(words * 1.3);
}

/**
 * Converts tokens to approximate character count
 * Inverse of estimateTokensFromChars
 */
export function estimateCharsFromTokens(tokens: number): number {
  if (!tokens || tokens <= 0) {
    return 0;
  }

  // ~4 characters per token
  return tokens * 4;
}

/**
 * Counts words in text
 */
export function countWords(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  // Split on whitespace and filter empty strings
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Formats large numbers with commas for readability
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}
