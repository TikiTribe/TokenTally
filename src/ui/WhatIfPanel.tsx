// Interactive "what-if" sliders on the top sensitivity drivers. The tornado shows which inputs move the cost
// most; this lets the user scrub those inputs and watch the headline (and the tornado) recompute live. A slider
// writes straight to the same store field the number input uses, so dragging is just a fast, exploratory edit -
// the App's debounced recompute (150ms) reprices on every change. Only factors that are directly editable
// numbers are shown; derived/enum factors (a tokenized prompt, the context-strategy enum) are skipped because
// there is no single number to scrub. The visible driver set is frozen per mode+model (see below), so it does
// not reshuffle under an active drag and stays put even at a $0 forecast. Owner: TokenTally UI.
import { useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { factorLabel } from '@/ui/format';
import type { TornadoBar } from '@/optimization';
import type { Mode, ModeInputs } from '@/store/types';

// Tornado factor keys are engine config names; the ones that are ALSO live numeric store inputs are slidable.
// Bridge through unknown (the inputs object carries non-number fields too) and return null when not a number.
function numInput(inputs: unknown, factor: string): number | null {
  const v = (inputs as Record<string, unknown>)[factor];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// A stable ceiling (~4x the value at mount, rounded up to one significant figure) so the track never rescales
// mid-drag. Frozen at mount alongside the step; if the live value later exceeds it the thumb pins right and the
// readout still shows the true number.
function niceMax(baseline: number): number {
  if (baseline <= 0) return 100;
  const raw = baseline * 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.ceil(raw / mag) * mag;
}

function WhatIfSlider(props: { mode: Mode; factor: string; value: number }): JSX.Element {
  const patch = useAppStore((s) => s.patchInputs);
  // Freeze the range at mount. The key on this component includes mode+factor, so switching mode remounts it and
  // re-freezes against the new field; within a mode the range stays put while the user drags.
  const [range] = useState(() => {
    const max = niceMax(props.value);
    return { max, step: Math.max(1, Math.round(max / 100)) };
  });
  const id = `whatif-${props.factor}`;
  return (
    <div className="whatif__row">
      <label htmlFor={id} className="whatif__name">{factorLabel(props.factor)}</label>
      <input
        id={id}
        type="range"
        className="whatif__range"
        min={0}
        max={range.max}
        step={range.step}
        value={props.value}
        // Writes the same store field the number input uses; the debounced recompute reprices the headline live.
        onChange={(e) =>
          patch(props.mode, { [props.factor]: Number(e.target.value) } as unknown as Partial<ModeInputs[Mode]>)
        }
      />
      <output htmlFor={id} className="whatif__val">{props.value.toLocaleString('en-US')}</output>
    </div>
  );
}

export function WhatIfPanel(props: { bars: TornadoBar[] }): JSX.Element | null {
  const mode = useAppStore((s) => s.mode);
  const inputs = useAppStore((s) => s.inputs[s.mode]);
  const modelKey = useAppStore((s) => s.selection[s.mode].canonicalId);
  // Freeze the visible driver set per mode+model. The engine re-sorts the bars by swing on every recompute, so
  // deriving the top three live would let an active drag reorder - or even unmount - its own slider once a swing
  // crosses a neighbor (agent mode has four numeric drivers capped to three). Lock the set the first time drivers
  // are available for a mode+model and only re-derive when that key changes (a real ranking change), never on a
  // value edit. Because it stays locked it also persists at a $0 forecast, so a driver dragged to zero can be
  // dragged straight back up instead of the panel vanishing with the tornado.
  const cache = useRef<{ key: string; factors: string[] }>({ key: '', factors: [] });
  const key = `${mode}:${modelKey}`;
  if (cache.current.key !== key || cache.current.factors.length === 0) {
    const qualifying = props.bars
      .filter((b) => b.swing > 0 && numInput(inputs, b.factor) !== null)
      .slice(0, 3)
      .map((b) => b.factor);
    if (qualifying.length > 0 || cache.current.key !== key) cache.current = { key, factors: qualifying };
  }
  const factors = cache.current.key === key ? cache.current.factors : [];
  if (factors.length === 0) return null;
  return (
    <figure className="whatif" style={{ margin: '1.25rem 0 0' }}>
      <figcaption className="viz__caption">
        What if <span className="viz__subcaption">drag a top driver to watch the monthly cost above respond</span>
      </figcaption>
      <div className="whatif__rows">
        {factors.map((factor) => {
          const value = numInput(inputs, factor);
          return value === null ? null : (
            <WhatIfSlider key={`${mode}:${factor}`} mode={mode} factor={factor} value={value} />
          );
        })}
      </div>
    </figure>
  );
}
