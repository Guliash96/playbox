import { $, $$ } from './util';
import { haptic } from './platform';
import { store } from './store';

export type Btn = [string, (() => void)?];

export function modal(html: string, btns: Btn[] = []) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}<div class="btns">${btns.map((b, i) => `<button class="btn ${i ? 'ghost' : ''}" data-i="${i}">${b[0]}</button>`).join('')}</div></div>`;
  m.hidden = false;
  $$('[data-i]', m).forEach(el => el.onclick = () => { closeModal(); btns[+el.dataset.i!][1]?.(); });
}
export function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }

let toastT: any;
export function toast(t: string) {
  const e = $('#toast'); e.textContent = t; e.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => e.hidden = true, 1800);
}

export const setStats = (h: string) => { $('#stats').innerHTML = h; };
/** [label, action, primary?, badge?]; a label "i:name" draws a round icon button (see ICON) */
export type Tool = [string, () => void, boolean?, (number | string)?];
export const extraTool: { fn: (() => void) | null } = { fn: null };
const S = (d: string, extra = '') => `<svg viewBox="0 0 24 24" ${extra}>${d}</svg>`;
export const ICON: Record<string, string> = {
  hint: S('<circle cx="10" cy="10" r="6" fill="#bfe8ff" stroke="#1b1b1f" stroke-width="2.4"/><path d="M14.5 14.5l5.5 5.5" stroke="#1b1b1f" stroke-width="3.4" stroke-linecap="round"/><path d="M7.5 8.5a3 3 0 0 1 2.5-2" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
  shuffle: S('<path d="M19 8a7.5 7.5 0 0 0-13.4-1.6M5 16a7.5 7.5 0 0 0 13.4 1.6" fill="none" stroke="#1b1b1f" stroke-width="2.6" stroke-linecap="round"/><path d="M20.5 3.5v5h-5M3.5 20.5v-5h5" fill="none" stroke="#1b1b1f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  undo: S('<path d="M9 5L4 10l5 5" fill="none" stroke="#1b1b1f" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 10H14a6 6 0 0 1 0 12h-3" fill="none" stroke="#1b1b1f" stroke-width="2.8" stroke-linecap="round"/>'),
  restart: S('<path d="M20 12a8 8 0 1 1-2.4-5.7" fill="none" stroke="#1b1b1f" stroke-width="2.6" stroke-linecap="round"/><path d="M20 3v5h-5" fill="none" stroke="#1b1b1f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  cup: S('<path d="M7 3h10v3h3v2a5 5 0 0 1-4.3 5A5 5 0 0 1 13 15.7V18h3v3H8v-3h3v-2.3A5 5 0 0 1 8.3 13 5 5 0 0 1 4 8V6h3z" fill="#ffc533" stroke="#1b1b1f" stroke-width="1.8" stroke-linejoin="round"/>'),
  pause: S('<rect x="6" y="5" width="4" height="14" rx="1.5" fill="#1b1b1f"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="#1b1b1f"/>'),
  menu: S('<path d="M6 8h12M6 12h12M6 16h12" stroke="#1b1b1f" stroke-width="2.6" stroke-linecap="round"/>'),
  bug: S('<path d="M12 3L22 20H2z" fill="#ff3d4f" stroke="#1b1b1f" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17" r="1.4" fill="#fff"/>'),
  ad: S('<rect x="3" y="5" width="18" height="14" rx="3" fill="#7fd1ff" stroke="#1b1b1f" stroke-width="2"/><path d="M10 9l5 3-5 3z" fill="#1b1b1f"/>'),
  gem: S('<path d="M6 4h12l4 6-10 11L2 10z" fill="#5fd3ff" stroke="#1b1b1f" stroke-width="1.8" stroke-linejoin="round"/><path d="M2 10h20M8 4l4 17 4-17" fill="none" stroke="#1b1b1f" stroke-width="1.2" opacity=".55"/><path d="M7 6l-2 3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>'),
};
export function setTools(list: Tool[]) {
  if (extraTool.fn) list = [...list, ['i:cup', extraTool.fn]];
  const t = $('#tools');
  t.innerHTML = list.map((x, i) => x[0].startsWith('i:')
    ? `<button class="ibig ${x[0].slice(2)}" data-t="${i}" aria-label="${x[0].slice(2)}">${ICON[x[0].slice(2)] || ''}${x[3] != null ? `<b class="badge">${x[3]}</b>` : ''}</button>`
    : `<button class="btn sm ${x[2] ? '' : 'ghost'}" data-t="${i}">${x[0]}</button>`).join('');
  $$('[data-t]', t).forEach(b => b.onclick = () => list[+b.dataset.t!][1]());
}
export const pill = (s: string | number) => `<span class="pill">${s}</span>`;

export function flash(el: Element | null, c: string, ms = 1300) {
  if (!el) return;
  el.classList.remove(c); void (el as HTMLElement).offsetWidth; el.classList.add(c);
  setTimeout(() => el.classList.remove(c), ms);
}

const HEART = 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z';
export const hearts = (n: number, max = 3) =>
  `<span class="hearts" aria-label="серця: ${n}">${Array.from({ length: max }, (_, i) => `<svg viewBox="0 0 24 24"><path d="${HEART}" fill="${i < n ? '#ff3d7f' : 'none'}" stroke="currentColor" stroke-width="2"/></svg>`).join('')}</span>`;

/** shared "level complete" flow; interstitial every 3rd level */
export function levelDone(key: string, lvl: number, next: () => void, interstitial: (cb: () => void) => void) {
  store.set(key, lvl + 1); haptic('ok');
  const h = location.hash;
  setTimeout(() => location.hash === h && modal(
    `<div class="burst"></div><h2>Рівень ${lvl} пройдено</h2><p class="muted">Наступний буде трохи складніший.</p>`,
    [['Далі', () => lvl % 3 === 0 ? interstitial(next) : next()], ['До ігор', () => { location.hash = ''; }]]
  ), 450);
}
