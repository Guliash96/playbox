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
export type Tool = [string, () => void, boolean?];
export function setTools(list: Tool[]) {
  const t = $('#tools');
  t.innerHTML = list.map((x, i) => `<button class="btn sm ${x[2] ? '' : 'ghost'}" data-t="${i}">${x[0]}</button>`).join('');
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
