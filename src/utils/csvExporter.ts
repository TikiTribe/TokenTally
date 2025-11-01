/**
 * CSV Export Utility
 *
 * Exports cost breakdown data to CSV format with security protections.
 *
 * SECURITY: Implements CSV formula injection prevention per SECURITY.md
 * - Sanitizes values starting with =, +, -, @ to prevent Excel code execution
 * - Uses single quote prefix to force text interpretation
 */

import type {
  ChatbotConfig,
  CostBreakdown,
  Recommendation,
  PromptCalculatorConfig,
  PromptCostBreakdown,
} from '@/types';

/**
 * Sanitize CSV value to prevent formula injection
 *
 * @param value - Value to sanitize
 * @returns Sanitized value safe for CSV export
 */
function sanitizeForCSV(value: string | number): string {
  const str = String(value);

  // Check for formula injection indicators
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.some((char) => str.startsWith(char))) {
    return `'${str}`; // Prefix with single quote to treat as text
  }

  // Escape double quotes
  return str.replace(/"/g, '""');
}

/**
 * Format a CSV row
 *
 * @param values - Array of values for the row
 * @returns Formatted CSV row string
 */
function formatCSVRow(values: Array<string | number>): string {
  return values
    .map((value) => {
      const sanitized = sanitizeForCSV(value);
      // Quote if contains comma, newline, or quote
      if (
        sanitized.includes(',') ||
        sanitized.includes('\n') ||
        sanitized.includes('"')
      ) {
        return `"${sanitized}"`;
      }
      return sanitized;
    })
    .join(',');
}

/**
 * Export cost breakdown to CSV format
 *
 * @param config - Chatbot configuration
 * @param breakdown - Cost breakdown results
 * @param recommendations - Optional recommendations array
 * @returns CSV string ready for download
 */
export function exportToCSV(
  config: ChatbotConfig,
  breakdown: CostBreakdown,
  recommendations?: Recommendation[],
): string {
  const rows: string[] = [];

  // Header
  rows.push('TokenTally - Cost Analysis Report');
  rows.push(`Generated: ${new Date().toISOString()}`);
  rows.push(''); // Empty row

  // Configuration section
  rows.push('Configuration');
  rows.push(formatCSVRow(['Model', breakdown.model]));
  rows.push(formatCSVRow(['System Prompt Tokens', config.systemPromptTokens]));
  rows.push(
    formatCSVRow(['Avg User Message Tokens', config.avgUserMessageTokens]),
  );
  rows.push(formatCSVRow(['Avg Response Tokens', config.avgResponseTokens]));
  rows.push(formatCSVRow(['Conversation Turns', config.conversationTurns]));
  rows.push(
    formatCSVRow(['Conversations Per Month', config.conversationsPerMonth]),
  );
  rows.push(formatCSVRow(['Context Strategy', config.contextStrategy]));
  rows.push(
    formatCSVRow([
      'Cache Hit Rate',
      `${(config.cacheHitRate * 100).toFixed(0)}%`,
    ]),
  );
  rows.push(''); // Empty row

  // Cost Summary section
  rows.push('Cost Summary');
  rows.push(
    formatCSVRow([
      'Monthly Cost',
      `$${breakdown.monthlyCost.toFixed(2)}`,
    ]),
  );
  rows.push(
    formatCSVRow([
      'Per Conversation Cost',
      `$${breakdown.perConversationCost.toFixed(4)}`,
    ]),
  );
  rows.push(''); // Empty row

  // Detailed Breakdown section
  rows.push('Cost Breakdown');
  rows.push(formatCSVRow(['Component', 'Cost']));
  rows.push(
    formatCSVRow([
      'System Prompt',
      `$${breakdown.breakdown.systemPromptCost.toFixed(4)}`,
    ]),
  );
  if (breakdown.breakdown.cacheSavings < 0) {
    rows.push(
      formatCSVRow([
        'Cache Savings',
        `$${breakdown.breakdown.cacheSavings.toFixed(4)}`,
      ]),
    );
  }
  rows.push(
    formatCSVRow([
      'Input Tokens',
      `$${breakdown.breakdown.inputTokensCost.toFixed(4)}`,
    ]),
  );
  rows.push(
    formatCSVRow([
      'Output Tokens',
      `$${breakdown.breakdown.outputTokensCost.toFixed(4)}`,
    ]),
  );
  rows.push(
    formatCSVRow([
      'Context Accumulation',
      `$${breakdown.breakdown.contextAccumulationCost.toFixed(4)}`,
    ]),
  );
  rows.push(''); // Empty row

  // Recommendations section (if provided)
  if (recommendations && recommendations.length > 0) {
    rows.push('Optimization Recommendations');
    rows.push(formatCSVRow(['Priority', 'Title', 'Savings', 'Percentage', 'Action']));
    recommendations.forEach((rec) => {
      rows.push(
        formatCSVRow([
          rec.priority,
          rec.title,
          `$${rec.potentialSavings.toFixed(2)}`,
          `${rec.savingsPercentage.toFixed(1)}%`,
          rec.action,
        ]),
      );
    });
    rows.push(''); // Empty row
  }

  // Assumptions section
  rows.push('Assumptions');
  rows.push(
    formatCSVRow([
      'Cache Hit Rate',
      `${(breakdown.assumptions.cacheHitRate * 100).toFixed(0)}%`,
    ]),
  );
  rows.push(
    formatCSVRow(['Context Strategy', breakdown.assumptions.contextStrategy]),
  );
  rows.push(
    formatCSVRow([
      'Avg Tokens Per Turn',
      breakdown.assumptions.avgTokensPerTurn,
    ]),
  );

  return rows.join('\n');
}

