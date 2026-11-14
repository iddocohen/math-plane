/**
 * Plain stand-ins for the screens later tasks build, so App.tsx routes every screen of contracts/screens.md now:
 * the Hangar (T066 replaces `HangarScreen`), the parent menu, settings and progress pages (T059, T060, T062 replace
 * `ParentScreen`) and the transfer dialog (T061 replaces `TransferScreen`). Each shows its title and a way back.
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

export type ParentView = 'menu' | 'settings' | 'progress';

export function ParentScreen({ view, onOpen, onBack }: BackProps & { view: ParentView; onOpen: (view: ParentView) => void }) {
  const text = t();
  const title = view === 'settings' ? text.settings.title : view === 'progress' ? text.progressPage.title : text.parent.title;
  return (
    <main className="panel-screen" data-testid={`parent-${view}`} lang="de">
      <h2>{title}</h2>
      {view === 'menu' && (
        <div className="round-end-buttons">
          <button type="button" onClick={() => onOpen('settings')}>
            {text.parent.settings}
          </button>
          <button type="button" onClick={() => onOpen('progress')}>
            {text.parent.progress}
          </button>
        </div>
      )}
      <button type="button" className="primary" onClick={onBack}>
        {text.parent.back}
      </button>
    </main>
  );
}

export function TransferScreen({ onBack }: BackProps) {
  const text = t().transfer;
  return (
    <main className="panel-screen" data-testid="transfer" lang="de">
      <h2>{text.receiveTitle}</h2>
      <button type="button" className="primary" onClick={onBack}>
        {text.close}
      </button>
    </main>
  );
}
