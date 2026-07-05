// Accessible, CSP-safe help tooltip. No inline scripts (script-src 'self'): all handlers are React synthetic
// events + a document ESC/pointer listener in a useEffect. WCAG 2.1 SC 1.4.13 compliant - shows on BOTH hover
// and focus, is dismissable (ESC), and is hoverable/persistent. Visibility is a single source of truth:
// open = hover || focus, so moving the mouse away never dismisses a focus-opened tip, and a short close delay
// bridges the gap between the button and the floating bubble so a pointer user can move onto the content
// (SC 1.4.13 "hoverable"). The content span is always in the DOM (sr-only when closed) so the field's
// aria-describedby always resolves for screen readers. Owner: TokenTally UI. Version: help-2.
import { useEffect, useRef, useState } from 'react';

const CLOSE_DELAY_MS = 150;

export function HelpTip(props: { tipId: string; content: string }): JSX.Element {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const open = hover || focus;
  const wrapRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<number | null>(null);

  const clearTimer = (): void => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openHover = (): void => {
    clearTimer();
    setHover(true);
  };
  // Delay the hover-close so the pointer can travel from the button onto the bubble without it vanishing.
  const closeHoverSoon = (): void => {
    clearTimer();
    closeTimer.current = window.setTimeout(() => setHover(false), CLOSE_DELAY_MS);
  };
  const dismiss = (): void => {
    clearTimer();
    setHover(false);
    setFocus(false);
  };

  useEffect(() => clearTimer, []); // clear any pending timer on unmount

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') dismiss();
    };
    const onDocPointer = (e: Event): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="help-tip" onMouseEnter={openHover} onMouseLeave={closeHoverSoon}>
      <button
        type="button"
        className="help-tip__btn"
        // Generic name (not the field label) so getByLabel(fieldLabel) resolves uniquely to the control, per
        // the codebase's selector convention. The field-specific help reaches screen readers via the control's
        // aria-describedby AND this button's aria-describedby -> the tooltip content below.
        aria-label="More information"
        aria-describedby={props.tipId}
        aria-expanded={open}
        onFocus={() => {
          clearTimer();
          setFocus(true);
        }}
        onBlur={() => setFocus(false)}
      >
        <span aria-hidden="true">?</span>
      </button>
      <span id={props.tipId} role="tooltip" className={open ? 'help-tip__bubble is-open' : 'help-tip__bubble'}>
        {props.content}
      </span>
    </span>
  );
}
