// Phase 2D agent step-accumulation chart (hand-rolled SVG). Plots per-step cost from WorkloadForecast.steps
// VERBATIM (matches the engine — the step dollars foot to the headline for cache-null models, P2-A1/A11).
// Renders nothing when steps is null (chatbot/prompt). CSP-safe (SVG attrs only), with a data-table
// alternative. Owner: TokenTally UI. Version: Phase 2D.
import { VizFigure } from '@/viz/vizA11y';
import type { StepProfile } from '@/workloads';

const W = 320;
const H = 120;
const PAD = 4;

export function StepAccumulationChart(props: { steps: StepProfile[] | null }): JSX.Element | null {
  const steps = props.steps;
  if (!steps || steps.length < 2) return null;
  const maxCost = Math.max(...steps.map((s) => s.cost), Number.MIN_VALUE);
  const x = (i: number): number => PAD + (i / (steps.length - 1)) * (W - 2 * PAD);
  const y = (c: number): number => H - PAD - (c / maxCost) * (H - 2 * PAD);
  const points = steps.map((s, i) => `${x(i).toFixed(1)},${y(s.cost).toFixed(1)}`).join(' ');

  return (
    <VizFigure
      label="Cost per agent step (accumulating context)"
      columns={['Step', 'Input tokens', 'Output tokens', 'Cost']}
      rows={steps.map((s) => [s.step, s.inputTokens, s.outputTokens, `$${s.cost.toFixed(4)}`])}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" focusable="false">
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" />
        {steps.map((s, i) => (
          <circle key={s.step} cx={x(i)} cy={y(s.cost)} r="2.5" fill="var(--primary)" />
        ))}
      </svg>
    </VizFigure>
  );
}
