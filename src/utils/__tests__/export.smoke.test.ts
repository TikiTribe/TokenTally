// D8 runtime smoke test: the jsPDF 3->4 (+ jspdf-autotable 5.0.8) security upgrade must not break the
// MVP export path at RUNTIME (tsc passing does not prove the PDF actually generates). Exercises the pure
// generation functions (not the browser download triggers) and asserts real output bytes.
import { describe, it, expect } from 'vitest';
import { generatePDFReport } from '@/utils/pdfExporter';
import { exportToCSV } from '@/utils/csvExporter';
import type { ChatbotConfig, CostBreakdown, Recommendation } from '@/types';

const config: ChatbotConfig = {
  modelId: 'gpt-4o',
  systemPromptTokens: 1000,
  avgUserMessageTokens: 50,
  avgResponseTokens: 300,
  conversationTurns: 5,
  conversationsPerMonth: 10_000,
  contextStrategy: 'moderate',
  cacheHitRate: 0.9,
};

const breakdown: CostBreakdown = {
  model: 'gpt-4o',
  monthlyCost: 1234.56,
  perConversationCost: 0.123,
  breakdown: {
    systemPromptCost: 100,
    cacheSavings: -20,
    inputTokensCost: 400,
    outputTokensCost: 700,
    contextAccumulationCost: 54.56,
  },
  assumptions: {
    cacheHitRate: 0.9,
    contextStrategy: 'moderate',
    avgTokensPerTurn: 150,
    firstTurnCost: 0.2,
    laterTurnCost: 0.1,
  },
};

const recs: Recommendation[] = [
  { priority: 'HIGH', title: 'Switch model', description: 'Use gpt-4o-mini', potentialSavings: 500, savingsPercentage: 40, action: 'Change the model' },
];

describe('D8 export smoke test (jsPDF 4 + autotable 5 runtime)', () => {
  it('generatePDFReport produces a real non-empty PDF', () => {
    const doc = generatePDFReport(config, breakdown, recs);
    const bytes = doc.output('arraybuffer');
    expect(bytes.byteLength).toBeGreaterThan(500); // a genuine PDF, not an empty/broken doc
  });

  it('exportToCSV produces non-empty CSV carrying the config', () => {
    const csv = exportToCSV(config, breakdown, recs);
    expect(csv.length).toBeGreaterThan(0);
    expect(csv).toContain('gpt-4o');
  });
});
