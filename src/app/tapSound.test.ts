import { describe, expect, it } from 'vitest';
import { tapsSoftly } from './tapSound';

function button(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.querySelector('span') ?? host.firstElementChild!;
}

describe('tapsSoftly', () => {
  it('taps on a button and on the text inside it', () => {
    expect(tapsSoftly(button('<button type="button">Los</button>'))).toBe(true);
    expect(tapsSoftly(button('<button type="button"><span>Los</span></button>'))).toBe(true);
  });

  it('stays quiet off a button', () => {
    expect(tapsSoftly(button('<p>Text</p>'))).toBe(false);
    expect(tapsSoftly(null)).toBe(false);
  });

  it('stays quiet on a disabled or aria-disabled button', () => {
    expect(tapsSoftly(button('<button type="button" disabled>Los</button>'))).toBe(false);
    expect(tapsSoftly(button('<button type="button" aria-disabled="true"><span>Los</span></button>'))).toBe(false);
  });

  it('stays quiet on a purchase button, which plays the coin sound', () => {
    expect(tapsSoftly(button('<button type="button" data-no-tap><span>Kaufen</span></button>'))).toBe(false);
  });
});
