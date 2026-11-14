/**
 * A plain stand-in for the Hangar (T066 replaces `HangarScreen`), so App.tsx routes every screen of
 * contracts/screens.md now. It shows its title, the stars and a way back.
 */
import { t } from '../i18n';

interface BackProps {
  onBack: () => void;
}

export function HangarScreen({ stars, onBack }: BackProps & { stars: number }) {
  const text = t();
  return (
    <main className="panel-screen" data-testid="hangar" lang="de">
      <h2>{text.hangar.title}</h2>
      <p className="star-total">{text.start.stars(stars)}</p>
      <button type="button" className="primary" onClick={onBack}>
        {text.hangar.back}
      </button>
    </main>
  );
}
