// Cost-vs-context chart (§2D). Sweeps per-turn context growth and plots monthly cost, so a user sees how
// accumulating context drives cost and where it flattens once the context truncates at the model window. Points
// past the window get a distinct dot color (the contextTruncated marker). Rendered as a recharts LineChart (NOT a
// ScatterChart): the data is a monotonic sweep, and a LineChart's shared-axis cursor fires the Tooltip on hover
// ANYWHERE over the plot - a ScatterChart only fires on a direct point hit, so its tooltips read as "not
// displaying." Lazy (never first-paint). Chatbot/prompt only. Owner: TokenTally UI.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { chartTheme } from '@/ui/charts/chartTheme';
import { money } from '@/ui/format';
import { VizFigure } from '@/viz/vizA11y';
import type { ContextPoint } from '@/store/engineClient';

export function CostVsContextChart(props: { points: ContextPoint[] | null }): JSX.Element | null {
  const theme = useAppStore((s) => s.theme);
  void theme;
  const t = chartTheme();
  const points = props.points;
  if (points === null || points.length < 2) return null;

  // recharts calls this per data point with the datum in `payload`; a truncated point (context exceeds the model
  // window) gets the distinct color, matching the a11y table's "truncated" flag.
  const renderDot = (dp: { cx?: number; cy?: number; index?: number; payload?: ContextPoint }): JSX.Element => (
    <circle key={dp.index} cx={dp.cx} cy={dp.cy} r={4} fill={dp.payload?.truncated ? t.truncated : t.central} stroke="none" />
  );

  return (
    <VizFigure
      label="Cost vs context: monthly cost as context grows"
      caption="Cost vs context"
      subcaption="cost rises with accumulated context, then flattens once it truncates at the model window"
      columns={['Context / turn (tokens)', 'Monthly cost', 'Truncated']}
      rows={points.map((p) => [p.context.toLocaleString('en-US'), money(p.central), p.truncated ? 'yes' : 'no'])}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="context"
            tick={{ fill: t.axis, fontSize: 11 }}
            stroke={t.grid}
            tickFormatter={(v) => Number(v).toLocaleString('en-US')}
          />
          <YAxis tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => money(Number(v))} width={64} />
          <Tooltip
            contentStyle={t.tooltip}
            formatter={(value: number) => [money(Number(value)), 'Cost']}
            labelFormatter={(v) => `${Number(v).toLocaleString('en-US')} context tokens/turn`}
          />
          {/* isAnimationActive=false: the chart re-renders on every debounced recompute, and recharts' default
              entrance animation would wipe + redraw the line/dots each keystroke (visible flicker). */}
          <Line type="monotone" dataKey="central" stroke={t.central} strokeWidth={2} dot={renderDot} activeDot={{ r: 5 }} name="Cost" isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </VizFigure>
  );
}
