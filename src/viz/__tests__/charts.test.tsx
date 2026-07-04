// Phase 2D: charts render engine data verbatim, expose an a11y data table, and return null (never fake
// geometry) when there is nothing to plot.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepAccumulationChart } from '@/viz/StepAccumulationChart';
import { TornadoChart } from '@/viz/TornadoChart';
import { CostWaterfall } from '@/viz/CostWaterfall';
import type { StepProfile } from '@/workloads';
import type { TornadoBar } from '@/optimization';

describe('StepAccumulationChart', () => {
  it('renders steps with an accessible data table', () => {
    const steps: StepProfile[] = [
      { step: 1, inputTokens: 100, outputTokens: 50, reasoningTokens: 0, cost: 0.01 },
      { step: 2, inputTokens: 500, outputTokens: 50, reasoningTokens: 0, cost: 0.03 },
    ];
    render(<StepAccumulationChart steps={steps} />);
    expect(screen.getByRole('group', { name: /cost per agent step/i })).toBeInTheDocument();
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
    render(<TornadoChart bars={bars} />);
    expect(screen.getByRole('group', { name: /sensitivity/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /conversationsPerMonth/ })).toBeInTheDocument();
  });
  it('returns null when all swings are zero (allowlist-rejected factors)', () => {
    const { container } = render(<TornadoChart bars={[{ factor: 'x', low: 0, high: 0, swing: 0 }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CostWaterfall never-$0', () => {
  it('renders a null-cost component as its native rate, not $0', () => {
    render(<CostWaterfall waterfall={{ components: [{ label: 'input', cost: null, nativeUnit: 'per_second', nativeRate: 100 }], total: 0 }} />);
    expect(screen.getByText(/100 \/ M per_second/)).toBeInTheDocument();
    expect(screen.queryByText('$0')).toBeNull();
  });
});
