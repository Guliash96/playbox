// Player settings (sound, vibration, tile highlight) + the in-game ≡ menu.
import { $ } from './util';
import { modal, closeModal, dismissable } from './ui';
import { store } from './store';
import { t } from './i18n';
import { isMuted, setMuted } from './sfx';

export const Settings = {
  vib: () => store.get('vib', true),
  hl: () => store.get('hl', true),
  set(k: 'vib' | 'hl', v: boolean) { store.set(k, v); document.dispatchEvent(new Event('settings')); },
};

/** extra rows a game can add to the menu: [label, action] */
export const menuExtra: { items: [string, () => void][]; highlight: boolean } = { items: [], highlight: false };

export function settingsMenu(back?: () => void) {
  const row = (id: string, label: string, on: boolean) => `<button class="srow" id="${id}"><span>${t(label)}</span><i class="tg ${on ? 'on' : ''}"></i></button>`;
  modal(`<h2>${t('Налаштування')}</h2><div class="srows">
    ${row('s_snd', 'Звук', !isMuted())}${row('s_vib', 'Вібрація', Settings.vib())}${menuExtra.highlight ? row('s_hl', 'Підсвітка доступних', Settings.hl()) : ''}
    </div>${menuExtra.items.length ? `<div class="btns">${menuExtra.items.map((x, i) => `<button class="btn ghost" data-mx="${i}">${t(x[0])}</button>`).join('')}</div>` : ''}`, [[t('Закрити'), back]]);
  dismissable(back);
  const flip = (id: string, get: () => boolean, set: (v: boolean) => void) => { const b = $('#' + id); if (b) b.onclick = () => { set(!get()); b.querySelector('i')!.classList.toggle('on', get()); }; };
  flip('s_snd', () => !isMuted(), v => setMuted(!v));
  flip('s_vib', Settings.vib, v => Settings.set('vib', v));
  flip('s_hl', Settings.hl, v => Settings.set('hl', v));
  document.querySelectorAll<HTMLElement>('#modal [data-mx]').forEach(b => b.onclick = () => { closeModal(); if (back) import('./pause').then(m => m.resume()); menuExtra.items[+b.dataset.mx!][1](); });
}
