// P2 engine boundary: the ONLY module that statically imports the Phase-1 engine (@/workloads,
// @/optimization) and the registry query. It is reached exclusively via dynamic import() from the store's
// recompute action, so the engine graph lands in a lazy chunk and never in first-paint (P2-A7). Resolves
// the (canonicalId, deployment) selection to a ModelRecord; a missing model returns an explicit
// 'unavailable' result (never a silent $0, C9/P2-A9). Owner: TokenTally UI. Version: Phase 2C.
import { chatbotForecast, promptForecast, agentForecast, crewForecast } from '@/workloads';
import { denialOfWallet, tornado } from '@/optimization';
import { getModel } from '@/registry';
import { mapChatbot, mapPrompt, mapAgent, mapCrew, mapDow } from '@/store/modeMapping';
import type { WorkloadForecast } from '@/workloads';
import type { DenialOfWalletResult, TornadoBar, OptWorkloadKind, WorkloadConfig } from '@/optimization';
import type { Mode, ModeInputs, ModelSelection, FieldTokenCount, ChatbotInputs, PromptInputs } from '@/store/types';

// One point on the cache-warmth curve: monthly cost at a given arrival rate. central === headline at that rate.
export interface WarmthPoint {
  arrivals: number;
  central: number;
  low: number;
  high: number;
  conservative: number;
}

export type EngineResult =
  | { kind: 'workload'; forecast: WorkloadForecast; tornado: TornadoBar[]; warmthSeries: WarmthPoint[] | null }
  | { kind: 'dow'; result: DenialOfWalletResult }
  | { kind: 'unavailable'; reason: string };

const WARMTH_POINTS = 16; // sweep resolution; each point is one cheap forecast, so keep the recompute snappy

// The cache-warmth curve: sweep the arrival rate (conversations/calls per month) and price the workload at each,
// so a user sees how a warming cache lowers cost as volume rises. Returns null when the model has no warm-cache
// dynamics for this config (cost.warmth === null) - the UI then shows honest text instead of a flat fake curve.
// Only chatbot and prompt have an arrivals axis; other modes return null. Bounded to WARMTH_POINTS forecasts.
export function warmthCurve(
  mode: Mode,
  inputs: ModeInputs,
  selection: ModelSelection,
  tokenCounts: Record<string, FieldTokenCount>,
  snapshotVersion: string,
): WarmthPoint[] | null {
  const model = getModel(selection.canonicalId, selection.deployment);
  if (!model) return null;

  const priceAt = (arrivals: number): WorkloadForecast => {
    if (mode === 'chatbot') {
      const seeded: ChatbotInputs = { ...inputs.chatbot, conversationsPerMonth: arrivals };
      return chatbotForecast(mapChatbot(seeded, model, tokenCounts['chatbot.systemPrompt'], snapshotVersion));
    }
    const seeded: PromptInputs = { ...inputs.prompt, callsPerMonth: arrivals };
    return promptForecast(mapPrompt(seeded, model, tokenCounts['prompt.promptText'], snapshotVersion));
  };

  let current: number;
  if (mode === 'chatbot') current = inputs.chatbot.conversationsPerMonth;
  else if (mode === 'prompt') current = inputs.prompt.callsPerMonth;
  else return null;

  // No warm-cache dynamics at the current config -> no curve (honest text in the UI).
  if (priceAt(Math.max(1, Math.round(current))).cost.warmth === null) return null;

  const lo = Math.max(1, Math.round(current / 8));
  const hi = Math.max(lo + 1, Math.round(current * 8));
  const points: WarmthPoint[] = [];
  for (let i = 0; i < WARMTH_POINTS; i++) {
    const frac = i / (WARMTH_POINTS - 1);
    const arrivals = Math.max(1, Math.round(lo * Math.pow(hi / lo, frac))); // log-spaced so the knee is visible
    const c = priceAt(arrivals).cost;
    points.push({
      arrivals,
      central: c.centralTotal,
      low: c.confidence.low,
      high: c.confidence.high,
      conservative: c.conservativeTotal,
    });
  }
  return points;
}

// The sensitivity factors the tornado sweeps per workload (all in the NUMERIC_FIELDS allowlist).
const TORNADO_FACTORS: Record<OptWorkloadKind, string[]> = {
  chatbot: ['conversationsPerMonth', 'avgResponseTokens', 'contextGrowthPerTurn', 'turnsPerConversation'],
  prompt: ['callsPerMonth', 'responseTokens', 'promptTokens', 'turnsPerCall'],
  agent: ['runsPerMonth', 'stepsPerRun', 'observationGrowthPerStep', 'actionOutputTokens'],
};

function tornadoFor(kind: OptWorkloadKind, config: WorkloadConfig): TornadoBar[] {
  return tornado({ kind, config, candidateModels: [] }, TORNADO_FACTORS[kind], 0.2);
}

export function runForecast(
  mode: Mode,
  inputs: ModeInputs,
  selection: ModelSelection,
  tokenCounts: Record<string, FieldTokenCount>,
  snapshotVersion: string,
): EngineResult {
  const model = getModel(selection.canonicalId, selection.deployment);
  if (!model) {
    return { kind: 'unavailable', reason: `Model "${selection.canonicalId}" (${selection.deployment}) is not in the catalog - select another model.` };
  }
  switch (mode) {
    case 'chatbot': {
      const cfg = mapChatbot(inputs.chatbot, model, tokenCounts['chatbot.systemPrompt'], snapshotVersion);
      return {
        kind: 'workload',
        forecast: chatbotForecast(cfg),
        tornado: tornadoFor('chatbot', cfg),
        warmthSeries: warmthCurve('chatbot', inputs, selection, tokenCounts, snapshotVersion),
      };
    }
    case 'prompt': {
      const cfg = mapPrompt(inputs.prompt, model, tokenCounts['prompt.promptText'], snapshotVersion);
      return {
        kind: 'workload',
        forecast: promptForecast(cfg),
        tornado: tornadoFor('prompt', cfg),
        warmthSeries: warmthCurve('prompt', inputs, selection, tokenCounts, snapshotVersion),
      };
    }
    case 'agent': {
      const cfg = mapAgent(inputs.agent, model, snapshotVersion);
      return { kind: 'workload', forecast: agentForecast(cfg), tornado: tornadoFor('agent', cfg), warmthSeries: null };
    }
    case 'crew':
      // crew optimization/tornado is deferred (P2-A22); render the forecast + step chart only.
      return { kind: 'workload', forecast: crewForecast(mapCrew(inputs.crew, model, snapshotVersion)), tornado: [], warmthSeries: null };
    case 'denial_of_wallet':
      return { kind: 'dow', result: denialOfWallet(mapDow(inputs.denial_of_wallet, model, snapshotVersion)) };
    default: {
      const _never: never = mode;
      throw new Error(`unknown mode: ${String(_never)}`);
    }
  }
}
