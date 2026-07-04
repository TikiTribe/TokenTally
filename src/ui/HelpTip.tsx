// Accessible, CSP-safe help tooltip. No inline scripts (script-src 'self'): all handlers are React synthetic
// events + a document ESC listener in a useEffect. WCAG 2.1 SC 1.4.13 compliant — shows on BOTH hover and
// focus, is dismissable (ESC), and is hoverable/persistent. The content span is always in the DOM (sr-only
// when closed) so the field's aria-describedby always resolves for screen readers; sighted users get the
// visible bubble on hover/focus. Themed via CSS custom-property tokens, so it adapts to light/dark with no JS.
// Owner: TokenTally UI. Version: help-1.
import { useEffect, useRef, useState } from 'react';

export function HelpTip(props: { tipId: string; label: string; content: string }): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Close when focus/click moves entirely outside this tip (keeps it hoverable/persistent otherwise).
    const onDocPointer = (e: Event): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDocPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDocPointer);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="help-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="help-tip__btn"
        // Generic name (not "…{label}") so getByLabel(fieldLabel) resolves uniquely to the control, per the
        // codebase's selector convention. The field-specific help still reaches screen readers via the
        // control's aria-describedby AND this button's aria-describedby -> the tooltip content below.
        aria-label="More information"
        aria-describedby={props.tipId}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">?</span>
      </button>
      <span id={props.tipId} role="tooltip" className={open ? 'help-tip__bubble is-open' : 'help-tip__bubble'}>
        {props.content}
      </span>
    </span>
  );
}
