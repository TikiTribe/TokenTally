// Bold, modern-SaaS landing page (its own view). First-paint-safe: static content only, no engine/registry/
// tokenizer import, so it renders instantly. CSP-safe: inline SVG + CSS gradients, no external assets, React
// handlers only. Themed via CSS custom-property tokens. Owner: TokenTally UI. Version: landing-1.
import type { ThemeMode } from '@/store/types';
import {
  IconChat, IconBatch, IconAgent, IconCrew, IconShield, IconTarget, IconSliders, IconChart,
  IconBadge, IconBolt, IconLock, IconDownload, IconLink, IconArrow,
} from '@/landing/icons';
import '@/landing/landing.css';

const THEME_LABEL: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };

const WORKLOADS = [
  { icon: IconChat, name: 'Chatbot', desc: 'Multi-turn conversations with growing context and prompt caching.' },
  { icon: IconBatch, name: 'Prompt / Batch', desc: 'One-shot or high-volume batched API calls.' },
  { icon: IconAgent, name: 'Agent', desc: 'A tool-use loop where context accumulates every step.' },
  { icon: IconCrew, name: 'Multi-agent', desc: 'A crew of agents sharing a growing transcript.' },
  { icon: IconShield, name: 'Denial of Wallet', desc: 'A defensive worst-case estimate if your endpoint is abused.' },
];

const STEPS = [
  { icon: IconTarget, n: '1', title: 'Pick a workload & model', body: 'Choose the pattern you are building and a model from a catalog of 1,300+.' },
  { icon: IconSliders, n: '2', title: 'Describe your usage', body: 'Enter real numbers — prompt sizes, turns, monthly volume. Every field explains how it moves the cost.' },
  { icon: IconChart, n: '3', title: 'Read & act on the forecast', body: 'See the monthly cost, a per-component breakdown, what matters most, and export or share it.' },
];

const FEATURES = [
  { icon: IconBadge, title: 'Honest, per-model accuracy', body: 'Exact where a real tokenizer runs, a labeled estimate otherwise — shown as a badge on every number.' },
  { icon: IconBolt, title: 'Prompt-cache modeling', body: 'See when caching pays off, with a warm-cache break-even and conservative bound.' },
  { icon: IconLock, title: 'Private by design', body: 'Prompt text is tokenized in your browser and never uploaded. Shared links carry settings, not text.' },
  { icon: IconChart, title: 'Sensitivity analysis', body: 'A tornado view shows which inputs move your bill the most, so you optimize the right thing.' },
  { icon: IconDownload, title: 'Exports', body: 'Download a CSV or a PDF report — with CSV formula-injection protection built in.' },
  { icon: IconLink, title: 'Shareable permalinks', body: 'Send a link that reopens your exact configuration for a teammate to review.' },
];

const STATS = [
  { v: '1,300+', l: 'models priced' },
  { v: '5', l: 'workload types' },
  { v: 'Exact', l: 'OpenAI tokenization' },
  { v: '$0', l: 'no signup, browser-only' },
];

