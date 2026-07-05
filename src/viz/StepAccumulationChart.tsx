// Agent/crew step-accumulation chart. Plots per-step cost from WorkloadForecast.steps VERBATIM (the step
// dollars foot to the headline for cache-null models, P2-A1/A11). Now labeled for sighted users: a visible
// caption, y-axis min/max dollars, x-axis step range, per-point hover, and aspect preserved (no distortion).
// A visually-hidden data table stays as a redundant screen-reader aid. Renders nothing for chatbot/prompt.
import { moneyPrecise } from '@/ui/format';
import type { StepProfile } from '@/workloads';

const W = 320;
const H = 100;
const PAD = 4;

export function StepAccumulationChart(props: { steps: StepProfile[] | null }): JSX.Element | null {
  const steps = props.steps;
  if (!steps || steps.length < 2) return null;
  const costs = steps.map((s) => s.cost);
  const maxCost = Math.max(...costs, Number.MIN_VALUE);
  const x = (i: number): number => PAD + (i / (steps.length - 1)) * (W - 2 * PAD);
  const y = (c: number): number => H - PAD - (c / maxCost) * (H - 2 * PAD);
  const points = steps.map((s, i) => `${x(i).toFixed(1)},${y(s.cost).toFixed(1)}`).join(' ');

  return (
    <figure role="group" aria-label="Cost per agent step (accumulating context)" style={{ margin: '1.25rem 0 0' }}>
      <figcaption className="viz__caption">
        Cost per step <span className="viz__subcaption">context accumulates, so later steps cost more</span>
      </figcaption>
      <div className="stepchart">
        {/* The plot is a zero-based scale (y maps cost 0 -> the bottom), so the axis reads max at top and $0 at
            the bottom - not min(cost), which would mislabel the baseline. moneyPrecise keeps sub-cent per-step
            costs legible (2dp would collapse them to $0.00) and matches the per-point hover. */}
        <div className="stepchart__yaxis" aria-hidden="true">
          <span>{moneyPrecise(maxCost)}</span>
          <span>{moneyPrecise(0)}</span>
        </div>
        {/* preserveAspectRatio meet (not "none") so the slope, i.e. the accumulation rate, is not distorted. */}
        <svg className="stepchart__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" focusable="false" aria-hidden="true">
          <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="2" />
          {steps.map((s, i) => (
            <circle key={s.step} cx={x(i)} cy={y(s.cost)} r="3" fill="var(--primary)">
              <title>{`Step ${s.step}: ${moneyPrecise(s.cost)} (${s.inputTokens} in / ${s.outputTokens} out tokens)`}</title>
            </circle>
          ))}
        </svg>
      </div>
      <div className="stepchart__xaxis" aria-hidden="true">
        <span>Step 1</span>
        <span>Step {steps.length}</span>
      </div>
      <table className="sr-only">
        <caption>Cost per agent step (accumulating context)</caption>
        <thead>
          <tr>
            <th scope="col">Step</th>
            <th scope="col">Input tokens</th>
            <th scope="col">Output tokens</th>
            <th scope="col">Cost</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((s) => (
            <tr key={s.step}>
              <td>{s.step}</td>
              <td>{s.inputTokens}</td>
              <td>{s.outputTokens}</td>
              <td>{moneyPrecise(s.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
