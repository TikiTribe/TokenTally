// WhatIfPanel gating: only tornado factors that are live editable numbers in the active mode become sliders,
// derived/enum factors are skipped, and the panel is capped to the top three drivers (and renders nothing when
// none qualify). Behavior (live reprice + number-field mirroring) is covered end-to-end in interactions.spec.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WhatIfPanel } from '@/ui/WhatIfPanel';
import { useAppStore } from '@/store/useAppStore';
import type { TornadoBar } from '@/optimization';

describe('WhatIfPanel', () => {
  beforeEach(() => {
    useAppStore.setState({ mode: 'chatbot' }); // default chatbot inputs carry the numeric fields below
  });

  it('renders a slider for each editable numeric top driver and skips derived/enum factors', () => {
    const bars: TornadoBar[] = [
      { factor: 'conversationsPerMonth', low: 100, high: 300, swing: 200 }, // editable store number
      { factor: 'contextGrowthPerTurn', low: 120, high: 180, swing: 60 }, // driven by the contextStrategy enum -> no scrubbable number
      { factor: 'avgResponseTokens', low: 180, high: 220, swing: 40 }, // editable store number
    ];
    render(<WhatIfPanel bars={bars} />);
    expect(screen.getByRole('slider', { name: 'Conversations / month' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Avg response tokens' })).toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: 'Context growth / turn' })).toBeNull();
  });

  it('caps at three sliders even when more numeric drivers swing', () => {
    const bars: TornadoBar[] = [
      { factor: 'conversationsPerMonth', low: 1, high: 5, swing: 4 },
      { factor: 'avgResponseTokens', low: 1, high: 4, swing: 3 },
      { factor: 'turnsPerConversation', low: 1, high: 3, swing: 2 },
      { factor: 'avgUserMessageTokens', low: 1, high: 2, swing: 1 },
    ];
    render(<WhatIfPanel bars={bars} />);
    expect(screen.getAllByRole('slider')).toHaveLength(3);
  });

  it('renders nothing when no bar maps to an editable number', () => {
    const bars: TornadoBar[] = [{ factor: 'contextGrowthPerTurn', low: 1, high: 2, swing: 1 }];
    const { container } = render(<WhatIfPanel bars={bars} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('freezes the visible set: reordered/added drivers do not reshuffle or grow it without a mode/model change', () => {
    const initial: TornadoBar[] = [
      { factor: 'conversationsPerMonth', low: 1, high: 5, swing: 4 },
      { factor: 'avgResponseTokens', low: 1, high: 4, swing: 3 },
      { factor: 'turnsPerConversation', low: 1, high: 3, swing: 2 },
    ];
    const { rerender } = render(<WhatIfPanel bars={initial} />);
    expect(screen.getAllByRole('slider')).toHaveLength(3);
    // A recompute re-sorts the bars and a fourth numeric driver would now rank into the top three. Mode + model
    // are unchanged, so the frozen set must hold: same three sliders, the new driver is NOT added (this is what
    // prevents an active drag from unmounting its own slider when a swing crosses a neighbor).
    const reordered: TornadoBar[] = [
      { factor: 'avgUserMessageTokens', low: 1, high: 9, swing: 8 },
      { factor: 'conversationsPerMonth', low: 1, high: 2, swing: 1 },
      { factor: 'avgResponseTokens', low: 1, high: 2, swing: 1 },
      { factor: 'turnsPerConversation', low: 1, high: 2, swing: 1 },
    ];
    rerender(<WhatIfPanel bars={reordered} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
    expect(screen.queryByRole('slider', { name: 'Avg user message tokens' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'Conversations / month' })).toBeInTheDocument();
  });
});
