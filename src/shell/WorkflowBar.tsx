// §5.8 workflow control: copy a shareable permalink (config-only; prompt text is never encoded). Example
// scenarios now live in the GuideStrip chips. No engine import (first-paint safe). Owner: TokenTally UI.
// Version: landing-1.
import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { encodePermalink } from '@/store/permalink';

export function WorkflowBar(): JSX.Element {
  const [copied, setCopied] = useState(false);

  const copyLink = (): void => {
    const s = useAppStore.getState();
    const hash = `c=${encodePermalink(s.mode, s.selection, s.inputs)}`;
    window.location.hash = hash; // the shareable URL is now in the address bar regardless of clipboard support
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    const flash = (): void => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); };
    // Guard the Clipboard API: `navigator.clipboard?.writeText(...).then` would THROW when clipboard is
    // undefined (non-secure context / unsupported). Fall back to the address-bar update + still confirm.
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(flash, () => setCopied(false));
    } else {
      flash();
    }
  };

  return (
    <button className="btn-secondary" onClick={copyLink}>
      {copied ? 'Link copied' : 'Copy shareable link'}
    </button>
  );
}
