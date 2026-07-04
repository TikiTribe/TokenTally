// Collapsible "How this works" explainer shown at the top of each mode panel. Plain <details>/<summary> —
// no JS, keyboard-accessible natively, CSP-safe. Owner: TokenTally UI. Version: help-1.
import { MODE_EXPLAINER } from '@/config/helpContent';

export function ModeExplainer(props: { mode: string }): JSX.Element | null {
  const e = MODE_EXPLAINER[props.mode];
  if (!e) return null;
  return (
    <details className="explainer">
      <summary>{e.title}</summary>
      <div>{e.body}</div>
    </details>
  );
}
