// Registry-backed model picker: a searchable, vendor-grouped combobox (WAI-ARIA combobox + listbox). The
// catalog has 2,300+ models, so a plain select is unwieldy; this filters as you type and groups results by
// vendor. CSP-safe (React handlers + a document pointer listener, no inline JS). Interpolated displayName/
// deployment are A7-sanitized at the registry source and render as text nodes only. Owner: TokenTally UI.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { listByMode } from '@/registry';
import { useAppStore } from '@/store/useAppStore';
import { HelpTip } from '@/ui/HelpTip';
import type { Mode, ModelSelection } from '@/store/types';

const MAX_RESULTS = 60; // cap the rendered listbox; "keep typing" narrows the rest

// Map the registry's underlyingFamily to a human vendor label + a display order for the common vendors.
const VENDOR_LABEL: Record<string, string> = {
  claude: 'Anthropic', openai: 'OpenAI', gemini_gemma: 'Google', llama: 'Meta (Llama)', grok: 'xAI (Grok)',
  qwen: 'Qwen (Alibaba)', deepseek: 'DeepSeek', mistral: 'Mistral', amazon: 'Amazon', cohere: 'Cohere',
  ai21: 'AI21', kimi: 'Moonshot (Kimi)', perplexity: 'Perplexity', phi: 'Microsoft (Phi)', voyage: 'Voyage',
  dbrx: 'Databricks', aleph_alpha: 'Aleph Alpha', yi: '01.AI (Yi)', granite: 'IBM (Granite)', unknown: 'Other',
};
const VENDOR_ORDER = ['claude', 'openai', 'gemini_gemma', 'llama', 'grok', 'qwen', 'deepseek', 'mistral'];
const vendorLabel = (family: string): string =>
  VENDOR_LABEL[family] ?? family.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const vendorRank = (family: string): number => {
  const i = VENDOR_ORDER.indexOf(family);
  return i === -1 ? VENDOR_ORDER.length : i;
};

interface Opt { key: string; label: string; vendor: string; search: string }

export function ModelSelector(props: { mode: Mode; help?: string }): JSX.Element {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const registryStatus = useAppStore((s) => s.registryStatus);
  const selection = useAppStore((s) => s.selection[props.mode]);
  const setSelection = useAppStore((s) => s.setSelection);

  // All chat models as a flat list, sorted by vendor rank then label (so vendors stay contiguous for headers).
  const all = useMemo<Opt[]>(() => {
    if (registryStatus !== 'ready') return [];
    return listByMode('chat')
      .map((m) => {
        const vendor = vendorLabel(m.underlyingFamily || 'unknown');
        const label = `${m.displayName} (${m.deployment})`;
        return {
          key: `${m.canonicalId}|${m.deployment}`,
          label,
          vendor,
          rank: vendorRank(m.underlyingFamily || 'unknown'),
          search: `${label} ${vendor}`.toLowerCase(),
        };
      })
      .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
      .map(({ key, label, vendor, search }) => ({ key, label, vendor, search }));
  }, [registryStatus]);

  const currentKey = `${selection.canonicalId}|${selection.deployment}`;
  const currentLabel = all.find((o) => o.key === currentKey)?.label ?? `${selection.canonicalId} (${selection.deployment})`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => (q ? all.filter((o) => o.search.includes(q)) : all), [all, q]);
  const filtered = matches.slice(0, MAX_RESULTS);

  useEffect(() => { if (active > filtered.length - 1) setActive(0); }, [filtered.length, active]);

  // Close on outside pointer / Escape (Escape handled in onKeyDown).
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: Event): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (o: Opt): void => {
    const sep = o.key.indexOf('|');
    const s: ModelSelection = { canonicalId: o.key.slice(0, sep), deployment: o.key.slice(sep + 1) };
    setSelection(props.mode, s);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { setOpen(true); return; } setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Home' && open) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && open) { e.preventDefault(); setActive(filtered.length - 1); }
    else if (e.key === 'Enter' && open) { e.preventDefault(); const o = filtered[active]; if (o) choose(o); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
  };

  const activeId = open && filtered[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <div className="field-block">
      <span className="field-label-row">
        <label htmlFor={inputId} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Model</label>
        {props.help ? <HelpTip tipId={`${inputId}-tip`} content={props.help} /> : null}
      </span>
      <div className="combo" ref={rootRef}>
        <input
          id={inputId}
          className="input-field"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-describedby={props.help ? `${inputId}-tip` : undefined}
          autoComplete="off"
          disabled={registryStatus !== 'ready'}
          placeholder={registryStatus !== 'ready' ? 'Loading models…' : 'Search 2,300+ models…'}
          value={open ? query : currentLabel}
          onFocus={() => { setOpen(true); setQuery(''); setActive(0); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={onKeyDown}
        />
        {open ? (
          <ul id={listId} role="listbox" aria-label="Models" className="combo__list" ref={listRef}>
            {filtered.length === 0 ? (
              <li role="presentation" className="combo__empty">No models match “{query}”.</li>
            ) : (
              filtered.map((o, i) => {
                const header = i === 0 || filtered[i - 1]!.vendor !== o.vendor;
                return (
                  <li key={o.key} role="presentation">
                    {header ? <div className="combo__group" aria-hidden="true">{o.vendor}</div> : null}
                    <div
                      id={`${listId}-opt-${i}`}
                      role="option"
                      aria-selected={o.key === currentKey}
                      data-active={i === active}
                      className={`combo__opt${i === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onPointerDown={(e) => { e.preventDefault(); choose(o); }}
                    >
                      {o.label}
                    </div>
                  </li>
                );
              })
            )}
            {matches.length > MAX_RESULTS ? (
              <li role="presentation" className="combo__more">Showing {MAX_RESULTS} of {matches.length}. Keep typing to narrow.</li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
