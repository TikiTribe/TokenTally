// TokenStream: real segments vs approximate chunks, the 400 cap, the shared hover readout, and - the whole
// security point - that a token containing markup renders as INERT text, never an element.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenStream, approxChunks } from '@/viz/TokenStream';

describe('approxChunks', () => {
  it('splits text into roughly `count` character chunks', () => {
    expect(approxChunks('abcdefgh', 2)).toEqual(['abcd', 'efgh']);
    expect(approxChunks('', 5)).toEqual([]);
    expect(approxChunks('abc', 0)).toEqual([]);
  });
  it('splits by code point so a surrogate pair (emoji) is never severed', () => {
    const emoji = '🚀🚀🚀🚀🚀';
    const chunks = approxChunks(emoji, 3);
    expect(chunks.join('')).toBe(emoji); // lossless
    for (const c of chunks) expect(c).toBe(Array.from(c).join('')); // each chunk is whole code points (no lone surrogate)
  });
});

describe('TokenStream', () => {
  it('renders real segments as spans with the accuracy badge', () => {
    const { container } = render(<TokenStream text="hello world" count={2} segments={['hello', ' world']} badge="exact" />);
    expect(container.querySelectorAll('.tok')).toHaveLength(2);
    expect(screen.getByText(/2 tokens \(exact\)/)).toBeInTheDocument();
  });

  it('renders an approximate char-chunk stream, labeled, when there are no real segments', () => {
    const { container } = render(<TokenStream text="abcdefgh" count={2} segments={null} badge="estimate" />);
    expect(container.querySelectorAll('.tok')).toHaveLength(2);
    expect(screen.getByText(/approximate, not real tokens for this model/)).toBeInTheDocument();
  });

  it('renders a token containing markup as INERT text, not an element (XSS)', () => {
    const evil = '<script>alert(1)</script>';
    const { container } = render(<TokenStream text={evil} count={1} segments={[evil]} badge="exact" />);
    expect(container.querySelector('script')).toBeNull(); // never a real element
    expect(screen.getByText(evil)).toBeInTheDocument(); // shown as visible text
  });

  it('caps at 400 spans and shows a "+N more" marker', () => {
    const many = Array.from({ length: 500 }, () => 'x');
    const { container } = render(<TokenStream text={'x'.repeat(500)} count={500} segments={many} badge="exact" />);
    expect(container.querySelectorAll('.tok:not(.tok--more)')).toHaveLength(400);
    expect(screen.getByText(/\+100 more tokens/)).toBeInTheDocument();
  });

  it('updates the shared readout on hover', async () => {
    const user = userEvent.setup();
    const { container } = render(<TokenStream text="hi there" count={2} segments={['hi', ' there']} badge="exact" />);
    expect(screen.getByText(/arrow through a token to inspect it/i)).toBeInTheDocument();
    await user.hover(container.querySelectorAll('.tok')[0]!);
    expect(screen.getByText(/token 1 of 2: "hi"/)).toBeInTheDocument();
  });

  it('is keyboard-navigable: arrow keys move the inspected token (WCAG 2.1.1)', async () => {
    const user = userEvent.setup();
    const { container } = render(<TokenStream text="hi there" count={2} segments={['hi', ' there']} badge="exact" />);
    const group = container.querySelector('.tokenstream__stream') as HTMLElement;
    expect(group).toHaveAttribute('tabindex', '0'); // one tab stop, not one per token
    group.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(/token 1 of 2: "hi"/)).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText(/token 2 of 2: " there"/)).toBeInTheDocument();
  });

  it('renders merged multibyte segments as the real characters (no replacement garbage)', () => {
    render(<TokenStream text="a🎉b" count={4} segments={['a', '🎉', 'b']} badge="exact" />);
    expect(screen.getByText('🎉')).toBeInTheDocument();
    expect(screen.queryByText('�')).toBeNull();
  });
});
