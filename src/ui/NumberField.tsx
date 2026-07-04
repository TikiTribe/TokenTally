// Phase 2A shared labeled number input (a11y: explicit label + aria-describedby hint). No engine import.
// The optional `help` renders an accessible tooltip beside the label WITHOUT changing the label's accessible
// name (the tip button is a sibling of <label>, so getByLabel(label) still resolves) and is added to the
// input's aria-describedby so screen readers announce it.
import { useId } from 'react';
import { HelpTip } from '@/ui/HelpTip';

export function NumberField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  hint?: string;
  help?: string;
}): JSX.Element {
  const id = useId();
  const hintId = props.hint ? `${id}-hint` : undefined;
  const tipId = props.help ? `${id}-tip` : undefined;
  const describedBy = [hintId, tipId].filter(Boolean).join(' ') || undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
      <span className="field-label-row">
        <label htmlFor={id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {props.label}
        </label>
        {props.help && tipId ? <HelpTip tipId={tipId} content={props.help} /> : null}
      </span>
      <input
        id={id}
        type="number"
        className="input-field"
        value={props.value}
        min={props.min ?? 0}
        step={props.step ?? 1}
        aria-describedby={describedBy}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      {props.hint ? (
        <span id={hintId} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {props.hint}
        </span>
      ) : null}
    </div>
  );
}
