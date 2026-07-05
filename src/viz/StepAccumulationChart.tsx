// Agent/crew step-accumulation chart (§2D: recharts). Plots per-step cost from WorkloadForecast.steps VERBATIM
// (the step dollars foot to the headline for cache-null models, P2-A1/A11). A recharts LineChart gives a Tooltip
// that fires on hover ANYWHERE over the plot (the fix for "hover a point on the line shows nothing"). VizFigure
// keeps the visually-hidden data table as the screen-reader/axe text alternative. Renders nothing for chatbot/prompt.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { chartTheme } from '@/ui/charts/chartTheme';
import { moneyPrecise } from '@/ui/format';
import { VizFigure } from '@/viz/vizA11y';
import type { StepProfile } from '@/workloads';

export function StepAccumulationChart(props: { steps: StepProfile[] | null }): JSX.Element | null {
  // Re-read resolved theme colors when the store theme flips (recharts needs concrete colors, not CSS vars).
  const theme = useAppStore((s) => s.theme);
  void theme;
  const steps = props.steps;
  if (!steps || steps.length < 2) return null;
  const t = chartTheme();
  const data = steps.map((s) => ({ step: s.step, cost: s.cost, inputTokens: s.inputTokens, outputTokens: s.outputTokens }));

  return (
    <VizFigure
      label="Cost per agent step (accumulating context)"
      caption="Cost per step"
      subcaption="context accumulates, so later steps cost more"
      columns={['Step', 'Input tokens', 'Output tokens', 'Cost']}
      rows={steps.map((s) => [s.step, s.inputTokens, s.outputTokens, moneyPrecise(s.cost)])}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
          <XAxis dataKey="step" tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => `Step ${v}`} />
          <YAxis tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => moneyPrecise(Number(v))} width={72} />
          <Tooltip
            contentStyle={t.tooltip}
            // hover anywhere along the line -> the nearest step's cost + token split
            formatter={(value: number, _n, item: { payload?: { inputTokens: number; outputTokens: number } }) => [
              `${moneyPrecise(Number(value))} (${item.payload?.inputTokens ?? 0} in / ${item.payload?.outputTokens ?? 0} out tokens)`,
              'Cost',
            ]}
            labelFormatter={(v) => `Step ${v}`}
          />
          {/* No entrance animation: the chart re-renders on every recompute; recharts' default would re-draw
              the line each time (flicker). */}
          <Line type="monotone" dataKey="cost" stroke={t.central} strokeWidth={2} dot={{ r: 3, fill: t.central }} activeDot={{ r: 5 }} name="Cost" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </VizFigure>
  );
}
