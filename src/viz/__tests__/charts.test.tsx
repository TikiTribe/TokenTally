// Phase 2D: charts render engine data verbatim, expose an a11y data table, and return null (never fake
// geometry) when there is nothing to plot.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepAccumulationChart } from '@/viz/StepAccumulationChart';
import { TornadoChart } from '@/viz/TornadoChart';
import { CostWaterfall } from '@/viz/CostWaterfall';
import { CacheWarmthCurve } from '@/viz/CacheWarmthCurve';
import type { StepProfile } from '@/workloads';
import type { TornadoBar } from '@/optimization';
import type { WarmthPoint } from '@/store/engineClient';

describe('StepAccumulationChart', () => {
  it('renders steps with an accessible data table', () => {
    const steps: StepProfile[] = [
      { step: 1, inputTokens: 100, outputTokens: 50, reasoningTokens: 0, cost: 0.01 },
      { step: 2, inputTokens: 500, outputTokens: 50, reasoningTokens: 0, cost: 0.03 },
    ];
    render(<StepAccumulationChart steps={steps} />);
    expect(screen.getByRole('img', { name: /cost per agent step/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
  it('returns null (no fake geometry) for null / single-step', () => {
    const { container } = render(<StepAccumulationChart steps={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TornadoChart', () => {
  it('renders positive-swing bars, sorted, with a data table', () => {
    const bars: TornadoBar[] = [
      { factor: 'conversationsPerMonth', low: 100, high: 300, swing: 200 },
      { factor: 'avgResponseTokens', low: 180, high: 220, swing: 40 },
    ];
    render(<TornadoChart bars={bars} central={200} />);
    expect(screen.getByRole('group', { name: /sensitivity/i })).toBeInTheDocument();
    // The table renders human factor labels now, not raw engine ids (#5/#18).
    expect(screen.getByRole('cell', { name: /Conversations \/ month/ })).toBeInTheDocument();
  });
  it('returns null when all swings are zero (allowlist-rejected factors)', () => {
    const { container } = render(<TornadoChart bars={[{ factor: 'x', low: 0, high: 0, swing: 0 }]} central={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CacheWarmthCurve', () => {
  it('renders honest text and no chart when there is no warm-cache dynamic', () => {
    render(<CacheWarmthCurve points={null} breakEven={null} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/no warm-cache dynamics/i)).toBeInTheDocument();
  });
  it('renders a labeled figure + data table for a series', () => {
    const points: WarmthPoint[] = [
      { arrivals: 1000, central: 120, low: 110, high: 140, conservative: 150 },
      { arrivals: 100000, central: 60, low: 50, high: 75, conservative: 150 },
    ];
    render(<CacheWarmthCurve points={points} breakEven={5000} />);
    expect(screen.getByRole('img', { name: /cache warmth/i })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});

describe('CostWaterfall never-$0', () => {
  it('renders a null-cost component as its native rate, not $0', () => {
    render(<CostWaterfall waterfall={{ components: [{ label: 'input', cost: null, nativeUnit: 'per_second', nativeRate: 100 }], total: 0 }} />);
    expect(screen.getByText(/100 \/ M per_second/)).toBeInTheDocument();
    expect(screen.queryByText('$0')).toBeNull();
  });
});
