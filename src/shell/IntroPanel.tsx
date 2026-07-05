// Landing / "what is this" intro shown above the calculator. First-paint-safe: static content only, no
// engine/registry import, so it renders immediately while the pricing snapshot loads. Dismissible with
// localStorage persistence (like the theme) so returning users can collapse it; a slim bar re-opens it.
// CSP-safe (React handlers only, no inline JS). Owner: TokenTally UI. Version: intro-1.
import { useState } from 'react';

const HIDE_KEY = 'tokentally-intro-hidden';

const readHidden = (): boolean => {
  try {
    return localStorage.getItem(HIDE_KEY) === '1';
  } catch {
    return false;
  }
};

const WORKLOADS: [string, string][] = [
  ['Chatbot', 'multi-turn conversations with growing context and prompt caching'],
  ['Prompt / Batch', 'one-shot or high-volume batched API calls'],
  ['Agent', 'a tool-use loop where context accumulates each step'],
  ['Multi-agent', 'a crew of agents sharing a growing transcript'],
  ['Denial of Wallet', 'a defensive worst-case estimate if your endpoint is abused'],
];

export function IntroPanel(): JSX.Element {
  const [hidden, setHidden] = useState<boolean>(readHidden);

  const setAndStore = (next: boolean): void => {
    setHidden(next);
    try {
      localStorage.setItem(HIDE_KEY, next ? '1' : '0');
    } catch {
      /* storage blocked (private mode) — collapse still works for this session */
    }
  };

  if (hidden) {
    return (
      <section aria-label="About TokenTally" className="intro intro--collapsed">
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>New here?</span>
        <button className="btn-secondary" onClick={() => setAndStore(false)}>
          What is TokenTally?
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="intro-heading" className="intro">
      <div className="intro__head">
        <h2 id="intro-heading" style={{ margin: 0, fontSize: '1.25rem' }}>
          Forecast what your LLM feature will cost — before you build it.
        </h2>
        <button className="btn-secondary intro__hide" onClick={() => setAndStore(true)} aria-label="Hide the intro">
          Hide
        </button>
      </div>
      <p className="intro__lead">
        TokenTally turns how your workload actually behaves — prompt sizes, conversation length, request volume —
        into a monthly cost across 1,300+ models, with an honest accuracy label on every number. It runs entirely
        in your browser; your prompt text is never uploaded.
      </p>

      <h3 className="intro__h3">How to use it</h3>
      <ol className="intro__steps">
        <li>
          <strong>Pick a workload and model.</strong> Choose the tab that matches what you are building, then select a
          model from the catalog.
        </li>
        <li>
          <strong>Describe your usage.</strong> Enter real numbers — system-prompt size, messages per conversation,
          monthly volume. Every field has a “?” explaining what it means and how it moves the cost.
        </li>
        <li>
          <strong>Read and act on the forecast.</strong> See the monthly cost, a per-component breakdown, which inputs
          matter most, whether prompt caching pays off, and export a report or share a link.
        </li>
      </ol>

      <h3 className="intro__h3">The five workloads</h3>
      <ul className="intro__workloads">
        {WORKLOADS.map(([name, desc]) => (
          <li key={name}>
            <strong>{name}</strong> — {desc}
          </li>
        ))}
      </ul>

      <h3 className="intro__h3">Good to know</h3>
      <ul className="intro__notes">
        <li>
          Accuracy is scoped <em>per model</em>: <strong>exact</strong> where a real tokenizer runs (OpenAI), a labeled{' '}
          <strong>estimate</strong> otherwise — shown as a badge on every forecast.
        </li>
        <li>
          <strong>Prompt caching is usually the biggest lever.</strong> Give your system prompt a real size to see the
          savings.
        </li>
        <li>
          <strong>Private by design.</strong> Prompt text is tokenized locally and never sent anywhere; shared links
          carry your settings, never your text.
        </li>
        <li>
          Prices are community-mirrored (LiteLLM) and not independently verified against provider billing — the badge
          reflects token-count fidelity only.
        </li>
      </ul>
    </section>
  );
}
