// Tutorial-feel quick-start shown above the calculator: the 3-step flow at a glance + one-click example
// scenarios. Loading an example applies a full config (mode + model + inputs) so a first-timer sees a real
// forecast immediately. No engine import (first-paint safe). Owner: TokenTally UI. Version: landing-1.
import { useAppStore } from '@/store/useAppStore';
import { EXAMPLES } from '@/store/examples';

const STEPS = ['Pick a workload & model', 'Describe your usage', 'Read your forecast'];

export function GuideStrip(): JSX.Element {
  const applyConfig = useAppStore((s) => s.applyConfig);
  const load = (id: string): void => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (ex) applyConfig(ex.mode, ex.selection, ex.inputs as Record<string, unknown>);
  };

  return (
    <section className="guide" aria-label="Getting started">
      <ol className="guide__steps">
        {STEPS.map((s, i) => (
          <li key={s} className="guide__step">
            <span className="guide__num">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="guide__examples">
        <span className="guide__label">New here? Start from an example:</span>
        <div className="guide__chips">
          {EXAMPLES.map((e) => (
            <button key={e.id} type="button" className="chip" onClick={() => load(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
