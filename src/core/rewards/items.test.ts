import { describe, expect, it } from 'vitest';
import { HANGAR_CATEGORIES, STARTER } from '../storage/schemas';
import { BOMB_STYLES, isFree, itemById, ITEMS, itemsOf } from './items';

describe('Hangar items (FR-045)', () => {
  it('has the five categories, each with exactly one free item, which is the STARTER item', () => {
    for (const c of HANGAR_CATEGORIES) {
      const free = itemsOf(c).filter((i) => i.price === 0);
      expect(free.map((i) => i.id)).toEqual([STARTER[c]]);
      expect(isFree(STARTER[c])).toBe(true);
      expect(itemsOf(c).length).toBeGreaterThan(2);
    }
  });

  it('prices the other items from 10 to 60 stars, the free item first and then by price', () => {
    for (const c of HANGAR_CATEGORIES) {
      const prices = itemsOf(c).map((i) => i.price);
      expect(prices[0]).toBe(0);
      expect([...prices].sort((a, b) => a - b)).toEqual(prices);
      for (const p of prices.slice(1)) expect(p >= 10 && p <= 60).toBe(true);
    }
    expect(Math.min(...ITEMS.filter((i) => i.price > 0).map((i) => i.price))).toBe(10);
    expect(Math.max(...ITEMS.map((i) => i.price))).toBe(60);
  });

  it('gives every item a unique id that starts with its category, and a look of that category', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const item of ITEMS) {
      expect(item.id.startsWith(`${item.category}.`)).toBe(true);
      expect(item.look.category).toBe(item.category);
      expect(itemById(item.id)).toBe(item);
    }
    expect(itemById('bomb.classic')).toBeUndefined();
  });

  it('sells every bomb style, with confetti free', () => {
    expect(itemsOf('bomb').map((i) => (i.look.category === 'bomb' ? i.look.bomb : null))).toEqual([...BOMB_STYLES]);
    expect(STARTER.bomb).toBe('bomb.confetti');
  });
});

/**
 * The source of every module of task generation, rounds, levels, settings, geometry and views, tests left out, by
 * path. Read as text through Vite, so the check runs without Node types.
 */
const MATH_SOURCES = Object.entries(
  import.meta.glob<string>(['../{tasks,round,progress,settings,geometry,view}/**/*.ts', '!**/*.test.ts'], {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
);

describe('looks never reach the math (FR-045)', () => {
  it('reads the sources', () => {
    expect(MATH_SOURCES.length).toBeGreaterThan(10);
    expect(MATH_SOURCES.some(([file]) => file.endsWith('round/RoundController.ts'))).toBe(true);
  });

  it('no module of task generation, rounds, levels or settings imports the item list', () => {
    for (const [file, text] of MATH_SOURCES) expect(text, file).not.toMatch(/rewards\/items/);
  });

  it('the round reads only the star table from the Hangar module, never the Hangar or a look', () => {
    let seen = 0;
    for (const [file, text] of MATH_SOURCES) {
      const imports = text.match(/import[^;]*from '[^']*rewards\/hangar'/g) ?? [];
      seen += imports.length;
      for (const line of imports) expect(line.replace(/\s+/g, ' '), file).toBe("import { starsFor } from '../rewards/hangar'");
      expect(text, file).not.toMatch(/import[^;]*\b(Hangar|emptyHangar|hangarSchema|STARTER)\b[^;]*from/);
    }
    expect(seen).toBeGreaterThan(0);
  });
});
