// Structure adapted from math-soccer src/app/LockerRoom.tsx (the star shop): header with the star total and "Zurück",
// a preview, groups of item buttons, the buy question; without shirt numbers, celebrations, modes or trophies.
/**
 * The Hangar (FR-045, FR-046; contracts/screens.md "Hangar"). Opened from the start screen with the "Hangar" button
 * or K, and during a round with the Hangar icon (the app pauses the round), only when the parent turned "Hangar und
 * Sterne" on. It shows the plane on a sky strip with the chosen look, the star total, and the groups Farbe, Heckbild,
 * Rauch, Bomben and Mütze.
 *
 * - An owned or free item is chosen with one tap, at no cost.
 * - An item not owned shows its price ("Kaufen für N Sterne"). When the balance reaches it, a tap buys and chooses it
 *   at once for a price up to `ASK_ABOVE` stars; a dearer item asks "Für N Sterne kaufen?" with "Ja" and "Nein"
 *   first. When the balance is too low, the item shows "noch N Sterne" and a tap does nothing.
 * - Every change goes to `onChange` at once, so the app stores it and the plane of a paused round shows it. A purchase
 *   comes with `bought` true, so the app plays the coin sound.
 * - Escape goes back through the app's keys (keyboard.ts); while the question shows, Escape answers "Nein" and the
 *   Hangar stays.
 *
 * The plane pictures are drawn with src/game/planeArt.ts, the same drawing as the round's plane; that module has no
 * Phaser, so the start screen does not load the game.
 *
 * For tests: `data-testid="hangar"` with `data-stars`; every item `data-testid="item-<id>"` with `data-owned`,
 * `data-chosen` and `data-locked`; the preview `data-testid="hangar-preview"` with `data-look` (the chosen ids).
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ASK_ABOVE, buy, canBuy, choose, chosenId, isOwned, lookOf, lookOfIds, starsNeeded, type HangarLook } from '../core/rewards/hangar';
import { HANGAR_CATEGORIES, itemsOf, type BombStyle, type HangarCategory, type HangarItem } from '../core/rewards/items';
import type { Hangar as HangarData } from '../core/storage/schemas';
import { drawPlanePicture } from '../game/planeArt';
import { t } from '../i18n';

interface Props {
  hangar: HangarData;
  /** A purchase (`bought` true) or a choice; the app stores it and shows it on the plane. */
  onChange: (hangar: HangarData, bought: boolean) => void;
  onBack: () => void;
}

/** The group title of each category (i18n `hangar.groups`). */
const GROUP: Record<HangarCategory, 'color' | 'tail' | 'smoke' | 'bomb' | 'hat'> = {
  planeColor: 'color',
  tail: 'tail',
  smoke: 'smoke',
  bomb: 'bomb',
  hat: 'hat',
};

/** The plane drawn into a canvas; redrawn when the look changes. The start screen shows it too. */
export function PlanePicture({ look, width, height, className = 'hangar-plane' }: { look: HangarLook; width: number; height: number; className?: string }): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  const { color, tail, hat } = look;
  const smoke = look.smoke?.join(' ') ?? '';
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawPlanePicture(ctx, width, height, { color, tail, hat, smoke: smoke === '' ? null : smoke.split(' ') });
  }, [color, tail, hat, smoke, width, height]);
  return <canvas ref={ref} className={className} style={{ width, height }} aria-hidden="true" />;
}

/** Bright colors of each bomb style's small picture. */
const BOMB_COLORS: Record<BombStyle, readonly string[]> = {
  confetti: ['#ffd23f', '#ff8fb1', '#7ee0ff', '#9be27a'],
  water: ['#4aa8e0', '#7ec8f0', '#d8f2ff'],
  stars: ['#ffd23f', '#ffe066'],
  bubbles: ['#bfe8ff', '#ffc4e1', '#ffffff'],
};

/** A small picture of a bomb style's burst. */
function BombPicture({ bomb }: { bomb: BombStyle }): ReactElement {
  const c = BOMB_COLORS[bomb];
  return (
    <svg className="hangar-icon" width={56} height={40} viewBox="0 0 56 40" aria-hidden="true">
      {bomb === 'confetti' &&
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={6 + (i % 4) * 12} y={6 + Math.floor(i / 4) * 16 + (i % 2) * 4} width={5} height={9} rx={1} fill={c[i % c.length]} transform={`rotate(${i * 37} ${8 + (i % 4) * 12} ${10 + Math.floor(i / 4) * 16})`} />
        ))}
      {bomb === 'water' && (
        <>
          <path d="M28 4 C 20 16, 16 22, 16 27 A 12 12 0 0 0 40 27 C 40 22, 36 16, 28 4 Z" fill={c[0]} />
          <circle cx={9} cy={30} r={3} fill={c[1]} />
          <circle cx={47} cy={30} r={3} fill={c[1]} />
          <ellipse cx={24} cy={24} rx={3} ry={5} fill={c[2]} />
        </>
      )}
      {bomb === 'stars' &&
        [
          [14, 14, 9],
          [38, 12, 7],
          [28, 30, 8],
        ].map(([x, y, r], i) => <polygon key={i} points={starPoints(x!, y!, r!)} fill={c[i % c.length]} />)}
      {bomb === 'bubbles' &&
        [
          [16, 22, 10],
          [36, 14, 8],
          [40, 32, 5],
        ].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={c[i % c.length]} fillOpacity={0.7} stroke="#7ec8f0" strokeWidth={1.5} />)}
    </svg>
  );
}

