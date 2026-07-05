// Phase 2D tornado sensitivity chart (hand-rolled SVG). Each factor is a horizontal bar spanning the
// monthly cost as that input swings ±20%, sorted by swing (biggest lever first - the engine pre-sorts).
// Zero-swing factors (allowlist-rejected or no leverage) render inert. CSP-safe SVG; data-table alternative.
// Owner: TokenTally UI. Version: Phase 2D.
import { VizFigure } from '@/viz/vizA11y';
import type { TornadoBar } from '@/optimization';

const W = 320;
const ROW_H = 22;
const PAD_L = 4;
const PAD_R = 4;

const money = (n: number): string => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function TornadoChart(props: { bars: TornadoBar[] }): JSX.Element | null {
  const bars = props.bars.filter((b) => b.swing > 0);
  if (bars.length === 0) return null;
  const lo = Math.min(...bars.map((b) => b.low));
  const hi = Math.max(...bars.map((b) => b.high));
  const span = Math.max(hi - lo, Number.MIN_VALUE);
  const x = (v: number): number => PAD_L + ((v - lo) / span) * (W - PAD_L - PAD_R);
  const H = bars.length * ROW_H + 4;

  return (
    <VizFigure
      label="Cost sensitivity (each input ±20%)"
      columns={['Factor', 'Low', 'High', 'Swing']}
      rows={bars.map((b) => [b.factor, money(b.low), money(b.high), money(b.swing)])}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} focusable="false">
        {bars.map((b, i) => {
          const y = i * ROW_H + 4;
          const x0 = Math.min(x(b.low), x(b.high));
          const w = Math.abs(x(b.high) - x(b.low));
          return (
            <g key={b.factor}>
              <rect x={x0} y={y} width={Math.max(w, 1)} height={ROW_H - 8} fill="var(--primary)" rx="2" />
            </g>
          );
        })}
      </svg>
    </VizFigure>
  );
}
