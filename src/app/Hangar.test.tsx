import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ITEMS } from '../core/rewards/items';
import { emptyHangar, HANGAR_CATEGORIES, type Hangar as HangarData } from '../core/storage/schemas';
import { t } from '../i18n';
import { Hangar } from './Hangar';

// jsdom has no 2D canvas; the pictures are left out.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The Hangar with its data held like the app holds it; `changes` lists every stored change, `bought` its flags. */
function renderHangar(start: HangarData, onBack = () => {}) {
  const changes: HangarData[] = [];
  const bought: boolean[] = [];
  function Host() {
    const [h, setH] = useState(start);
    return (
      <Hangar
        hangar={h}
        onChange={(next, purchase) => {
          changes.push(next);
          bought.push(purchase);
          setH(next);
        }}
        onBack={onBack}
      />
    );
  }
  render(<Host />);
  return { changes, bought, room: screen.getByTestId('hangar') };
}

const item = (id: string) => screen.getByTestId(`item-${id}`);

describe('Hangar (FR-045, FR-046)', () => {
  it('shows the groups Farbe, Heckbild, Rauch, Bomben, Mütze with every item and a name for each', () => {
    renderHangar(emptyHangar());
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Farbe', 'Heckbild', 'Rauch', 'Bomben', 'Mütze']);
    for (const i of ITEMS) expect(item(i.id).textContent).toContain(t().hangar.items[i.id]);
    expect(item('bomb.water').textContent).toContain('Wasserbombe');
    expect(item('hat.bobble').textContent).toContain('Mütze mit Bommel');
  });

  it('owns and chooses the free item of each category for a new player', () => {
    renderHangar(emptyHangar());
    for (const c of HANGAR_CATEGORIES) {
      const free = ITEMS.find((i) => i.category === c && i.price === 0)!;
      expect(item(free.id).dataset.owned).toBe('true');
      expect(item(free.id).dataset.chosen).toBe('true');
    }
    expect(item('planeColor.blue').dataset.owned).toBe('false');
    expect(screen.getByTestId('hangar-preview').dataset.look).toBe('planeColor.red tail.star smoke.none bomb.confetti hat.cap');
  });

  it('shows "noch N Sterne" on an item the stars do not reach, and a tap does nothing', () => {
    const { changes } = renderHangar({ ...emptyHangar(), stars: 12 });
    expect(item('planeColor.green').textContent).toContain('noch 3 Sterne');
    expect(item('planeColor.green').dataset.locked).toBe('true');
    expect(item('planeColor.blue').textContent).toContain('Kaufen für 10 Sterne');
    fireEvent.click(item('planeColor.green'));
    expect(changes).toEqual([]);
    expect(screen.queryByTestId('buy-question')).toBeNull();
  });

  it('buys a cheap item at once without a question and chooses it', () => {
    const { changes, bought, room } = renderHangar({ ...emptyHangar(), stars: 12 });
    fireEvent.click(item('planeColor.blue'));
    expect(screen.queryByTestId('buy-question')).toBeNull();
    expect(changes).toHaveLength(1);
    expect(bought).toEqual([true]);
    expect(room.dataset.stars).toBe('2');
    expect(item('planeColor.blue').dataset.owned).toBe('true');
    expect(item('planeColor.blue').dataset.chosen).toBe('true');
    expect(item('planeColor.red').dataset.chosen).toBe('false');
  });

  it('asks before a dearer item; "Nein" and Escape keep the stars, "Ja" buys and chooses it', () => {
    const onBack = vi.fn();
    const { changes, bought, room } = renderHangar({ ...emptyHangar(), stars: 40 }, onBack);
    fireEvent.click(item('bomb.water'));
    expect(screen.getByTestId('buy-question').textContent).toContain('Für 30 Sterne kaufen?');
    fireEvent.click(screen.getByRole('button', { name: 'Nein' }));
    expect(screen.queryByTestId('buy-question')).toBeNull();
    fireEvent.click(item('bomb.water'));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(screen.queryByTestId('buy-question')).toBeNull();
    expect(changes).toEqual([]);
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(item('bomb.water'));
    fireEvent.click(screen.getByRole('button', { name: 'Ja' }));
    expect(room.dataset.stars).toBe('10');
    expect(bought).toEqual([true]);
    expect(item('bomb.water').dataset.chosen).toBe('true');
  });

  it('chooses an owned item again at no cost', () => {
    const { bought, room } = renderHangar({ ...emptyHangar(), stars: 5, owned: ['tail.heart'], chosen: { ...emptyHangar().chosen, tail: 'tail.heart' } });
    expect(item('tail.heart').dataset.chosen).toBe('true');
    fireEvent.click(item('tail.star'));
    expect(item('tail.star').dataset.chosen).toBe('true');
    fireEvent.click(item('tail.heart'));
    expect(item('tail.heart').dataset.chosen).toBe('true');
    expect(room.dataset.stars).toBe('5');
    expect(bought).toEqual([false, false]);
  });

  it('"Zurück" goes back', () => {
    const onBack = vi.fn();
    renderHangar(emptyHangar(), onBack);
    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
