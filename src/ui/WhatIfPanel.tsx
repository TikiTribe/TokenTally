// Interactive "what-if" sliders on the top sensitivity drivers. The tornado shows which inputs move the cost
// most; this lets the user scrub those inputs and watch the headline (and the tornado) recompute live. A slider
// writes straight to the same store field the number input uses, so dragging is just a fast, exploratory edit -
// the App's debounced recompute (150ms) reprices on every change. Only factors that are directly editable
// numbers are shown; derived/enum factors (a tokenized prompt, the context-strategy enum) are skipped because
// there is no single number to scrub. Like the tornado, this panel is absent when the forecast is $0 (nothing
// swings), so the always-present number inputs are the recovery path if a driver is dragged to zero.
// Owner: TokenTally UI.
import { useState } from 'react';
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
  // Top drivers (already sorted by swing) that are directly editable numbers. Keep at most three so the panel
  // stays a focused "what moves this most", not a second copy of the input form.
  const rows = props.bars.filter((b) => b.swing > 0 && numInput(inputs, b.factor) !== null).slice(0, 3);
  if (rows.length === 0) return null;
  return (
    <figure className="whatif" style={{ margin: '1.25rem 0 0' }}>
      <figcaption className="viz__caption">
        What if <span className="viz__subcaption">drag a top driver to watch the monthly cost above respond</span>
      </figcaption>
      <div className="whatif__rows">
        {rows.map((b) => (
          <WhatIfSlider key={`${mode}:${b.factor}`} mode={mode} factor={b.factor} value={numInput(inputs, b.factor) as number} />
        ))}
      </div>
    </figure>
  );
}
