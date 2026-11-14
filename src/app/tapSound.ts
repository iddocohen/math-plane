/**
 * Whether a click taps softly (the `tap` sound): on a button that is not disabled or aria-disabled, and that does not
 * carry `data-no-tap` (a purchase plays the coin sound instead).
 */
export function tapsSoftly(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const button = target.closest('button');
  if (!button || button.disabled) return false;
  return button.getAttribute('aria-disabled') !== 'true' && !button.hasAttribute('data-no-tap');
}
