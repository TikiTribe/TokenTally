// P2 engine boundary: the ONLY module that statically imports the Phase-1 engine (@/workloads,
// @/optimization) and the registry query. It is reached exclusively via dynamic import() from the store's
// recompute action, so the engine graph lands in a lazy chunk and never in first-paint (P2-A7). Resolves
// the (canonicalId, deployment) selection to a ModelRecord; a missing model returns an explicit
// 'unavailable' result (never a silent $0, C9/P2-A9). Owner: TokenTally UI. Version: Phase 2C.
import { chatbotForecast, promptForecast, agentForecast, crewForecast } from '@/workloads';
import { denialOfWallet } from '@/optimization';
import { getModel } from '@/registry';
import { mapChatbot, mapPrompt, mapAgent, mapCrew, mapDow } from '@/store/modeMapping';
import type { WorkloadForecast } from '@/workloads';
import type { DenialOfWalletResult } from '@/optimization';
import type { Mode, ModeInputs, ModelSelection, FieldTokenCount } from '@/store/types';

export type EngineResult =
  | { kind: 'workload'; forecast: WorkloadForecast }
  | { kind: 'dow'; result: DenialOfWalletResult }
  | { kind: 'unavailable'; reason: string };

export function runForecast(
  mode: Mode,
  inputs: ModeInputs,
  selection: ModelSelection,
  tokenCounts: Record<string, FieldTokenCount>,
  snapshotVersion: string,
): EngineResult {
  const model = getModel(selection.canonicalId, selection.deployment);
  if (!model) {
    return { kind: 'unavailable', reason: `Model "${selection.canonicalId}" (${selection.deployment}) is not in the catalog — select another model.` };
  }
  switch (mode) {
    case 'chatbot':
      return { kind: 'workload', forecast: chatbotForecast(mapChatbot(inputs.chatbot, model, tokenCounts['chatbot.systemPrompt'], snapshotVersion)) };
    case 'prompt':
      return { kind: 'workload', forecast: promptForecast(mapPrompt(inputs.prompt, model, tokenCounts['prompt.promptText'], snapshotVersion)) };
    case 'agent':
      return { kind: 'workload', forecast: agentForecast(mapAgent(inputs.agent, model, snapshotVersion)) };
    case 'crew':
      return { kind: 'workload', forecast: crewForecast(mapCrew(inputs.crew, model, snapshotVersion)) };
    case 'denial_of_wallet':
      return { kind: 'dow', result: denialOfWallet(mapDow(inputs.denial_of_wallet, model, snapshotVersion)) };
    default: {
      const _never: never = mode;
      throw new Error(`unknown mode: ${String(_never)}`);
    }
  }
}
