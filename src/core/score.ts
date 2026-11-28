// Score strip: [current points] [this round] [×multiplier] [🏆 high score].
// Current points add up level after level and drop to 0 when you lose (Score.lose) or leave the game.
// The multiplier grows every 8 s without a mistake (×1…×5) and drops to ×1 at once on a mistake.
// Beating the high score shows a "New high score!" banner once per run. Leaderboards rank high scores.
import { $ } from './util';
import { modal, closeModal, toast } from './ui';
import { Ads } from './ads';
import { addPoints, submitBest, localBest } from './net';
import { t } from './i18n';
import { sfx } from './sfx';
import { Paused, onPause } from './pause';
onPause(on => { if (!on) Score.since += performance.now() - Paused.since; });

let STEP = 8000; const MAXM = 5;
/** how many ms of good play per multiplier step (some games build it slower) */
export const setStep = (ms: number) => { STEP = ms; };
const CHEER = ['', '', 'Добре!', 'Чудово!', 'Так тримати!', 'Неймовірно!'];
let timer: any = 0;

export const Score = {
  game: '', pts: 0, run: 0, best: 0, mult: 1, since: 0, hsShown: false, lastGood: 0, lastTick: 0,
  begin(game: string) {
    STEP = 8000;
    this.game = game; this.pts = 0; this.run = 0; this.mult = 1; this.hsShown = false; this.since = performance.now();
    this.lastGood = 0; this.lastTick = performance.now(); this.best = game ? localBest(game) : 0; this.hsShown = this.best === 0; this.render(); clearInterval(timer); if (game) timer = setInterval(() => this.tick(), 250);
  },
  tick() {
    const now = performance.now(), dt = now - this.lastTick; this.lastTick = now;
    if (Paused.on) return;
    // the multiplier only grows while you keep making good moves (idle > 5 s freezes it)
    if (now - this.lastGood > 6000) { if (this.mult > 1) { this.mult = 1; this.render(); } this.since = now; this.progress(); return; }
    const m = Math.min(MAXM, 1 + Math.floor((performance.now() - this.since) / STEP));
    if (m !== this.mult) { this.mult = m; this.render(); this.bump(); if (m >= 2) cheer(t(CHEER[m])); } else this.progress();
  },
  good(base = 10) { this.lastGood = performance.now(); const g = Math.round(base * this.mult); this.pts += g; this.check(); this.render(); this.float('+' + g); return g; },
  bad() { if (this.mult > 1) this.float('×1', true); this.mult = 1; this.since = performance.now(); this.render(); },
  add(n: number) { n = Math.round(n); if (n > 0) { this.pts += n; this.check(); this.render(); } },
  /** round finished: its points (× bonus) move into the current total */
  commit(extra = 1) {
    const p = Math.round(this.pts * extra); if (p > 0) { addPoints(this.game, p); this.run += p; }
    this.pts = 0; this.mult = 1; this.since = performance.now(); this.check(); this.render(); return p;
  },
  /** the run is over (lost / restarted): current points back to 0 */
  lose() { this.commit(); this.run = 0; this.hsShown = this.best === 0; this.render(); },
  check() {
    const cur = this.run + this.pts; if (!this.game || cur <= this.best) return;
    this.best = cur; submitBest(this.game, cur);
    if (!this.hsShown && cur > 0) { this.hsShown = true; banner(t('Новий рекорд!')); sfx('win'); }
  },
  stop() { clearInterval(timer); this.game = ''; this.render(); },
  render() {
    const el = $('#scorebar'); if (!el) return;
    if (!this.game) { el.innerHTML = ''; return; }
    el.innerHTML = `<span class="sp" title="${t('Очки')}"><b>${(this.run + this.pts).toLocaleString()}</b></span><span class="sr" title="${t('За цей захід')}">+${this.pts.toLocaleString()}</span><span class="sm m${this.mult}">×${this.mult}<i></i></span><span class="st" title="${t('Рекорд')}">${CUP}${this.best.toLocaleString()}</span>`;
    this.progress();
  },
  progress() { const i = $('#scorebar .sm i') as HTMLElement; if (i) i.style.width = this.mult >= MAXM ? '100%' : ((performance.now() - this.since) % STEP) / STEP * 100 + '%'; },
  bump() { const m = $('#scorebar .sm'); m?.classList.remove('up'); void (m as any)?.offsetWidth; m?.classList.add('up'); },
  float(txt: string, bad = false) {
    const bar = $('#scorebar'); if (!bar) return;
    const e = document.createElement('b'); e.className = 'sfloat' + (bad ? ' bad' : ''); e.textContent = txt; bar.appendChild(e); setTimeout(() => e.remove(), 700);
  },
};
const CUP = '<svg viewBox="0 0 24 24" class="cup"><path d="M7 3h10v3h3v2a5 5 0 0 1-4.3 5A5 5 0 0 1 13 15.7V18h3v3H8v-3h3v-2.3A5 5 0 0 1 8.3 13 5 5 0 0 1 4 8V6h3z" fill="#ffc533" stroke="#1b1b1f" stroke-width="1.6" stroke-linejoin="round"/></svg>';

/** big centred text over the stage (combo cheers) */
export function cheer(txt: string) {
  const st = $('#stage'); if (!st || !txt) return;
  st.querySelector('.cheer')?.remove();
  const e = document.createElement('div'); e.className = 'cheer'; e.textContent = txt; st.appendChild(e); setTimeout(() => e.remove(), 1300);
}
function banner(txt: string) {
  document.querySelector('.hsban')?.remove();
  const e = document.createElement('div'); e.className = 'hsban'; e.innerHTML = `${CUP}<b>${txt}</b>`; document.body.appendChild(e); setTimeout(() => e.remove(), 2400);
}

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
