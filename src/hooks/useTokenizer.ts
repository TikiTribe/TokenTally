// P2-A13: debounced live tokenization hook. Debounces 120ms trailing, tokenizes off the main thread via the
// worker client, and reports the count to the store. A monotonic sequence guard drops any stale response -
// because modelId + text are effect deps, a fast edit OR a mid-count model swap re-runs the effect (new
// seq), so the older in-flight response is discarded and never overwrites a newer count. Owner: TokenTally
// UI. Version: Phase 2B.
import { useEffect, useRef } from 'react';
import { tokenize } from '@/tokenizer/workerClient';
import { useAppStore } from '@/store/useAppStore';

const DEBOUNCE_MS = 120;

export function useTokenizer(fieldId: string, modelId: string, text: string): void {
  const report = useAppStore((s) => s.reportTokenCount);
  const seq = useRef(0);

  useEffect(() => {
    const mySeq = ++seq.current;
    const timer = setTimeout(() => {
      void tokenize(modelId, text).then((res) => {
        if (mySeq !== seq.current) return; // superseded by a newer edit / model swap - drop
        report(fieldId, {
          count: res.count,
          badge: res.badge,
          errorBand: res.errorBand,
          truncated: res.truncated,
          segments: res.segments,
        });
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fieldId, modelId, text, report]);
}
