// App shell smoke test (jsdom). '/' renders the marketing landing; '#calculator' renders the calculator.
// Validates routing, landmarks, the WCAG tablist, mode switching, and the full registry-load + forecast flow.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';

describe('App (landing)', () => {
  beforeEach(() => { window.location.hash = ''; });

  it('renders the marketing landing at the home route', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /Know what your LLM feature costs/i })).toBeInTheDocument();
    // multiple "Launch calculator" / "Start calculating" CTAs exist
    expect(screen.getAllByRole('button', { name: /Start calculating|Launch calculator/i }).length).toBeGreaterThan(0);
  });

  it('launching the calculator switches to the app view', async () => {
    render(<App />);
    await userEvent.click(screen.getAllByRole('button', { name: /Launch calculator/i })[0]!);
    expect(await screen.findByRole('tablist', { name: /calculator mode/i })).toBeInTheDocument();
  });
});

describe('App shell (calculator view)', () => {
  beforeEach(() => { window.location.hash = '#calculator'; });

  it('renders the landmark shell, a 5-mode tablist, and a skip link', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /cost calculator/i })).toBeInTheDocument();
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
    // P2-A22: the price-provenance disclaimer is present in the snapshot stamp (scoped to that landmark).
    const stamp = screen.getByRole('complementary', { name: /pricing data provenance/i });
    expect(within(stamp).getByText(/not independently verified against/i)).toBeInTheDocument();
  });

  it('computes a real forecast end-to-end (registry -> recompute -> a $/month headline)', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getByText(/\$[\d,.]+ /)).toBeInTheDocument(), { timeout: 6000 });
    expect(screen.getByText(/\/ month/)).toBeInTheDocument();
  });
});
