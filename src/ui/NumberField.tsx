// Phase 2A shared labeled number input (a11y: explicit label + aria-describedby hint). No engine import.
import { useId } from 'react';

export function NumberField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  hint?: string;
}): JSX.Element {
  const id = useId();
  const hintId = props.hint ? `${id}-hint` : undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
      <label htmlFor={id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {props.label}
      </label>
      <input
        id={id}
        type="number"
        className="input-field"
        value={props.value}
        min={props.min ?? 0}
        step={props.step ?? 1}
        aria-describedby={hintId}
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
