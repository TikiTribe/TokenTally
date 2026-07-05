// Tornado sensitivity: how each input, swung +/-20%, moves the monthly cost. Rebuilt from a bare aria-hidden
// SVG (unreadable to sighted users) into a labeled diverging-bar chart: readable factor names, a baseline at
// the current cost, a bar from the low to the high cost on a shared dollar scale, the swing shown as text,
// and a hover title. A visually-hidden data table stays as a redundant screen-reader aid. Owner: TokenTally UI.
import { money, factorLabel } from '@/ui/format';
import type { TornadoBar } from '@/optimization';

export function TornadoChart(props: { bars: TornadoBar[]; central: number }): JSX.Element | null {
  const bars = props.bars.filter((b) => b.swing > 0);
  if (bars.length === 0) return null;
  const lo = Math.min(...bars.map((b) => b.low), props.central);
  const hi = Math.max(...bars.map((b) => b.high), props.central);
  const span = Math.max(hi - lo, Number.MIN_VALUE);
  const pct = (v: number): number => ((v - lo) / span) * 100;

  return (
    <figure role="group" aria-label="Cost sensitivity (each input swung plus or minus 20%)" style={{ margin: '1.25rem 0 0' }}>
      <figcaption className="viz__caption">
        Sensitivity <span className="viz__subcaption">how each input (±20%) moves your monthly cost</span>
      </figcaption>
      <div className="tornado" style={{ ['--baseline' as string]: `${pct(props.central)}%` }}>
        <ul className="tornado__rows">
          {bars.map((b) => {
            const left = pct(Math.min(b.low, b.high));
            const width = Math.max(pct(Math.max(b.low, b.high)) - left, 0.75);
            const name = factorLabel(b.factor);
            return (
              <li
                key={b.factor}
                className="tornado__row"
                title={`${name}: ${money(b.low)} to ${money(b.high)} as this input swings ±20% (swing ${money(b.swing)})`}
              >
                <span className="tornado__name">{name}</span>
                <span className="tornado__track" aria-hidden="true">
                  <span className="tornado__baseline" />
                  <span className="tornado__bar" style={{ left: `${left}%`, width: `${width}%` }} />
                </span>
                <span className="tornado__swing">±{money(b.swing / 2)}</span>
              </li>
            );
          })}
        </ul>
        <div className="tornado__foot" aria-hidden="true">
          baseline = your current estimate ({money(props.central)})
        </div>
      </div>
      {/* Redundant screen-reader representation (the visible chart above is the primary one now). */}
      <table className="sr-only">
        <caption>Cost sensitivity: each input swung plus or minus 20%</caption>
        <thead>
          <tr>
            <th scope="col">Factor</th>
            <th scope="col">Low</th>
            <th scope="col">High</th>
            <th scope="col">Swing</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((b) => (
            <tr key={b.factor}>
              <td>{factorLabel(b.factor)}</td>
              <td>{money(b.low)}</td>
              <td>{money(b.high)}</td>
              <td>{money(b.swing)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
