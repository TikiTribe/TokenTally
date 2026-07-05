// Visible, immediate hover/focus tooltip for the hand-rolled charts (waterfall, tornado, token stream). It
// replaces native `title`, which the user could not see: title has a ~1s OS delay, no styling, and on the line
// chart only fired on 3px dots. This shows a styled bubble the instant you hover the element (or focus it), and
// dismisses on leave/blur/Escape (WCAG 1.4.13). CSP-safe: React state + an inline-style position only (no title,
// no inline script). Renders as the given element so it can BE a grid row (the bubble is absolutely positioned,
// out of flow, so it does not disturb the row's grid). Owner: TokenTally UI.
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

type Tag = 'li' | 'div' | 'span';

export function ChartTip(props: {
  content: string;
  children: ReactNode;
  as?: Tag;
  className?: string;
  style?: CSSProperties;
}): JSX.Element {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const open = hover || focus;
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setHover(false);
        setFocus(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const Tag = (props.as ?? 'div') as 'div';
  return (
    <Tag
      className={props.className}
      style={{ position: 'relative', ...props.style }}
      tabIndex={0}
      aria-describedby={open ? id : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    >
      {props.children}
      <span id={id} role="tooltip" className={open ? 'chart-tip is-open' : 'chart-tip'}>
        {props.content}
      </span>
    </Tag>
  );
}
