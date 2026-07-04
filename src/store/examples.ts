// §5.8 example scenarios: one-click realistic configs (a partial state the store applies). Prompt text is
// left empty (users paste their own). Pure data. Owner: TokenTally UI. Version: Phase 3.
import type { Mode, ModeInputs, ModelSelection } from '@/store/types';

export interface Example {
  id: string;
  label: string;
  mode: Mode;
  selection: ModelSelection;
  inputs: Partial<ModeInputs[Mode]>;
}

export const EXAMPLES: Example[] = [
  {
    id: 'high-volume-chatbot',
    label: 'High-volume support chatbot (GPT-4o)',
    mode: 'chatbot',
    selection: { canonicalId: 'gpt-4o', deployment: 'openai' },
    inputs: { avgUserMessageTokens: 60, avgResponseTokens: 250, turnsPerConversation: 6, contextStrategy: 'moderate', conversationsPerMonth: 250000, ttl: 'min5' },
  },
  {
    id: 'langchain-agent',
    label: 'LangChain tool agent (GPT-4o)',
    mode: 'agent',
    selection: { canonicalId: 'gpt-4o', deployment: 'openai' },
    inputs: { preset: 'langchain', runsPerMonth: 20000, stepsPerRun: 8, toolSchemaTokens: 2500, observationGrowthPerStep: 450, actionOutputTokens: 200 },
  },
  {
    id: 'rag-pipeline',
    label: 'RAG query pipeline (large retrieved context)',
    mode: 'agent',
    selection: { canonicalId: 'gpt-4o-mini', deployment: 'openai' },
    inputs: { preset: 'llamaindex', runsPerMonth: 100000, stepsPerRun: 4, toolSchemaTokens: 1000, observationGrowthPerStep: 900, actionOutputTokens: 180 },
  },
];
