// Cost-vs-context scatter (§2D). Sweeps per-turn context growth and plots monthly cost, so a user sees how
// accumulating context drives cost and where it flattens once the context truncates at the model window. Points
// past the window get a distinct color/series (the contextTruncated marker). recharts is lazy (never first-paint)
// and its Tooltip explains each point on hover. Chatbot/prompt only. Owner: TokenTally UI.
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { chartTheme } from '@/ui/charts/chartTheme';
import { money } from '@/ui/format';
import { VizFigure } from '@/viz/vizA11y';
import type { ContextPoint } from '@/store/engineClient';

export function CostVsContextScatter(props: { points: ContextPoint[] | null }): JSX.Element | null {
  const theme = useAppStore((s) => s.theme);
  void theme;
  const t = chartTheme();
  const points = props.points;
  if (points === null || points.length < 2) return null;
  const within = points.filter((p) => !p.truncated);
  const truncated = points.filter((p) => p.truncated);

  return (
    <VizFigure
      label="Cost vs context: monthly cost as context grows"
      caption="Cost vs context"
      subcaption="cost rises with accumulated context, then flattens once it truncates at the model window"
      columns={['Context / turn (tokens)', 'Monthly cost', 'Truncated']}
      rows={points.map((p) => [p.context.toLocaleString('en-US'), money(p.central), p.truncated ? 'yes' : 'no'])}
    >
      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={t.grid} strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="context"
            name="Context/turn"
            tick={{ fill: t.axis, fontSize: 11 }}
            stroke={t.grid}
            tickFormatter={(v) => Number(v).toLocaleString('en-US')}
          />
          <YAxis type="number" dataKey="central" name="Cost" tick={{ fill: t.axis, fontSize: 11 }} stroke={t.grid} tickFormatter={(v) => money(Number(v))} width={64} />
          <Tooltip
            contentStyle={t.tooltip}
            formatter={(value: number, name: string) => [name === 'Cost' ? money(Number(value)) : Number(value).toLocaleString('en-US'), name]}
          />
          <Scatter data={within} fill={t.central} name="Within window" />
          {truncated.length > 0 ? <Scatter data={truncated} fill={t.truncated} name="Truncated at window" /> : null}
        </ScatterChart>
      </ResponsiveContainer>
    </VizFigure>
  );
}
