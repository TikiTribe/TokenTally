/**
 * CSV Export Utility
 *
 * Exports cost breakdown data to CSV format with security protections.
 *
 * SECURITY: Implements CSV formula injection prevention per SECURITY.md
 * - Sanitizes values starting with =, +, -, @ to prevent Excel code execution
 * - Uses single quote prefix to force text interpretation
 */

import type { ChatbotConfig, CostBreakdown, Recommendation } from '@/types';

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
