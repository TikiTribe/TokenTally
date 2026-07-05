// Phase 2A mode navigation: a WCAG-AA tablist (role=tablist/tab, roving tabindex, arrow-key + Home/End nav,
// aria-selected). Denial of Wallet is labeled as the opt-in/defensive mode. No engine import (first-paint
// safe). Owner: TokenTally UI. Version: Phase 2A.
import { useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MODES, type Mode } from '@/store/types';

const LABELS: Record<Mode, string> = {
  chatbot: 'Chatbot',
  prompt: 'Prompt / Batch',
  agent: 'Agent',
  crew: 'Multi-agent',
  denial_of_wallet: 'Denial of Wallet',
};

export function ModeNav(): JSX.Element {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number): void => {
    const last = MODES.length - 1;
    let next = index;
    if (e.key === 'ArrowRight') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    else return;
    e.preventDefault();
    const m = MODES[next]!;
    setMode(m);
    tabs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Calculator mode" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {MODES.map((m, i) => {
        const selected = m === mode;
        return (
          <button
            key={m}
            ref={(el) => { tabs.current[i] = el; }}
            role="tab"
            id={`tab-${m}`}
            aria-selected={selected}
            aria-controls={`panel-${m}`}
            tabIndex={selected ? 0 : -1}
            className="mode-tab"
            onClick={() => setMode(m)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}