/**
 * Export prompt cost breakdown to CSV format
 *
 * SECURITY: All user-provided fields (especially promptText) are sanitized
 * to prevent formula injection attacks in Excel/Google Sheets.
 *
 * @param config - Prompt calculator configuration
 * @param breakdown - Prompt cost breakdown results
 * @param recommendations - Optional recommendations array
 * @returns CSV string ready for download
 */
export function exportPromptCSV(
  config: PromptCalculatorConfig,
  breakdown: PromptCostBreakdown,
  recommendations?: Recommendation[],
): string {
  const rows: string[] = [];

  // Header
  rows.push('TokenTally - Prompt Calculator Report');
  rows.push(`Generated: ${new Date().toISOString()}`);
  rows.push(''); // Empty row

  // Configuration section
  rows.push('Configuration');
  rows.push(formatCSVRow(['Model', config.modelId]));

  // CRITICAL SECURITY: Sanitize promptText to prevent formula injection
  // The promptText field is user-controlled and could contain malicious formulas
  rows.push(formatCSVRow(['Prompt Text', config.promptText]));

  rows.push(formatCSVRow(['Batch Operations', config.batchOperations]));
  rows.push(formatCSVRow(['Response Preset', config.responsePreset]));

  if (config.multiTurnEnabled && config.turns) {
    rows.push(formatCSVRow(['Multi-Turn Enabled', 'Yes']));
    rows.push(formatCSVRow(['Conversation Turns', config.turns]));
    rows.push(formatCSVRow(['Context Strategy', config.contextStrategy || 'moderate']));
    if (config.cacheHitRate !== undefined) {
      rows.push(formatCSVRow(['Cache Hit Rate', `${config.cacheHitRate}%`]));
    }
  } else {
    rows.push(formatCSVRow(['Multi-Turn Enabled', 'No']));
  }
  rows.push(''); // Empty row

  // Cost Summary section
  rows.push('Cost Summary');
  rows.push(formatCSVRow(['Per-Operation Cost', `$${breakdown.perCallCost.toFixed(4)}`]));
  rows.push(formatCSVRow(['Monthly Cost', `$${breakdown.monthlyCost.toFixed(2)}`]));
  rows.push(''); // Empty row

  // Token Breakdown section
  rows.push('Token Breakdown');
  rows.push(formatCSVRow(['Input Tokens', breakdown.inputTokens]));
  rows.push(formatCSVRow(['Output Tokens', breakdown.outputTokens]));
  rows.push(formatCSVRow(['Input Cost', `$${breakdown.inputCost.toFixed(4)}`]));
  rows.push(formatCSVRow(['Output Cost', `$${breakdown.outputCost.toFixed(4)}`]));

  if (breakdown.cacheSavings !== undefined && breakdown.cacheSavings !== 0) {
    rows.push(formatCSVRow(['Cache Savings', `$${breakdown.cacheSavings.toFixed(4)}`]));
  }

  if (breakdown.contextCost !== undefined && breakdown.contextCost !== 0) {
    rows.push(formatCSVRow(['Context Accumulation Cost', `$${breakdown.contextCost.toFixed(4)}`]));
  }
  rows.push(''); // Empty row

  // Multi-turn breakdown (if applicable)
  if (config.multiTurnEnabled && breakdown.breakdown) {
    rows.push('Multi-Turn Breakdown');
    if (breakdown.breakdown.firstTurn !== undefined) {
      rows.push(formatCSVRow(['First Turn Cost', `$${breakdown.breakdown.firstTurn.toFixed(4)}`]));
    }
    if (breakdown.breakdown.laterTurns !== undefined) {
      rows.push(formatCSVRow(['Later Turns Cost (each)', `$${breakdown.breakdown.laterTurns.toFixed(4)}`]));
    }
    if (breakdown.breakdown.cacheHitSavings !== undefined) {
      rows.push(formatCSVRow(['Total Cache Savings', `$${breakdown.breakdown.cacheHitSavings.toFixed(4)}`]));
    }
    if (breakdown.breakdown.contextAccumulation !== undefined) {
      rows.push(formatCSVRow(['Context Accumulation', `$${breakdown.breakdown.contextAccumulation.toFixed(4)}`]));
    }
    rows.push(''); // Empty row
  }

  // Recommendations section (if provided)
  if (recommendations && recommendations.length > 0) {
    rows.push('Optimization Recommendations');
    rows.push(formatCSVRow(['Priority', 'Title', 'Savings', 'Percentage', 'Action']));
    recommendations.forEach((rec) => {
      rows.push(
        formatCSVRow([
          rec.priority,
          rec.title,
          `$${rec.potentialSavings.toFixed(2)}`,
          `${rec.savingsPercentage.toFixed(1)}%`,
          rec.action,
        ]),
      );
    });
    rows.push(''); // Empty row
  }

  return rows.join('\n');
}

