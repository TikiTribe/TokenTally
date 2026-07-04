// Multi-agent (crew/group chat): sum of per-member agent runs + optional orchestrator + shared-transcript
// growth (each member re-reads the growing shared transcript, so its per-step context accumulates an extra
// term). All members run at the crew's runsPerMonth. Costs add across members; the confidence band is the
// ADDITIVE sum — a conservative fully-correlated upper bound (P1-A30), not a percentile interval (a wider
// band is the safe honesty error; independent-variance narrowing is a Phase-2 refinement). The member list
// is capped so a hostile crew size cannot iterate unboundedly (P1-A12). Owner: engine. Version: Phase 1.
import { agentForecast } from '@/workloads/agent';
import { disabledForecast } from '@/workloads/note';
import type { AgentConfig, CrewConfig, WorkloadForecast } from '@/types/workload';
import type { CostComponentEntry, WarmCostResult } from '@/types/engine';

export const MAX_CREW_MEMBERS = 64;

export function crewForecast(cfg: CrewConfig): WorkloadForecast {
  if (cfg.enabled === false) return disabledForecast('crew');

  const runs = Math.max(0, cfg.runsPerMonth);
  const growth = Math.max(0, cfg.sharedTranscriptGrowthPerStep);
  const capped = cfg.agents.length > MAX_CREW_MEMBERS;
  const roster: AgentConfig[] = cfg.agents.slice(0, MAX_CREW_MEMBERS);
  const members: AgentConfig[] = cfg.orchestrator ? [cfg.orchestrator, ...roster] : [...roster];

  const forecasts = members.map((m) =>
    agentForecast({
      ...m,
      runsPerMonth: runs,
      observationGrowthPerStep: m.observationGrowthPerStep + growth,
      snapshotVersion: cfg.snapshotVersion ?? m.snapshotVersion,
    }),
  );

  const sumConf = (pick: (c: WarmCostResult['confidence']) => number): number =>
    forecasts.reduce((s, f) => s + pick(f.cost.confidence), 0);
  const monthly = forecasts.reduce((s, f) => s + f.monthlyCost, 0);
  const arrivals = forecasts.reduce((s, f) => s + f.arrivalsPerMonth, 0);
  const writes = forecasts.reduce((s, f) => s + f.cost.writesPerMonth, 0);
  const conservative = forecasts.reduce((s, f) => s + f.cost.conservativeTotal, 0);
  const components: CostComponentEntry[] = forecasts.map((f, i) => ({ label: `member${i}`, cost: f.monthlyCost }));

  const cost: WarmCostResult = {
    applicable: forecasts.some((f) => f.cost.applicable),
    warmth: null, // heterogeneous members: each member's warmth is in its own forecast
    centralTotal: monthly,
    conservativeTotal: conservative,
    savingsUpTo: {
      central: Math.max(0, conservative - monthly),
      conservativeReference: conservative,
      qualifier: 'up_to',
    },
    writesPerMonth: writes,
    waterfall: { components, total: monthly },
    confidence: {
      low: sumConf((c) => c.low),
      mid: sumConf((c) => c.mid),
      high: sumConf((c) => c.high),
      unmodeled: forecasts.some((f) => f.cost.confidence.unmodeled),
    },
    breakEvenArrivals: null,
  };

  const cappedNote = capped ? ` (member list capped at ${MAX_CREW_MEMBERS}; excess summarized)` : '';
  return {
    kind: 'crew',
    monthlyCost: monthly,
    cost,
    arrivalsPerMonth: arrivals,
    accuracyNote:
      `estimate: crew cost sums per-member forecasts — conservative fully-correlated upper bound` +
      ` (independent-variance narrowing is a Phase-2 refinement)${cappedNote}`,
    snapshotVersion: cfg.snapshotVersion ?? forecasts[0]?.snapshotVersion ?? 'unknown',
    formula: 'crew: Σ member agent forecasts + orchestrator + shared-transcript growth',
    tierStraddle: forecasts.some((f) => f.tierStraddle),
    contextTruncated: forecasts.some((f) => f.contextTruncated),
    steps: forecasts[0]?.steps ?? null,
  };
}
