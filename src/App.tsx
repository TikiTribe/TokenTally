// Phase 2A application shell. Landmark scaffold + WCAG tablist + theme control. First-paint safe: the only
// engine/registry access is inside the React.lazy mode panels (each its own chunk) and the store's dynamic
// ensureRegistry — nothing here top-level-imports the engine/registry (first-paint-lean gate). Owner:
// TokenTally UI. Version: Phase 2A.
import { lazy, Suspense, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { applyTheme, persistTheme } from '@/shell/ThemeController';
import { ModeNav } from '@/shell/ModeNav';
import { SnapshotStamp } from '@/shell/SnapshotStamp';
import { WorkflowBar } from '@/shell/WorkflowBar';
import { IntroPanel } from '@/shell/IntroPanel';
import { ResultDisplay } from '@/ui/ResultDisplay';
import { decodePermalink } from '@/store/permalink';
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
  const inputs = useAppStore((s) => s.inputs);
  const selection = useAppStore((s) => s.selection);
  const tokenCounts = useAppStore((s) => s.tokenCounts);
  const registryStatus = useAppStore((s) => s.registryStatus);
  const Panel = PANELS[mode];

  // Load the pricing registry once (dynamic import keeps it out of first-paint).
  useEffect(() => {
    void useAppStore.getState().ensureRegistry();
  }, []);

  // §5.8: apply a config permalink from the URL hash on first load (strictly validated in decodePermalink).
  useEffect(() => {
    const m = /[#&]c=([^&]+)/.exec(window.location.hash);
    if (!m) return;
    const decoded = decodePermalink(m[1]!);
    if (decoded) useAppStore.getState().applyConfig(decoded.mode, decoded.selection, decoded.inputs as Record<string, unknown>);
  }, []);

  // Apply + persist the theme whenever it changes ('system' defers to prefers-color-scheme via CSS).
  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  // Real-time recompute: debounce any relevant change, then run the forecast (dynamic-imports the engine).
  useEffect(() => {
    if (registryStatus !== 'ready') return;
    const t = setTimeout(() => void useAppStore.getState().recompute(), 150);
    return () => clearTimeout(t);
  }, [mode, inputs, selection, tokenCounts, registryStatus]);

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

      <IntroPanel />

      <nav aria-label="Calculator mode" style={{ padding: '0 1rem' }}>
        <ModeNav />
        <div style={{ padding: '0.5rem 0' }}>
          <WorkflowBar />
        </div>
      </nav>

      <main id="main" style={{ padding: '1rem', maxWidth: 720, margin: '0 auto' }}>
        <section role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
          <Suspense fallback={<div className="card">Loading…</div>}>
            <Panel />
          </Suspense>
          <ResultDisplay />
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1rem', marginTop: '2rem' }}>
        <SnapshotStamp />
      </footer>
    </>
  );
}

export default App;
