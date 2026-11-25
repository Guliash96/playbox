import { modal } from './ui';
import { Ads } from './ads';
import { store } from './store';
import { haptic } from './platform';
import { Score, scoreSheet } from './score';
import { t } from './i18n';
import { sfx } from './sfx';

/** level complete → points sheet with bonus needle → (ad break every 3rd level) → next */
export function done(key: string, lvl: number, next: () => void) {
  store.set(key, lvl + 1); sfx('win');
  const h = location.hash;
  setTimeout(() => {
    if (location.hash !== h) { Score.commit(); return; }
    const go = () => lvl % 3 === 0 ? Ads.interstitial(next) : next();
    if (Score.pts <= 0) return modal(`<div class="burst"></div><h2>${t('Рівень {0} пройдено', lvl)}</h2><p class="muted">${t('Наступний буде трохи складніший.')}</p>`, [[t('Далі'), go], [t('До ігор'), () => { location.hash = ''; }]]);
    scoreSheet(t('Рівень {0} пройдено', lvl), t('Наступний буде трохи складніший.'), go);
  }, 450);
}

/** "out of hearts" sheet with a rewarded continue */
export function outOfHearts(onRevive: () => void, onRestart: () => void) {
  Score.bad(); sfx('lose');
  setTimeout(() => modal(`<h2>${t('Серця скінчились')}</h2><p class="muted">${t('Подивись рекламу, щоб продовжити, або почни рівень заново.')}</p>`,
    [[t('Реклама: +1 серце'), () => Ads.rewarded(onRevive)], [t('Почати заново'), () => { Score.commit(); onRestart(); }]]), 450);
}

/** endless games: optional rewarded revive, otherwise finish → points sheet → restart */
export function gameOver(title: string, html: string, revive: (() => void) | null, restart: () => void) {
  sfx('lose');
  const b: [string, () => void][] = [];
  if (revive) b.push([t('Реклама: продовжити'), () => Ads.rewarded(revive)]);
  b.push([t('Завершити'), () => scoreSheet(title, '', restart)]);
  modal(`<h2>${title}</h2>${html}<p>${t('Очки')}: <b>${Score.pts.toLocaleString()}</b></p>`, b);
}
