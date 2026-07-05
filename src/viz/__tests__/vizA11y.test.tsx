// VizFigure is the a11y contract for the recharts charts: a named role=img figure whose decorative SVG is
// aria-hidden and whose values live in a visually-hidden data table.
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { VizFigure } from '@/viz/vizA11y';

describe('VizFigure', () => {
  it('names the figure, hides the chart from a11y, and exposes the data as a table', () => {
    render(
      <VizFigure label="Cost curve" caption="Cost" columns={['Arrivals', 'Central']} rows={[[1000, '$120.00']]}>
        <svg data-testid="chart" />
      </VizFigure>,
    );
    // role="group" (not "img"): "img" is children-presentational and would hide the data table from a screen
    // reader, defeating the point of the a11y table (review M1).
    const fig = screen.getByRole('group', { name: 'Cost curve' });
    expect(fig).toBeInTheDocument();
    // the chart is decorative (wrapped in an aria-hidden container)
    expect(screen.getByTestId('chart').closest('[aria-hidden="true"]')).not.toBeNull();
    // the values are reachable as a real table (NOT pruned by a presentational role)
    const table = within(fig).getByRole('table');
    expect(within(table).getByRole('cell', { name: '$120.00' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Arrivals' })).toBeInTheDocument();
  });
});
