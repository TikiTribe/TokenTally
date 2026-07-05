// Phase 2D shared chart a11y wrapper. Every hand-rolled SVG chart is decorative (aria-hidden) and paired
// with a visually-hidden data table that IS the accessible representation (WCAG: charts need a text
// alternative + keyboard-reachable data). No injected styles - SVG attributes only, so it is CSP-safe under
// style-src 'self'. Owner: TokenTally UI. Version: Phase 2D.
import type { ReactNode } from 'react';

const srOnly: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};

export function VizFigure(props: {
  label: string;
  columns: string[];
  rows: (string | number)[][];
  children: ReactNode; // the SVG (aria-hidden)
}): JSX.Element {
  return (
    <figure role="group" aria-label={props.label} style={{ margin: '1rem 0' }}>
      <div aria-hidden="true">{props.children}</div>
      <table style={srOnly}>
        <caption>{props.label}</caption>
        <thead>
          <tr>{props.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {props.rows.map((r, i) => (
            <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
