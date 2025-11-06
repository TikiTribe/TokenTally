/**
 * Token Estimation Utilities
 *
 * Provides character-based and word-based token estimation for user inputs.
 *
 * **Conversion Rates (English Language)**:
 * - ~1.3 tokens per word (average)
 * - ~4 characters per token (average)
 * - ~0.77 words per token (inverse)
 *
 * **Note**: These are approximations based on English language patterns.
 * Actual token counts vary by model tokenizer (GPT-4, Claude, etc.).
 * Use these estimates for planning and budgeting purposes.
 */

/**
 * Estimates token count from character count
 *
 * **Rule of thumb**: ~4 characters = 1 token
 *
 * @param text - Input text to estimate tokens for
 * @returns Estimated token count (rounded up)
 *
 * @example
 * estimateTokensFromChars("Hello world") // Returns 3 (11 chars / 4 ≈ 2.75 → 3)
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
 *
 * **Rule of thumb**: ~1.3 tokens per word (English average)
 *
 * @param words - Number of words to estimate tokens for
 * @returns Estimated token count (rounded up)
 *
 * @example
 * estimateTokensFromWords(100) // Returns 130 (100 × 1.3)
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
 *
 * **Inverse of estimateTokensFromChars**: 1 token ≈ 4 characters
 *
 * @param tokens - Number of tokens to convert
 * @returns Estimated character count
 *
 * @example
 * estimateCharsFromTokens(100) // Returns 400 (100 × 4)
 */
export function estimateCharsFromTokens(tokens: number): number {
  if (!tokens || tokens <= 0) {
    return 0;
  }

  // ~4 characters per token
  return tokens * 4;
}

/**
 * Counts words in text by splitting on whitespace
 *
 * @param text - Input text to count words in
 * @returns Number of words (whitespace-separated)
 *
 * @example
 * countWords("Hello world") // Returns 2
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
