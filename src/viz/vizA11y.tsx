// Accessibility wrapper for the recharts charts. The rendered SVG is decorative (aria-hidden); the accessible
// representation is a visually-hidden data table plus a visible caption, so a screen-reader user gets the exact
// values and a sighted user gets a labeled figure. role="group" + aria-label names the figure WITHOUT pruning
// its children (role="img" is children-presentational and would hide the data table from a screen reader). This
// matches the hand-rolled charts (CostWaterfall/TornadoChart use role="group" for the same reason). Owner: TokenTally UI.
import type { ReactNode } from 'react';

export function VizFigure(props: {
  label: string; // the figure's accessible name (role=group aria-label)
  caption: string; // visible caption
  subcaption?: string; // optional muted explainer beside the caption
  columns: string[];
  rows: (string | number)[][];
  children: ReactNode; // the recharts chart (decorative SVG)
}): JSX.Element {
  return (
    <figure role="group" aria-label={props.label} style={{ margin: '1.25rem 0 0' }}>
      <figcaption className="viz__caption">
        {props.caption}
        {props.subcaption ? <span className="viz__subcaption">{props.subcaption}</span> : null}
      </figcaption>
      {/* The chart is decorative; the table below is the text alternative axe and screen readers consume. */}
      <div aria-hidden="true">{props.children}</div>
      <table className="sr-only">
        <caption>{props.label}</caption>
        <thead>
          <tr>
            {props.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
