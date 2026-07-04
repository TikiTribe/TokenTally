// Phase 2A registry-backed model selector. Imports the registry QUERY API (@/registry) — safe because this
// renders INSIDE a React.lazy mode panel, so the query module lands in the panel's lazy chunk, never
// first-paint (the 573KB catalog is separately lazy via bootstrapRegistry). Lists chat-mode models as
// (canonicalId, deployment) options. Interpolated displayName/deployment are A7-sanitized at the registry
// source and render as text nodes only. Owner: TokenTally UI. Version: Phase 2A.
import { useId, useMemo } from 'react';
import { listByMode } from '@/registry';
import { useAppStore } from '@/store/useAppStore';
import { HelpTip } from '@/ui/HelpTip';
import type { Mode, ModelSelection } from '@/store/types';

export function ModelSelector(props: { mode: Mode; help?: string }): JSX.Element {
  const id = useId();
  const registryStatus = useAppStore((s) => s.registryStatus);
  const selection = useAppStore((s) => s.selection[props.mode]);
  const setSelection = useAppStore((s) => s.setSelection);

  // Recompute the option list only when the registry becomes ready.
  const options = useMemo(() => {
    if (registryStatus !== 'ready') return [];
    return listByMode('chat')
      .map((m) => ({ key: `${m.canonicalId}|${m.deployment}`, label: `${m.displayName} (${m.deployment})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [registryStatus]);

  const currentKey = `${selection.canonicalId}|${selection.deployment}`;

  const onChange = (key: string): void => {
    const sep = key.indexOf('|');
    const s: ModelSelection = { canonicalId: key.slice(0, sep), deployment: key.slice(sep + 1) };
    setSelection(props.mode, s);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.75rem' }}>
      <span className="field-label-row">
        <label htmlFor={id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Model
        </label>
        {props.help ? <HelpTip tipId={`${id}-tip`} content={props.help} /> : null}
      </span>
      <select
        id={id}
        className="input-field"
        value={currentKey}
        disabled={registryStatus !== 'ready'}
        aria-describedby={props.help ? `${id}-tip` : undefined}
        onChange={(e) => onChange(e.target.value)}
      >
        {registryStatus !== 'ready' ? (
          <option>Loading models…</option>
        ) : (
          options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
