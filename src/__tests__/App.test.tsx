// Phase 2A shell smoke test (jsdom). Validates landmarks, the WCAG tablist, mode switching, and the full
// registry-load flow (ensureRegistry dynamic-imports the pinned snapshot -> SnapshotStamp shows its date).
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

describe('App shell (Phase 2A)', () => {
  it('renders the landmark shell, a 5-mode tablist, and a skip link', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /TokenTally/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to content/i })).toBeInTheDocument();
    const tablist = screen.getByRole('tablist', { name: /calculator mode/i });
    expect(within(tablist).getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('switches mode when a tab is activated (aria-selected moves)', async () => {
    render(<App />);
    const agentTab = screen.getByRole('tab', { name: /^Agent$/ });
    expect(agentTab).toHaveAttribute('aria-selected', 'false');
    await userEvent.click(agentTab);
    expect(agentTab).toHaveAttribute('aria-selected', 'true');
  });

  it('loads the pinned pricing registry and shows the provenance stamp', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Pricing data as of 2025-09-01/)).toBeInTheDocument(), { timeout: 5000 });
    // P2-A22: the price-provenance disclaimer is present (prices not verified against provider billing).
    expect(screen.getByText(/not independently verified against/i)).toBeInTheDocument();
  });

  it('computes a real forecast end-to-end (registry -> recompute -> a $/month headline)', async () => {
    render(<App />);
    // the default chatbot config on gpt-4o@openai should produce a positive monthly cost.
    await waitFor(() => expect(screen.getByText(/\$[\d,.]+ /)).toBeInTheDocument(), { timeout: 6000 });
    expect(screen.getByText(/\/ month/)).toBeInTheDocument();
  });
});
