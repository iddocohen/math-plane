import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import { emptyHangar, HANGAR_CATEGORIES, hangarSchema, STARTER } from '../storage/schemas';
import { award, buy, canBuy, choose, chosenId, isOwned, lookOf, lookOfIds, starsFor, starsNeeded } from './hangar';

describe('starsFor (FR-036, FR-044)', () => {
  const on = defaultSettings();
  const off = { ...defaultSettings(), pointAfterFullHelp: false };

  it('gives 1 star per "Treffer" hit and 3 per "Bauen", "Malen" or "Male an" task', () => {
    for (const kind of ['koerper', 'formen', 'bauplanFinden', 'ansichtFinden'] as const) expect(starsFor(kind, 'alone', 0, on)).toBe(1);
    for (const kind of ['bauen', 'malen', 'maleAn'] as const) expect(starsFor(kind, 'alone', 0, on)).toBe(3);
  });

  it('gives the same stars with help, also after help step 3 while "Punkt nach voller Hilfe" is on', () => {
    expect(starsFor('bauen', 'withHelp', 2, on)).toBe(3);
    expect(starsFor('bauen', 'withHelp', 3, on)).toBe(3);
    expect(starsFor('koerper', 'withHelp', 3, on)).toBe(1);
  });

  it('gives 0 after help step 3 when "Punkt nach voller Hilfe" is off, and the usual stars before it', () => {
    expect(starsFor('malen', 'withHelp', 3, off)).toBe(0);
    expect(starsFor('formen', 'withHelp', 3, off)).toBe(0);
    expect(starsFor('malen', 'withHelp', 2, off)).toBe(3);
  });
});

describe('award', () => {
  it('adds whole stars above 0 and never takes any away', () => {
    const h = emptyHangar();
    expect(award(h, 3).stars).toBe(3);
    expect(award(award(h, 3), 1).stars).toBe(4);
    expect(award(h, 0)).toBe(h);
    expect(award(h, -2)).toBe(h);
    expect(award(h, 1.5)).toBe(h);
  });

  it('returns a new Hangar and keeps the chosen look', () => {
    const h = emptyHangar();
    const next = award(h, 2);
    expect(next).not.toBe(h);
    expect(next.chosen).toEqual(h.chosen);
    expect(h.stars).toBe(0);
  });
});

describe('buy, choose and the chosen look (FR-045)', () => {
  const rich = (stars: number) => ({ ...emptyHangar(), stars });

  it('owns the free items from the start and chooses them for a new player', () => {
    const h = emptyHangar();
    for (const c of HANGAR_CATEGORIES) {
      expect(isOwned(h, STARTER[c])).toBe(true);
      expect(chosenId(h, c)).toBe(STARTER[c]);
    }
    expect(lookOf(h)).toEqual({ color: '#e0413a', tail: 'star', smoke: null, hat: 'cap', bomb: 'confetti' });
  });

  it('buys an item: takes its price, owns it and chooses it at once', () => {
    const next = buy(rich(35), 'bomb.water')!;
    expect(next.stars).toBe(5);
    expect(next.owned).toEqual(['bomb.water']);
    expect(chosenId(next, 'bomb')).toBe('bomb.water');
    expect(lookOf(next).bomb).toBe('water');
  });

  it('buys with exactly the price and the balance stops at 0', () => {
    const next = buy(rich(10), 'planeColor.blue')!;
    expect(next.stars).toBe(0);
    expect(lookOf(next).color).toBe('#2f7fd1');
  });

  it('refuses an item that is too dear, owned already, free or unknown, and never goes below 0 stars', () => {
    expect(buy(rich(9), 'planeColor.blue')).toBeNull();
    expect(buy(rich(100), 'planeColor.red')).toBeNull();
    expect(buy(rich(100), 'hat.sombrero')).toBeNull();
    const once = buy(rich(70), 'hat.crown')!;
    expect(buy(once, 'hat.crown')).toBeNull();
    expect(starsNeeded(rich(9), 'planeColor.blue')).toBe(1);
    expect(starsNeeded(rich(50), 'planeColor.blue')).toBe(0);
    expect(starsNeeded(once, 'hat.crown')).toBe(0);
    expect(canBuy(rich(10), 'planeColor.blue')).toBe(true);
    expect(canBuy(rich(9), 'planeColor.blue')).toBe(false);
  });

  it('chooses an owned or free item at no cost and ignores one not owned', () => {
    const owned = buy(rich(30), 'tail.heart')!;
    const back = choose(owned, 'tail.star');
    expect(back.stars).toBe(owned.stars);
    expect(chosenId(back, 'tail')).toBe('tail.star');
    expect(chosenId(choose(back, 'tail.heart'), 'tail')).toBe('tail.heart');
    expect(choose(back, 'tail.sun')).toBe(back);
    expect(choose(back, 'tail.unknown')).toBe(back);
  });

  it('shows the free default for a stored id that is unknown, of another category or not owned, so old data loads', () => {
    const old = { ...emptyHangar(), chosen: { planeColor: 'planeColor.red', tail: 'tail.none', smoke: 'smoke.white', bomb: 'bomb.classic', hat: 'hat.helmet' } };
    expect(hangarSchema.safeParse(old).success).toBe(true);
    for (const c of HANGAR_CATEGORIES) expect(chosenId(old, c)).toBe(STARTER[c]);
    expect(chosenId({ ...emptyHangar(), chosen: { ...STARTER, tail: 'hat.crown' } }, 'tail')).toBe('tail.star');
    expect(isOwned({ ...emptyHangar(), owned: ['hat.sombrero'] }, 'hat.sombrero')).toBe(false);
  });

  it('gives the look of every chosen category, and of ids tried on in the Hangar', () => {
    let h = rich(300);
    for (const id of ['planeColor.gold', 'tail.sun', 'smoke.rainbow', 'bomb.bubbles', 'hat.cowboy']) h = buy(h, id)!;
    const look = lookOf(h);
    expect(look).toMatchObject({ color: '#d4a017', tail: 'sun', hat: 'cowboy', bomb: 'bubbles' });
    expect(look.smoke).toHaveLength(6);
    expect(lookOfIds({ ...STARTER, smoke: 'smoke.white' }).smoke).toEqual(['#ffffff']);
  });
});
