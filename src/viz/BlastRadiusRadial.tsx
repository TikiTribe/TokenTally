// Denial-of-Wallet blast-radius radial (§2D). Concentric rings: the worst-case monthly exposure and the smaller
// exposure that remains after each mitigation, so a defender sees how much each control removes. recharts is
// lazy (never first-paint) and its Tooltip explains each ring on hover. The HARD text fallback for
// disabled/unmodeled/zero lives in DowResult (this only renders once there is a real, positive exposure), so it
// never draws fake geometry for a $0. Owner: TokenTally UI.
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import { chartTheme } from '@/ui/charts/chartTheme';
import { money } from '@/ui/format';
import { VizFigure } from '@/viz/vizA11y';

export interface BlastRing {
  name: string;
  value: number;
}

export function BlastRadiusRadial(props: {
  worstCase: number;
  mitigations: { control: string; savedMonthly: number }[];
}): JSX.Element | null {
  const theme = useAppStore((s) => s.theme);
  void theme;
  const t = chartTheme();
  if (!(props.worstCase > 0)) return null; // belt-and-suspenders; DowResult already guards disabled/zero

  // Outer ring = full exposure; each inner ring = exposure that survives one mitigation (worstCase - saved).
  const rings: (BlastRing & { fill: string })[] = [
    { name: 'Worst case', value: props.worstCase, fill: t.truncated },
    ...props.mitigations.map((m, i) => ({
      name: m.control,
      value: Math.max(0, props.worstCase - m.savedMonthly),
      fill: t.series[i % t.series.length]!,
    })),
  ];

  return (
    <VizFigure
      label="Denial-of-Wallet blast radius"
      caption="Blast radius"
      subcaption="worst-case exposure and what remains after each mitigation"
      columns={['Scenario', 'Monthly exposure']}
      rows={rings.map((r) => [r.name, money(r.value)])}
    >
      <ResponsiveContainer width="100%" height={240}>
        <RadialBarChart data={rings} innerRadius="25%" outerRadius="100%" startAngle={90} endAngle={-270}>
          {/* domain [0, worstCase] so each arc length is proportional to its exposure. */}
          <PolarAngleAxis type="number" domain={[0, props.worstCase]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: t.grid }} cornerRadius={4} />
          <Tooltip
            contentStyle={t.tooltip}
            formatter={(value: number, _n, item: { payload?: { name: string } }) => [money(Number(value)), item.payload?.name ?? '']}
          />
        </RadialBarChart>
      </ResponsiveContainer>
    </VizFigure>
  );
}
