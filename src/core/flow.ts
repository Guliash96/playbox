import { levelDone, modal } from './ui';
import { Ads } from './ads';

export const done = (key: string, lvl: number, next: () => void) => levelDone(key, lvl, next, cb => Ads.interstitial(cb));

/** "out of hearts" sheet with a one-off rewarded continue */
export function outOfHearts(onRevive: () => void, onRestart: () => void) {
  setTimeout(() => modal('<h2>Серця скінчились</h2><p class="muted">Подивись рекламу, щоб продовжити, або почни рівень заново.</p>',
    [['Реклама: +1 серце', () => Ads.rewarded(onRevive)], ['Почати заново', onRestart]]), 450);
}
