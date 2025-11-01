/**
 * PDF Export Utility
 *
 * Generates professional PDF reports using jsPDF and jsPDF-AutoTable.
 *
 * Report Structure:
 * 1. Header with TokenTally branding
 * 2. Executive Summary (key metrics)
 * 3. Configuration Snapshot
 * 4. Detailed Cost Breakdown Table
 * 5. Optimization Recommendations
 * 6. Assumptions and Methodology
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ChatbotConfig, CostBreakdown, Recommendation } from '@/types';

/**
 * Generate PDF report for cost analysis
 *
 * @param config - Chatbot configuration
 * @param breakdown - Cost breakdown results
 * @param recommendations - Optimization recommendations
 * @returns jsPDF document instance
 */
export function generatePDFReport(
  config: ChatbotConfig,
  breakdown: CostBreakdown,
  recommendations: Recommendation[],
): jsPDF {
  const doc = new jsPDF();
  let yPosition = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TokenTally', 20, yPosition);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('LLM Chatbot Cost Analysis Report', 20, yPosition + 8);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPosition + 14);
  doc.setTextColor(0);

  yPosition += 30;

  // Executive Summary
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const summaryData = [
    ['Model', breakdown.model],
    ['Monthly Operating Cost', `$${breakdown.monthlyCost.toFixed(2)}`],
    ['Cost Per Conversation', `$${breakdown.perConversationCost.toFixed(4)}`],
    ['Monthly Volume', `${config.conversationsPerMonth.toLocaleString()} conversations`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Configuration Details
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Configuration', 20, yPosition);
  yPosition += 10;

  const configData = [
    ['System Prompt Tokens', config.systemPromptTokens.toString()],
    ['Avg User Message Tokens', config.avgUserMessageTokens.toString()],
    ['Avg Response Tokens', config.avgResponseTokens.toString()],
    ['Conversation Turns', config.conversationTurns.toString()],
    ['Context Strategy', config.contextStrategy],
    ['Cache Hit Rate', `${(config.cacheHitRate * 100).toFixed(0)}%`],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: configData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { cellWidth: 'auto' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Cost Breakdown Table
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Cost Breakdown', 20, yPosition);
  yPosition += 10;

  const breakdownData = [
    ['System Prompt Processing', `$${breakdown.breakdown.systemPromptCost.toFixed(4)}`],
    ['User Input Tokens', `$${breakdown.breakdown.inputTokensCost.toFixed(4)}`],
    ['AI Output Tokens', `$${breakdown.breakdown.outputTokensCost.toFixed(4)}`],
    ['Context Accumulation', `$${breakdown.breakdown.contextAccumulationCost.toFixed(4)}`],
  ];

  if (breakdown.breakdown.cacheSavings < 0) {
    breakdownData.splice(1, 0, [
      'Prompt Cache Savings',
      `$${breakdown.breakdown.cacheSavings.toFixed(4)}`,
    ]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [['Component', 'Cost Per Conversation']],
    body: breakdownData,
    theme: 'grid',
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 60, halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Optimization Recommendations
  if (recommendations.length > 0) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Optimization Recommendations', 20, yPosition);
    yPosition += 10;

    const recommendationsData = recommendations.map((rec) => [
      rec.priority,
      rec.title,
      `$${rec.potentialSavings.toFixed(2)}`,
      `${rec.savingsPercentage.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Priority', 'Recommendation', 'Savings', '%']],
      body: recommendationsData,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 95 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Add detailed descriptions
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    recommendations.slice(0, 3).forEach((rec, index) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${rec.title}`, 20, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(rec.description, 170);
      doc.text(descLines, 25, yPosition);
      yPosition += descLines.length * 5 + 3;

      doc.setFont('helvetica', 'italic');
      const actionLines = doc.splitTextToSize(`Action: ${rec.action}`, 170);
      doc.text(actionLines, 25, yPosition);
      yPosition += actionLines.length * 5 + 8;
    });
  }

  // Check if we need a new page for assumptions
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  // Assumptions
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Assumptions & Methodology', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const assumptions = [
    `• Cache hit rate: ${(breakdown.assumptions.cacheHitRate * 100).toFixed(0)}% (Claude models only)`,
    `• Context strategy: ${breakdown.assumptions.contextStrategy} (${breakdown.assumptions.avgTokensPerTurn} tokens/turn)`,
    `• First turn cost: $${breakdown.assumptions.firstTurnCost.toFixed(4)}`,
    `• Later turns cost: $${breakdown.assumptions.laterTurnCost.toFixed(4)}`,
    '• Pricing data: Official OpenAI and Anthropic rates as of January 2025',
    '• Token estimates: Based on character-to-token conversion (~4 chars = 1 token)',
    '• Accuracy target: ±5% of actual costs for production chatbots',
  ];

  assumptions.forEach((assumption) => {
    const lines = doc.splitTextToSize(assumption, 170);
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * 5 + 1;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `TokenTally - Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' },
    );
  }

  return doc;
}

/**
 * Generate and download PDF report
 *
 * @param config - Chatbot configuration
 * @param breakdown - Cost breakdown results
 * @param recommendations - Optimization recommendations
 * @param filename - Optional custom filename
 */
export function exportAndDownloadPDF(
  config: ChatbotConfig,
  breakdown: CostBreakdown,
  recommendations: Recommendation[],
  filename: string = 'tokentally-report.pdf',
): void {
  const doc = generatePDFReport(config, breakdown, recommendations);
  doc.save(filename);
}
