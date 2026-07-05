// Live token-stream visualizer (§5.7). Renders the tokenized text as colored per-token spans so a user can SEE
// how their text becomes tokens. Real token boundaries when a tokenizer ran (`segments`, already merged so a
// multibyte code point split across tokens shows as the real character, not garbage), or a labeled character-
// chunk APPROXIMATION otherwise (heuristic models like Claude have no client-side tokenizer). Capped at 400
// pieces with a "+N more" marker keyed off the true token count. Every piece renders as a React TEXT NODE (never
// innerHTML), so a pasted `<script>` shows as inert visible text - the component's whole security posture. The
// spans are decorative (each aria-hidden); the group is keyboard-navigable (arrow keys) and a single aria-live
// readout announces the inspected token, so per-token inspection is not pointer-only (WCAG 2.1.1). Owner: TokenTally UI.
import { useState } from 'react';

const RENDER_CAP = 400;

// The approximate stream for heuristic models: split the text into ~`count` roughly-equal chunks BY CODE POINT
// (Array.from is surrogate-aware, so an emoji is never severed into replacement characters) so the number of
// visible chunks tracks the shown token count. Explicitly labeled "approximate" - these are NOT real tokens.
export function approxChunks(text: string, count: number): string[] {
  if (text.length === 0 || count <= 0) return [];
  const cps = Array.from(text);
  const size = Math.max(1, Math.ceil(cps.length / count));
  const out: string[] = [];
  for (let i = 0; i < cps.length; i += size) out.push(cps.slice(i, i + size).join(''));
  return out;
}

export function TokenStream(props: { text: string; count: number; segments: string[] | null; badge: string }): JSX.Element {
  // One "active" index unifies pointer hover and keyboard arrow navigation.
  const [active, setActive] = useState<number | null>(null);
  const approx = props.segments === null;
  const pieces = (props.segments ?? approxChunks(props.text, props.count)).slice(0, RENDER_CAP);
  // "+N more" is the tokens beyond the decode cap, from the true token count - NOT count minus piece count
  // (pieces can be fewer than tokens when multibyte tokens merge, and the approx count uses a different unit).
  const overflow = Math.max(0, props.count - RENDER_CAP);

  const move = (delta: number): void =>
    setActive((a) => Math.min(pieces.length - 1, Math.max(0, (a ?? (delta > 0 ? -1 : pieces.length)) + delta)));

  return (
    <div className="tokenstream__body">
      <p className="tokenstream__summary">
        {props.count.toLocaleString()} tokens ({approx ? 'approximate, not real tokens for this model' : props.badge})
      </p>
      <div
        className="tokenstream__stream"
        role="group"
        tabIndex={0}
        aria-label={`Token stream, ${props.count.toLocaleString()} tokens${approx ? ', approximate' : ''}. Use the left and right arrow keys to inspect tokens.`}
        onMouseLeave={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            move(1);
            e.preventDefault();
          } else if (e.key === 'ArrowLeft') {
            move(-1);
            e.preventDefault();
          } else if (e.key === 'Escape') {
            setActive(null);
          }
        }}
      >
        {pieces.map((piece, i) => (
          <span key={i} aria-hidden="true" className={`tok${active === i ? ' tok--hover' : ''}`} data-odd={i % 2} onMouseEnter={() => setActive(i)}>
            {piece}
          </span>
        ))}
        {overflow > 0 ? <span className="tok tok--more" aria-hidden="true">+{overflow.toLocaleString()} more tokens</span> : null}
      </div>
      {/* aria-live: as the pointer or arrow keys move, the inspected token is announced to a screen reader. */}
      <p className="tokenstream__readout" aria-live="polite">
        {active !== null && pieces[active] !== undefined
          ? `token ${active + 1} of ${pieces.length}: ${JSON.stringify(pieces[active])}`
          : 'Point at or arrow through a token to inspect it.'}
      </p>
    </div>
  );
}
