/**
 * What the child sees when the game cannot go on: a short friendly line and one button (`StuckScreen`). The app shows
 * it with "Zum Start" when the game chunk or the font does not load, and `ErrorBoundary` shows it with "Neu laden" when
 * a screen throws while it renders. Both log the error with `console.error`, so a parent with the browser tools can
 * read it. The line holds none of the forbidden words (i18n/index.ts).
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

interface StuckProps {
  /** The text of the one button. */
  button: string;
  onClick: () => void;
}

export function StuckScreen({ button, onClick }: StuckProps) {
  const text = t().round.stuck;
  return (
    <div className="round-end stuck-screen" data-testid="stuck-screen" role="alertdialog" aria-modal="true" aria-label={text}>
      <h2>{text}</h2>
      <div className="round-end-buttons">
        <button type="button" className="primary" data-testid="stuck-button" onClick={onClick}>
          {button}
        </button>
      </div>
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  /** What "Neu laden" does; defaults to reloading the page, which continues a stored round. */
  onReload?: () => void;
}

interface BoundaryState {
  failed: boolean;
}

/** Catches an error thrown while its children render and shows `StuckScreen` with "Neu laden" in their place. */
export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Mathe-Flieger: a screen could not be shown', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    const reload = this.props.onReload ?? (() => window.location.reload());
    return <StuckScreen button={t().round.reload} onClick={reload} />;
  }
}
