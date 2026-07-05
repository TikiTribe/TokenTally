// ChartTip: the visible hover/focus tooltip that replaced the invisible native `title` on the hand-rolled charts.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChartTip } from '@/ui/ChartTooltip';

describe('ChartTip', () => {
  it('opens on hover, closes on unhover, and dismisses on Escape', async () => {
    const user = userEvent.setup();
    render(
      <ChartTip as="li" content="Input: the tokens you send" className="row">
        <span>Input</span>
      </ChartTip>,
    );
    const tip = screen.getByRole('tooltip');
    const row = screen.getByText('Input').parentElement as HTMLElement;
    expect(tip).not.toHaveClass('is-open');

    await user.hover(row);
    expect(tip).toHaveClass('is-open');
    await user.unhover(row);
    expect(tip).not.toHaveClass('is-open');

    // Escape dismisses an open tooltip (WCAG 1.4.13). (Focus-open is exercised in the browser E2E; React 18's
    // delegated onFocus does not fire from a raw jsdom .focus().)
    await user.hover(row);
    expect(tip).toHaveClass('is-open');
    await user.keyboard('{Escape}');
    expect(tip).not.toHaveClass('is-open');
  });
});
