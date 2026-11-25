// Points with a combo multiplier: every 3 correct actions in a row raise it (up to ×5), a mistake resets to ×1.
// At the end of a level the bonus needle can multiply the result ×2/×3/×4 for a rewarded ad.
import { $ } from './util';
import { modal, closeModal, toast } from './ui';
import { Ads } from './ads';
import { addPoints } from './net';
import { t } from './i18n';

export const Score = {
  game: '', pts: 0, streak: 0, mult: 1,
  begin(game: string) { this.game = game; this.pts = 0; this.streak = 0; this.mult = 1; this.render(); },
  good(base = 10) {
    this.streak++; const m = Math.min(5, 1 + Math.floor(this.streak / 3));
    if (m > this.mult) { this.mult = m; this.bump(); }
    const g = Math.round(base * this.mult); this.pts += g; this.render(); this.float('+' + g); return g;
  },
  bad() { if (this.mult > 1) this.float('×1', true); this.streak = 0; this.mult = 1; this.render(); },
  add(n: number) { n = Math.round(n); if (n > 0) { this.pts += n; this.render(); } },
  /** send points without the bonus needle (endless games call it via finishSheet) */
  commit(extra = 1) { const p = Math.round(this.pts * extra); if (p > 0) addPoints(this.game, p); this.pts = 0; this.streak = 0; this.mult = 1; this.render(); return p; },
  render() {
    const el = $('#scorebar'); if (!el) return;
    if (!this.game) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="sp">${t('Очки')} <b>${this.pts.toLocaleString()}</b></span><span class="sm m${this.mult}">×${this.mult}</span>`;
  },
  bump() { const m = $('#scorebar .sm'); m?.classList.remove('up'); void (m as any)?.offsetWidth; m?.classList.add('up'); },
  float(txt: string, bad = false) {
    const bar = $('#scorebar'); if (!bar) return;
    const e = document.createElement('b'); e.className = 'sfloat' + (bad ? ' bad' : ''); e.textContent = txt; bar.appendChild(e); setTimeout(() => e.remove(), 700);
  },
};

const ZONES: [number, number, number][] = [[0, .32, 2], [.32, .44, 3], [.44, .56, 4], [.56, .68, 3], [.68, 1, 2]];
/** end-of-round sheet: shows points, a swinging needle; "Stop" + ad multiplies, or take the plain amount */
export function scoreSheet(title: string, sub: string, onDone: (got: number) => void) {
  const pts = Score.pts;
  if (pts <= 0) { Score.commit(); return onDone(0); }
  modal(`<div class="burst"></div><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}
    <div class="ssum"><span>${t('Отримано очок')}</span><b>${pts.toLocaleString()}</b></div>
    <p class="muted" style="text-align:center;margin:10px 0 4px">${t('Зупини стрілку й помнож очки!')}</p>
    <div class="wheel"><div class="zones">${ZONES.map(([a, b, m]) => `<span class="z${m}" style="width:${(b - a) * 100}%">×${m}</span>`).join('')}</div><i class="needle"></i></div>
    <div class="btns"><button class="btn" id="wstop">${t('Стоп: множник за рекламу')}</button><button class="btn ghost" id="wtake">${t('Забрати {0}', pts.toLocaleString())}</button></div>`);
  let p = 0, dir = 1, raf = 0, last = 0;
  const needle = $('#modal .needle') as HTMLElement;
  const loop = (ts: number) => { const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts; p += dir * dt * 1.25; if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; } needle.style.left = p * 100 + '%'; raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  const end = (got: number) => { cancelAnimationFrame(raf); closeModal(); onDone(got); };
  $('#wtake').onclick = () => end(Score.commit());
  $('#wstop').onclick = () => {
    cancelAnimationFrame(raf);
    const m = ZONES.find(([a, b]) => p >= a && p <= b)![2];
    ($('#wstop') as HTMLButtonElement).disabled = true; toast(t('Множник ×{0}!', m));
    setTimeout(() => { closeModal(); Ads.rewarded(() => onDone(Score.commit(m))); }, 650);
  };
}
