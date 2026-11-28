// Global pause: freezes 3D stages, game loops and the score multiplier timer.
import { $ } from './util';
import { modal, closeModal, ICON } from './ui';
import { t } from './i18n';
import { settingsMenu } from './settings';

export const Paused = { on: false, since: 0 };
const subs: ((on: boolean) => void)[] = [];
export const onPause = (f: (on: boolean) => void) => { subs.push(f); };
export function pause() { if (Paused.on) return; Paused.on = true; Paused.since = performance.now(); subs.forEach(f => f(true)); $('#game')?.classList.add('paused'); }
export function resume() { if (!Paused.on) return; Paused.on = false; subs.forEach(f => f(false)); $('#game')?.classList.remove('paused'); }
/** ms spent paused since `from` (for timers that must not run while paused) */

export function pauseSheet() {
  pause();
  modal(`<h2>${ICON.pause} ${t('Пауза')}</h2><div class="btns">
    <button class="btn" id="p_go">${t('Продовжити')}</button>
    <button class="btn ghost" id="p_set">${t('Налаштування')}</button>
    <button class="btn ghost" id="p_home">${t('До ігор')}</button></div>`);
  $('#p_go').onclick = () => { closeModal(); resume(); };
  $('#p_set').onclick = () => { closeModal(); settingsMenu(() => pauseSheet()); };
  $('#p_home').onclick = () => { closeModal(); resume(); location.hash = ''; };
}
