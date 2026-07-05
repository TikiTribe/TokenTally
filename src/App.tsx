// Application shell + client-side view routing (hash-based). Two views: the marketing LANDING (home) and the
// calculator APP. First-paint safe: the landing is static content; the engine/registry only load inside the
// React.lazy mode panels and the store's dynamic ensureRegistry. Routing: '' -> home, '#calculator' -> app,
// '#c=…' (a config permalink) -> app. Owner: TokenTally UI. Version: landing-1.
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { applyTheme, persistTheme } from '@/shell/ThemeController';
import { ModeNav } from '@/shell/ModeNav';
import { SnapshotStamp } from '@/shell/SnapshotStamp';
import { WorkflowBar } from '@/shell/WorkflowBar';
import { GuideStrip } from '@/shell/GuideStrip';
import { ResultDisplay } from '@/ui/ResultDisplay';
import { LandingPage } from '@/landing/LandingPage';
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

const PERMALINK_RE = /[#&]c=([^&]+)/;
type View = 'home' | 'app';
function viewFromHash(): View {
  const h = window.location.hash;
  if (PERMALINK_RE.test(h) || h === '#calculator' || h === '#app') return 'app';
  return 'home';
}

function App(): JSX.Element {
  const mode = useAppStore((s) => s.mode);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const inputs = useAppStore((s) => s.inputs);
  const selection = useAppStore((s) => s.selection);
  const tokenCounts = useAppStore((s) => s.tokenCounts);
  const registryStatus = useAppStore((s) => s.registryStatus);
  const Panel = PANELS[mode];

  const [view, setView] = useState<View>(viewFromHash);
  const cycleTheme = (): void => setTheme(THEME_CYCLE[theme]);
  const goToApp = (): void => {
    if (!PERMALINK_RE.test(window.location.hash)) window.location.hash = 'calculator';
    setView('app');
  };
  const goHome = (): void => {
    window.location.hash = '';
    setView('home');
  };

  // Keep the view in sync with browser back/forward + manual hash edits.
  useEffect(() => {
    const onHash = (): void => setView(viewFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Load the pricing registry once the calculator is in view (dynamic import keeps it out of first-paint).
  useEffect(() => {
    if (view === 'app') void useAppStore.getState().ensureRegistry();
  }, [view]);

  // §5.8: apply a config permalink from the URL hash on first load (strictly validated in decodePermalink).
  useEffect(() => {
    const m = PERMALINK_RE.exec(window.location.hash);
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
    if (view !== 'app' || registryStatus !== 'ready') return;
    const t = setTimeout(() => void useAppStore.getState().recompute(), 150);
    return () => clearTimeout(t);
  }, [view, mode, inputs, selection, tokenCounts, registryStatus]);

  if (view === 'home') {
    return <LandingPage onLaunch={goToApp} theme={theme} onCycleTheme={cycleTheme} />;
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <a className="app-brand" href="#" onClick={(e) => { e.preventDefault(); goHome(); }}>
          <span className="lp-brand__mark" aria-hidden="true">₸</span>
          <span>TokenTally</span>
        </a>
        <button className="btn-secondary" aria-label={`Theme: ${THEME_LABEL[theme]}. Activate to change.`} onClick={cycleTheme}>
          Theme: {THEME_LABEL[theme]}
        </button>
      </header>

      <div className="app-shell">
        <GuideStrip />

        <nav aria-label="Calculator mode" className="app-modenav">
          <ModeNav />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.75rem 0 0' }}>
            <WorkflowBar />
          </div>
        </nav>

        <main id="main" className="app-main">
          <h1 className="sr-only">TokenTally — LLM cost calculator</h1>
          <section role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
            <Suspense fallback={<div className="card">Loading…</div>}>
              <Panel />
            </Suspense>
            <ResultDisplay />
          </section>
        </main>

        <footer className="app-footer">
          <SnapshotStamp />
        </footer>
      </div>
    </>
  );
}

export default App;
