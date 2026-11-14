/**
 * The color row of "Male an" (FR-023, contracts/screens.md "Round", `data-testid="palette"`): one round button per
 * color of the building, in the palette's fixed order. A tap picks the color; the picked color stands out with a
 * thick dark ring. The keyboard marker (Tab moves it to this row, GridView) is a thick yellow ring.
 *
 * Buttons never take focus, so Enter and Space keep going to the game.
 */
import { t } from '../i18n';
import { noFocus } from './noFocus';

interface Props {
  palette: readonly string[];
  /** The color picked, or null before the first pick. */
  picked: string | null;
  /** The palette index of the keyboard marker, or null while the marker is on the grid. */
  marker: number | null;
  disabled: boolean;
  onPick: (color: string) => void;
}

export function ColorRow({ palette, picked, marker, disabled, onPick }: Props) {
  const text = t().round;
  return (
    <div className="color-row" data-testid="palette" role="group" aria-label={text.palette} data-picked={picked ?? ''}>
      {palette.map((color, i) => (
        <button
          key={color}
          type="button"
          className={['color-swatch', color === picked ? 'picked' : '', marker === i ? 'marked' : ''].filter(Boolean).join(' ')}
          data-color={color}
          aria-label={text.colorNames[color] ?? color}
          aria-pressed={color === picked}
          disabled={disabled}
          style={{ backgroundColor: color }}
          {...noFocus}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  );
}
