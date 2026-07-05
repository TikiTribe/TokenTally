// Shared display formatting for the result surface. One money() (always 2 decimals, so a cost tool never
// shows "$5.1" or "$1,000"), plus human labels for the raw engine identifiers the waterfall + tornado expose
// (cacheWrite -> "Cache writes", conversationsPerMonth -> "Conversations / month"). Owner: TokenTally UI.

// en-US pinned so the browser and the node test runner format identically (thousands comma, 2 decimals).
export const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// A finer-grained money for per-step agent costs, which are fractions of a cent (2 dp would show $0.00).
export const moneyPrecise = (n: number): string => `$${n.toFixed(4)}`;

// Cost-waterfall component identifiers -> readable labels.
const WATERFALL_LABEL: Record<string, string> = {
  cacheWrite: 'Cache writes',
  cacheReads: 'Cache reads',
  input: 'Input',
  output: 'Output',
  reasoning: 'Reasoning',
};
export function waterfallLabel(id: string): string {
  const member = /^member(\d+)$/.exec(id);
  if (member) return `Agent ${Number(member[1]) + 1}`;
  return WATERFALL_LABEL[id] ?? deCamel(id);
}

// Tornado sensitivity factor identifiers -> readable labels (these are store input field names).
const FACTOR_LABEL: Record<string, string> = {
  conversationsPerMonth: 'Conversations / month',
  avgResponseTokens: 'Avg response tokens',
  contextGrowthPerTurn: 'Context growth / turn',
  turnsPerConversation: 'Turns / conversation',
  callsPerMonth: 'Calls / month',
  responseTokens: 'Response tokens',
  promptTokens: 'Prompt tokens',
  turnsPerCall: 'Turns / call',
  runsPerMonth: 'Runs / month',
  stepsPerRun: 'Steps / run',
  observationGrowthPerStep: 'Observation growth / step',
  actionOutputTokens: 'Action output tokens',
};
export function factorLabel(id: string): string {
  return FACTOR_LABEL[id] ?? deCamel(id);
}

// Fallback: split camelCase into words and sentence-case the first (e.g. "someNewField" -> "Some new field").
function deCamel(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