export function LandingPage(props: { onLaunch: () => void; theme: ThemeMode; onCycleTheme: () => void }): JSX.Element {
  const launch = (
    <button className="btn-primary lp-cta" onClick={props.onLaunch}>
      Start calculating <IconArrow />
    </button>
  );

  return (
    <div className="lp">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="lp-nav">
        <div className="lp-nav__inner">
          <a className="lp-brand" href="#" onClick={(e) => { e.preventDefault(); props.onLaunch(); }}>
            <span className="lp-brand__mark" aria-hidden="true">₸</span>
            <span>TokenTally</span>
          </a>
          <nav className="lp-nav__links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#workloads">Workloads</a>
            <a href="#features">Features</a>
          </nav>
          <div className="lp-nav__actions">
            <button className="btn-secondary lp-nav__theme" aria-label={`Theme: ${THEME_LABEL[props.theme]}. Activate to change.`} onClick={props.onCycleTheme}>
              {THEME_LABEL[props.theme]}
            </button>
            <button className="btn-primary" onClick={props.onLaunch}>Launch calculator</button>
          </div>
        </div>
      </header>

      <main id="main">
        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero__grid">
            <div className="lp-hero__copy">
              <span className="lp-eyebrow">LLM cost forecasting</span>
              <h1 className="lp-h1">
                Know what your LLM feature costs — <span className="lp-grad">before you build it.</span>
              </h1>
              <p className="lp-lead">
                TokenTally turns how your workload actually behaves — prompt sizes, conversation length, request
                volume — into a precise monthly cost across 1,300+ models, with an honest accuracy label on every
                number. It runs entirely in your browser.
              </p>
              <div className="lp-hero__ctas">
                {launch}
                <a className="btn-secondary" href="#how">See how it works</a>
              </div>
              <p className="lp-trust">Exact OpenAI tokenization · No signup · Your prompts never leave the browser</p>
            </div>

            {/* Product preview (stylized mock forecast) */}
            <div className="lp-preview" aria-hidden="true">
              <div className="lp-preview__card">
                <div className="lp-preview__tabs">
                  <span className="is-active">Chatbot</span><span>Agent</span><span>Batch</span>
                </div>
                <div className="lp-preview__headline">
                  <span className="lp-preview__money">$143.75</span>
                  <span className="lp-preview__per">/ month</span>
                </div>
                <span className="lp-preview__badge">exact · gpt-4o</span>
                <div className="lp-preview__bars">
                  <div className="lp-preview__bar"><span>input</span><i style={{ width: '30%' }} /><b>$43.75</b></div>
                  <div className="lp-preview__bar"><span>output</span><i style={{ width: '70%' }} /><b>$100</b></div>
                  <div className="lp-preview__bar"><span>cache</span><i style={{ width: '6%' }} /><b>$0</b></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="lp-stats" aria-label="At a glance">
          {STATS.map((s) => (
            <div key={s.l} className="lp-stat">
              <div className="lp-stat__v">{s.v}</div>
              <div className="lp-stat__l">{s.l}</div>
            </div>
          ))}
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="lp-section">
          <div className="lp-section__head">
            <span className="lp-eyebrow">How it works</span>
            <h2 className="lp-h2">Three steps to a defensible cost estimate</h2>
          </div>
          <div className="lp-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step">
                <div className="lp-step__icon"><s.icon /></div>
                <div className="lp-step__n">Step {s.n}</div>
                <h3 className="lp-card__title">{s.title}</h3>
                <p className="lp-card__body">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WORKLOADS */}
        <section id="workloads" className="lp-section">
          <div className="lp-section__head">
            <span className="lp-eyebrow">Built for real patterns</span>
            <h2 className="lp-h2">Five workloads, one engine</h2>
            <p className="lp-section__sub">Each models the token economics that actually drive its cost — context growth, cached prefixes, per-step accumulation.</p>
          </div>
          <div className="lp-cards">
            {WORKLOADS.map((w) => (
              <div key={w.name} className="lp-card lp-card--work">
                <div className="lp-card__icon"><w.icon /></div>
                <h3 className="lp-card__title">{w.name}</h3>
                <p className="lp-card__body">{w.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="lp-section">
          <div className="lp-section__head">
            <span className="lp-eyebrow">Why TokenTally</span>
            <h2 className="lp-h2">Precision you can defend, transparency you can trust</h2>
          </div>
          <div className="lp-cards lp-cards--3">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-card">
                <div className="lp-card__icon lp-card__icon--sm"><f.icon /></div>
                <h3 className="lp-card__title">{f.title}</h3>
                <p className="lp-card__body">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="lp-final">
          <div className="lp-final__inner">
            <h2 className="lp-h2">Ready to forecast your costs?</h2>
            <p className="lp-final__sub">No account, no backend — open the calculator and get a number in seconds.</p>
            {launch}
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer__inner">
          <span className="lp-brand"><span className="lp-brand__mark" aria-hidden="true">₸</span> TokenTally</span>
          <p className="lp-footer__note">
            Prices are community-mirrored (LiteLLM) and not independently verified against provider billing; the
            accuracy badge reflects token-count fidelity only.
          </p>
        </div>
      </footer>
    </div>
  );
}