/**
 * Trigger CSV download in browser
 *
 * @param csvContent - CSV string content
 * @param filename - Optional filename (default: tokentally-report.csv)
 */
export function downloadCSV(
  csvContent: string,
  filename: string = 'tokentally-report.csv',
): void {
  // Create blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Export and download cost breakdown as CSV
 *
 * @param config - Chatbot configuration
 * @param breakdown - Cost breakdown results
 * @param recommendations - Optional recommendations
 * @param filename - Optional custom filename
 */
export function exportAndDownloadCSV(
  config: ChatbotConfig,
  breakdown: CostBreakdown,
  recommendations?: Recommendation[],
  filename?: string,
): void {
  const csvContent = exportToCSV(config, breakdown, recommendations);
  downloadCSV(csvContent, filename);
}

/**
 * Export and download prompt cost breakdown as CSV
 *
 * Generates timestamped filename and triggers browser download.
 *
 * @param config - Prompt calculator configuration
 * @param breakdown - Prompt cost breakdown results
 * @param recommendations - Optional recommendations
 * @param filename - Optional custom filename (auto-generated if not provided)
 */
export function exportAndDownloadPromptCSV(
  config: PromptCalculatorConfig,
  breakdown: PromptCostBreakdown,
  recommendations?: Recommendation[],
  filename?: string,
): void {
  const csvContent = exportPromptCSV(config, breakdown, recommendations);

  // Generate timestamped filename if not provided
  if (!filename) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '-')
      .split('.')[0];
    filename = `tokentally-prompt-export-${timestamp}.csv`;
  }

  downloadCSV(csvContent, filename);
}
