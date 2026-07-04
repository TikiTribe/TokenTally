// §5.8 workflow controls: load an example scenario, or copy a shareable permalink (config-only; prompt text
// is never encoded). No engine import (first-paint safe). Owner: TokenTally UI. Version: Phase 3.
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { EXAMPLES } from '@/store/examples';
import { encodePermalink } from '@/store/permalink';

export function WorkflowBar(): JSX.Element {
  const applyConfig = useAppStore((s) => s.applyConfig);
  const [copied, setCopied] = useState(false);

  const loadExample = (id: string): void => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (ex) applyConfig(ex.mode, ex.selection, ex.inputs as Record<string, unknown>);
  };

  const copyLink = (): void => {
    const s = useAppStore.getState();
    const hash = `c=${encodePermalink(s.mode, s.selection, s.inputs)}`;
    window.location.hash = hash;
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    void navigator.clipboard?.writeText(url).then(
      () => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); },
      () => setCopied(false),
    );
  };

  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ fontSize: '0.85rem', display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        Example
        <select className="input-field" defaultValue="" onChange={(e) => loadExample(e.target.value)} style={{ width: 'auto' }}>
          <option value="" disabled>Load a scenario…</option>
          {EXAMPLES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </label>
      <button className="btn-secondary" onClick={copyLink}>
        {copied ? 'Link copied' : 'Copy shareable link'}
      </button>
    </div>
  );
}
