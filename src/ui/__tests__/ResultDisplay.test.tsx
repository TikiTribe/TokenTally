// Review #2: a recompute failure must be surfaced, not left as a stale/blank result (never-silent invariant).
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultDisplay } from '@/ui/ResultDisplay';
import { useAppStore } from '@/store/useAppStore';

describe('ResultDisplay error surfacing (review #2)', () => {
  beforeEach(() => {
    useAppStore.setState({ registryStatus: 'ready', result: null, status: 'idle', error: null });
  });

  it('surfaces a recompute error as an alert instead of a stale/blank result', () => {
    useAppStore.setState({ status: 'error', error: 'boom while pricing' });
    render(<ResultDisplay />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/could not price this workload/i);
    expect(alert).toHaveTextContent(/boom while pricing/);
  });

  it('shows the enter-workload prompt when idle with no result (not $0)', () => {
    render(<ResultDisplay />);
    expect(screen.getByText(/enter your workload/i)).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).toBeNull();
  });

  it('renders an unavailable-model reason, never a $0', () => {
    useAppStore.setState({ status: 'ready', result: { kind: 'unavailable', reason: 'Model X is not in the catalog' } });
    render(<ResultDisplay />);
    expect(screen.getByText(/not in the catalog/i)).toBeInTheDocument();
  });
});
