// Phase 2A application shell. Landmark scaffold + WCAG tablist + theme control. First-paint safe: the only
// engine/registry access is inside the React.lazy mode panels (each its own chunk) and the store's dynamic
// ensureRegistry — nothing here top-level-imports the engine/registry (first-paint-lean gate). Owner:
// TokenTally UI. Version: Phase 2A.
import { lazy, Suspense, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { applyTheme, persistTheme } from '@/shell/ThemeController';
import { ModeNav } from '@/shell/ModeNav';
import { SnapshotStamp } from '@/shell/SnapshotStamp';
import type { Mode, ThemeMode } from '@/store/types';

const PANELS: Record<Mode, React.LazyExoticComponent<() => JSX.Element>> = {
  chatbot: lazy(() => import('@/modes/ChatbotPanel')),
  prompt: lazy(() => import('@/modes/PromptPanel')),
  agent: lazy(() => import('@/modes/AgentPanel')),
  crew: lazy(() => import('@/modes/CrewPanel')),
  denial_of_wallet: lazy(() => import('@/modes/DenialOfWalletPanel')),
};

const THEME_CYCLE: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
const THEME_LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

function App(): JSX.Element {
  const mode = useAppStore((s) => s.mode);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const Panel = PANELS[mode];

  // Load the pricing registry once (dynamic import keeps it out of first-paint).
  useEffect(() => {
    void useAppStore.getState().ensureRegistry();
  }, []);

  // Apply + persist the theme whenever it changes ('system' defers to prefers-color-scheme via CSS).
  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>TokenTally</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            LLM cost forecasting — precision scoped per model, honest ranges everywhere.
          </p>
        </div>
        <button className="btn-secondary" aria-label={`Theme: ${THEME_LABEL[theme]}. Activate to change.`} onClick={() => setTheme(THEME_CYCLE[theme])}>
          Theme: {THEME_LABEL[theme]}
        </button>
      </header>

      <nav aria-label="Calculator mode" style={{ padding: '0 1rem' }}>
        <ModeNav />
      </nav>

      <main id="main" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
        {/* aria-live cost headline region — populated in Phase 2C */}
        <div aria-live="polite" id="cost-headline" />
        <section role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
          <Suspense fallback={<div className="card">Loading…</div>}>
            <Panel />
          </Suspense>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1rem', marginTop: '2rem' }}>
        <SnapshotStamp />
      </footer>
    </>
  );
}

export default App;
