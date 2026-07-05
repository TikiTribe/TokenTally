// Live token-stream visualizer (§5.7). Renders the tokenized text as colored per-token spans so a user can SEE
// how their text becomes tokens. Real token boundaries when a tokenizer ran (`segments`), a labeled character-
// chunk APPROXIMATION otherwise (heuristic models like Claude have no client-side tokenizer). Capped at 400
// spans with a "+N more" marker. Every piece renders as a React TEXT NODE (never innerHTML), so a pasted
// `<script>` shows as inert visible text - this is the whole security posture of the component. A single shared
// readout below the stream reports the hovered token (one state, not a tooltip per span). Owner: TokenTally UI.
import { useState } from 'react';

const RENDER_CAP = 400;

// The approximate stream for heuristic models: split the text into ~`count` roughly-equal character chunks so
// the number of visible chunks tracks the shown token count. Explicitly labeled "approximate" in the UI - these
// are NOT the model's real tokens, just a visual sense of the split.
export function approxChunks(text: string, count: number): string[] {
  if (text.length === 0 || count <= 0) return [];
  const size = Math.max(1, Math.ceil(text.length / count));
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

export function TokenStream(props: { text: string; count: number; segments: string[] | null; badge: string }): JSX.Element {
  const [hovered, setHovered] = useState<{ i: number; piece: string } | null>(null);
  const approx = props.segments === null;
  const pieces = (props.segments ?? approxChunks(props.text, props.count)).slice(0, RENDER_CAP);
  const overflow = Math.max(0, props.count - pieces.length);

  return (
    <div className="tokenstream__body">
      {/* The visible, screen-reader-facing summary. The colored spans below are decorative (aria-hidden). */}
      <p className="tokenstream__summary">
        {props.count.toLocaleString()} tokens ({approx ? 'approximate, not real tokens for this model' : props.badge})
      </p>
      <div className="tokenstream__stream" aria-hidden="true" onMouseLeave={() => setHovered(null)}>
        {pieces.map((piece, i) => (
          <span
            key={i}
            className={`tok${hovered?.i === i ? ' tok--hover' : ''}`}
            data-odd={i % 2}
            onMouseEnter={() => setHovered({ i, piece })}
          >
            {piece}
          </span>
        ))}
        {overflow > 0 ? <span className="tok tok--more">+{overflow.toLocaleString()} more tokens</span> : null}
      </div>
      <p className="tokenstream__readout">
        {hovered ? `token ${hovered.i + 1} of ${props.count.toLocaleString()}: ${JSON.stringify(hovered.piece)}` : 'Hover a token to inspect it.'}
      </p>
    </div>
  );
}