function starPoints(x: number, y: number, r: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const rad = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(x + Math.cos(a) * rad).toFixed(1)},${(y + Math.sin(a) * rad).toFixed(1)}`;
  }).join(' ');
}

/** The picture on an item button: the plane wearing the item (color, tail, smoke, hat) or the bomb burst. */
function ItemPicture({ item, ids }: { item: HangarItem; ids: Record<HangarCategory, string> }): ReactElement {
  if (item.look.category === 'bomb') return <BombPicture bomb={item.look.bomb} />;
  return <PlanePicture look={lookOfIds({ ...ids, [item.category]: item.id })} width={item.category === 'smoke' ? 96 : 72} height={44} />;
}

export function Hangar({ hangar, onChange, onBack }: Props): ReactElement {
  const H = t().hangar;
  const [question, setQuestion] = useState<HangarItem | null>(null);
  const look = lookOf(hangar);
  const ids = Object.fromEntries(HANGAR_CATEGORIES.map((c) => [c, chosenId(hangar, c)])) as Record<HangarCategory, string>;

  // While the question shows, Escape answers "Nein" before the app's keys see it (they would leave the Hangar).
  const asking = question !== null;
  useEffect(() => {
    if (!asking) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setQuestion(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [asking]);

  const purchase = (item: HangarItem) => {
    const next = buy(hangar, item.id);
    if (next) onChange(next, true);
  };

  /** A tap on this item buys it without asking; the button then plays the coin sound and no tap (tapSound.ts). */
  const buysAtOnce = (item: HangarItem) => !isOwned(hangar, item.id) && canBuy(hangar, item.id) && item.price <= ASK_ABOVE;

  const tap = (item: HangarItem) => {
    if (isOwned(hangar, item.id)) onChange(choose(hangar, item.id), false);
    else if (!canBuy(hangar, item.id)) return;
    else if (item.price > ASK_ABOVE) setQuestion(item);
    else purchase(item);
  };

  const answer = (yes: boolean) => {
    if (yes && question) purchase(question);
    setQuestion(null);
  };

  return (
    <main className="hangar" lang="de" data-testid="hangar" data-stars={hangar.stars} aria-label={H.title}>
      <header className="hangar-header">
        <h1>{H.title}</h1>
        <span className="star-total" data-testid="hangar-stars">
          {t().start.stars(hangar.stars)}
        </span>
        <button type="button" onClick={onBack}>
          {H.back}
        </button>
      </header>
      <figure className="hangar-preview" data-testid="hangar-preview" data-look={HANGAR_CATEGORIES.map((c) => ids[c]).join(' ')} aria-label={H.preview}>
        <PlanePicture look={look} width={280} height={150} />
      </figure>
      <div className="hangar-groups">
        {HANGAR_CATEGORIES.map((category) => (
          <section key={category} className="hangar-group" aria-label={H.groups[GROUP[category]]}>
            <h2>{H.groups[GROUP[category]]}</h2>
            <div className="hangar-items">
              {itemsOf(category).map((item) => {
                const owned = isOwned(hangar, item.id);
                const open = owned || canBuy(hangar, item.id);
                const isChosen = ids[category] === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="hangar-item"
                    data-testid={`item-${item.id}`}
                    data-owned={String(owned)}
                    data-chosen={String(isChosen)}
                    data-locked={String(!open)}
                    aria-disabled={open ? undefined : 'true'}
                    aria-pressed={owned ? isChosen : undefined}
                    data-no-tap={buysAtOnce(item) ? '' : undefined}
                    onClick={() => tap(item)}
                  >
                    <ItemPicture item={item} ids={ids} />
                    <span className="hangar-item-name">{H.items[item.id]}</span>
                    {!owned && <span className="hangar-item-price">{open ? H.buy(item.price) : H.stillNeeded(starsNeeded(hangar, item.id))}</span>}
                    {isChosen && <span className="hangar-item-chosen">{H.chosen}</span>}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      {question && (
        <div className="parent-menu-backdrop">
          <div className="parent-menu" role="dialog" aria-modal="true" data-testid="buy-question" aria-labelledby="buy-question-text">
            <p id="buy-question-text">{H.buyQuestion(question.price)}</p>
            <div className="round-end-buttons">
              <button type="button" className="primary" data-no-tap="" onClick={() => answer(true)}>
                {H.yes}
              </button>
              <button type="button" onClick={() => answer(false)}>
                {H.no}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
