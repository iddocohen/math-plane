// Structure adapted from math-soccer src/core/rewards/items.ts (the locker room items), with Hangar items.
/**
 * The Hangar items (FR-045, data-model.md "Hangar"). Pure data, no React or Phaser.
 *
 * Five categories: plane color ("Farbe"), tail picture ("Heckbild"), smoke color ("Rauch"), bomb style ("Bomben") and
 * pilot hat ("Mütze"). Each category has exactly one free item, owned from the start and chosen for a new player
 * (`STARTER` in core/storage/schemas.ts): the prototype's red plane with the white star on the tail and the brown cap,
 * no smoke trail, and confetti bombs. The other items cost 10 to 60 stars, from the plainest to the most special.
 *
 * The items are looks only. Nothing in core/tasks or core/round reads them, so they never change the math, the
 * difficulty or the number of bombs (FR-045, plan "Rewards never make the math easier").
 *
 * ITEMS is the Hangar order: per category, the free item first, then by price.
 */
import { HANGAR_CATEGORIES, STARTER, type HangarCategory } from '../storage/schemas';

export { HANGAR_CATEGORIES, STARTER, type HangarCategory };

/** Pictures on the tail; src/game/planeArt.ts draws them. */
export const TAIL_PICTURES = ['star', 'heart', 'flower', 'lightning', 'sun'] as const;
export type TailPicture = (typeof TAIL_PICTURES)[number];

/** Pilot hats; src/game/planeArt.ts draws them. */
export const PILOT_HATS = ['cap', 'helmet', 'bobble', 'party', 'cowboy', 'crown'] as const;
export type PilotHat = (typeof PILOT_HATS)[number];

/** How a hit bursts; src/game/effects.ts holds their looks. Confetti is the default. */
export const BOMB_STYLES = ['confetti', 'water', 'stars', 'bubbles'] as const;
export type BombStyle = (typeof BOMB_STYLES)[number];

/** What an item changes, by category. Colors are `#rrggbb`; a smoke of several colors takes turns puff by puff. */
export type ItemLook =
  | { category: 'planeColor'; color: string }
  | { category: 'tail'; tail: TailPicture }
  | { category: 'smoke'; smoke: readonly string[] | null }
  | { category: 'bomb'; bomb: BombStyle }
  | { category: 'hat'; hat: PilotHat };

export interface HangarItem {
  /** `<category>.<name>`, for example `planeColor.blue`; stored in `owned` and `chosen`. */
  id: string;
  category: HangarCategory;
  /** 0 for the free item of the category, otherwise 10 to 60 stars. */
  price: number;
  look: ItemLook;
}

const color = (name: string, price: number, hex: string): HangarItem => ({
  id: `planeColor.${name}`,
  category: 'planeColor',
  price,
  look: { category: 'planeColor', color: hex },
});
const tail = (name: TailPicture, price: number): HangarItem => ({ id: `tail.${name}`, category: 'tail', price, look: { category: 'tail', tail: name } });
const smoke = (name: string, price: number, colors: readonly string[] | null): HangarItem => ({
  id: `smoke.${name}`,
  category: 'smoke',
  price,
  look: { category: 'smoke', smoke: colors },
});
const bomb = (name: BombStyle, price: number): HangarItem => ({ id: `bomb.${name}`, category: 'bomb', price, look: { category: 'bomb', bomb: name } });
const hat = (name: PilotHat, price: number): HangarItem => ({ id: `hat.${name}`, category: 'hat', price, look: { category: 'hat', hat: name } });

export const ITEMS: readonly HangarItem[] = [
  color('red', 0, '#e0413a'),
  color('blue', 10, '#2f7fd1'),
  color('green', 15, '#3fae4a'),
  color('orange', 20, '#f08a24'),
  color('purple', 30, '#8a4fd1'),
  color('pink', 40, '#ff7fb0'),
  color('gold', 60, '#d4a017'),
  tail('star', 0),
  tail('heart', 10),
  tail('flower', 15),
  tail('lightning', 25),
  tail('sun', 35),
  smoke('none', 0, null),
  smoke('white', 10, ['#ffffff']),
  smoke('pink', 20, ['#ff9fc8']),
  smoke('blue', 20, ['#7ec8f0']),
  smoke('rainbow', 50, ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6']),
  bomb('confetti', 0),
  bomb('water', 30),
  bomb('stars', 40),
  bomb('bubbles', 50),
  hat('cap', 0),
  hat('helmet', 15),
  hat('bobble', 20),
  hat('party', 25),
  hat('cowboy', 35),
  hat('crown', 60),
];

const BY_ID = new Map(ITEMS.map((item) => [item.id, item]));

export function itemById(id: string): HangarItem | undefined {
  return BY_ID.get(id);
}

/** The free items: one per category, the `STARTER` ids. */
export function isFree(id: string): boolean {
  return itemById(id)?.price === 0;
}

export function itemsOf(category: HangarCategory): readonly HangarItem[] {
  return ITEMS.filter((item) => item.category === category);
}
