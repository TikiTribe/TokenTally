// Phase 2B: a textarea whose token count is computed live off the main thread (via useTokenizer). The count
// + badge render as text nodes in an aria-live region; the badge is the RUNTIME TokenCount.badge (P2-A10),
// the fidelity of THIS count. Owner: TokenTally UI. Version: Phase 2B.
import { useId } from 'react';
import { useTokenizer } from '@/hooks/useTokenizer';
import { useAppStore } from '@/store/useAppStore';

export function TokenizedTextArea(props: {
  label: string;
  fieldId: string;
  modelId: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}): JSX.Element {
  const id = useId();
  useTokenizer(props.fieldId, props.modelId, props.value);
  const tc = useAppStore((s) => s.tokenCounts[props.fieldId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
      <label htmlFor={id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {props.label}
      </label>
      <textarea
        id={id}
        className="input-field"
        rows={4}
        value={props.value}
        aria-describedby={`${id}-count`}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <span id={`${id}-count`} aria-live="polite" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        {props.value.length === 0
          ? 'Enter text to count tokens'
          : tc
            ? `${tc.count.toLocaleString()} tokens · ${tc.badge}${tc.truncated ? ' · truncated' : ''}`
            : 'counting…'}
      </span>
      {props.hint ? (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{props.hint}</span>
      ) : null}
    </div>
  );
}
