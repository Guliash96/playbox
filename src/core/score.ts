// Points with a time-based multiplier: every 8 s without a mistake raises it (×1…×5); a mistake drops it to ×1
// at once. The multiplier lives only for the current round. The strip also shows the player's total for this game.
// At the end of a level the bonus needle can multiply the round's points ×2/×3/×4 for a rewarded ad.
import { $ } from './util';
import { modal, closeModal, toast } from './ui';
import { Ads } from './ads';
import { addPoints, localTotal } from './net';
import { t } from './i18n';

const STEP = 8000, MAXM = 5;
let timer: any = 0;

export const Score = {
  game: '', pts: 0, mult: 1, since: 0,
  begin(game: string) { this.game = game; this.pts = 0; this.mult = 1; this.since = performance.now(); this.render(); clearInterval(timer); if (game) timer = setInterval(() => this.tick(), 250); },
  tick() {
    const m = Math.min(MAXM, 1 + Math.floor((performance.now() - this.since) / STEP));
    if (m !== this.mult) { this.mult = m; this.render(); this.bump(); } else this.progress();
  },
  good(base = 10) { const g = Math.round(base * this.mult); this.pts += g; this.render(); this.float('+' + g); return g; },
  bad() { if (this.mult > 1) this.float('×1', true); this.mult = 1; this.since = performance.now(); this.render(); },
  add(n: number) { n = Math.round(n); if (n > 0) { this.pts += n; this.render(); } },
  commit(extra = 1) { const p = Math.round(this.pts * extra); if (p > 0) addPoints(this.game, p); this.pts = 0; this.mult = 1; this.since = performance.now(); this.render(); return p; },
  stop() { clearInterval(timer); this.game = ''; this.render(); },
  render() {
    const el = $('#scorebar'); if (!el) return;
    if (!this.game) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="sp">${t('Очки')} <b>${this.pts.toLocaleString()}</b></span><span class="sm m${this.mult}">×${this.mult}<i></i></span><span class="st">Σ ${(localTotal(this.game) + this.pts).toLocaleString()}</span>`;
    this.progress();
  },
  progress() { const i = $('#scorebar .sm i') as HTMLElement; if (i) i.style.width = this.mult >= MAXM ? '100%' : ((performance.now() - this.since) % STEP) / STEP * 100 + '%'; },
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
