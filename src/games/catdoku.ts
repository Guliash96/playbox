// Catdoku: one cat per zone, row and column; cats never touch (diagonals too).
// Tap = ✕ mark, tap again = cat. A wrong cat costs a heart. Every board has exactly one solution.
import './catdoku.css';
import { R, shuffle, range } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, hearts, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done, outOfHearts } from '../core/flow';
import { sittingCat } from '../art/cat';
import { Score } from '../core/score';
import type { Game } from './registry';

const ZONES = ['#ffc1d3', '#b9e0ff', '#ffd9a0', '#d6c9ff', '#b3eee8', '#ffcdb8', '#f3e690', '#e3d3c1'];
const FURS = ['#3a3340', '#e08a3c', '#8c8c96', '#f1e6d6', '#c9a27a', '#5b4636', '#2b2b2b', '#d9b38c'];
const CROSS = (cls: string) => `<svg class="${cls}" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`;

function perm(n: number) { const p: number[] = [], used = Array(n).fill(0); const go = (r: number): boolean => { if (r === n) return true; for (const c of shuffle(range(n))) { if (used[c] || (r && Math.abs(c - p[r - 1]) < 2)) continue; used[c] = 1; p[r] = c; if (go(r + 1)) return true; used[c] = 0; } return false; }; go(0); return p; }
function count(n: number, reg: number[], lim = 2) { let k = 0; const uc = Array(n).fill(0), ur = Array(n).fill(0); const go = (r: number, pc: number) => { if (r === n) { k++; return; } for (let c = 0; c < n && k < lim; c++) { const g = reg[r * n + c]; if (uc[c] || ur[g] || (r && Math.abs(c - pc) < 2)) continue; uc[c] = ur[g] = 1; go(r + 1, c); uc[c] = ur[g] = 0; } }; go(0, -9); return k; }
function generate(n: number) {
  let last: any;
  for (let t = 0; t < 6000; t++) {
    const p = perm(n), reg = Array(n * n).fill(-1); p.forEach((c, r) => reg[r * n + c] = r);
    const w = p.map(() => Math.random() ** 2); let left = n * n - n;
    while (left) {
      const r = R(n), c = R(n); if (reg[r * n + c] >= 0) continue;
      const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && y < n && x >= 0 && x < n && reg[y * n + x] >= 0).map(([y, x]) => reg[y * n + x]);
      if (!nb.length) continue;
      let best = nb[0]; for (const g of nb) if (Math.random() < w[g]) best = g; reg[r * n + c] = best; left--;
    }
    last = { p, reg }; if (count(n, reg) === 1) return last;
  }
  return last;
}

const Catdoku: Game & Record<string, any> = {
  title: 'Котоку', theme: 'th-catdoku',
  start(el: HTMLElement) { this.el = el; this.load(); },
  load() {
    this.lvl = store.get('cd_lvl', 1); const n = this.n = Math.min(8, 4 + Math.ceil(this.lvl / 2));
    const g = generate(n); this.sol = g.p; this.reg = g.reg; this.m = Array(n * n).fill(0); this.hp = 3;
    this.fur = shuffle(FURS.slice()); this.draw();
    setTools([['i:hint', () => Ads.rewarded(() => this.hint()), false, '▶'], ['i:restart', () => { Score.lose(); this.load(); }]]);
  },
  draw() {
    const n = this.n, rg = this.reg;
    const side = (i: number, j: number) => j < 0 ? 'none' : rg[i] !== rg[j] ? '3px solid #2a2230' : '1px solid rgba(60,45,70,.22)';
    let h = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const i = r * n + c, m = this.m[i];
      const st = `background:${ZONES[rg[i]]};border-top:${side(i, r ? i - n : -1)};border-left:${side(i, c ? i - 1 : -1)}`;
      const inner = m === 2 ? `<span class="cat">${sittingCat(this.fur[rg[i]])}</span>` : m === 1 ? CROSS('x') : m === 4 ? CROSS('x auto') : m === 3 ? CROSS('x bad') : '';
      h += `<button data-i="${i}" style="${st}" aria-label="рядок ${r + 1}, стовпець ${c + 1}">${inner}</button>`;
    }
    this.el.innerHTML = `<div class="qframe"><div class="qd" style="grid-template-columns:repeat(${n},minmax(0,1fr));grid-template-rows:repeat(${n},minmax(0,1fr))">${h}</div></div>`;
    this.el.querySelectorAll('.qd button').forEach((b: HTMLElement) => b.onclick = () => this.tap(+b.dataset.i));
    setStats(`${pill('Рів. ' + this.lvl)}${hearts(this.hp)}`);
  },
  cell(i: number) { return this.el.querySelector(`[data-i="${i}"]`); },
  autoX(i: number) {
    const n = this.n, r = Math.floor(i / n), c = i % n;
    for (let j = 0; j < n * n; j++) { const y = Math.floor(j / n), x = j % n; if (j !== i && !this.m[j] && (y === r || x === c || this.reg[j] === this.reg[i] || (Math.abs(y - r) < 2 && Math.abs(x - c) < 2))) this.m[j] = 4; }
  },
  put(i: number) { this.m[i] = 2; this.autoX(i); haptic('ok'); },
  tap(i: number) {
    if (this.hp <= 0) return; const m = this.m[i]; if (m === 2 || m === 3) return;
    if (m === 0) { this.m[i] = 1; haptic(); return this.draw(); }
    if (this.sol[Math.floor(i / this.n)] === i % this.n) { this.put(i); Score.good(30); this.draw(); this.cell(i).classList.add('pop'); }
    else { this.m[i] = 3; this.hp--; Score.bad(); haptic('err'); this.draw(); flash(this.cell(i), 'shake'); }
    this.check();
  },
  check() {
    if (this.m.filter((x: number) => x === 2).length === this.n) {
      this.el.querySelectorAll('.cat').forEach((c: HTMLElement, k: number) => { c.style.animationDelay = k * 80 + 'ms'; c.classList.add('cheer'); });
      return done('cd_lvl', this.lvl, () => this.load());
    }
    if (this.hp <= 0) outOfHearts(() => { this.hp = 1; this.draw(); }, () => this.load());
  },
  hint() {
    const n = this.n;
    for (let r = 0; r < n; r++) { const i = r * n + this.sol[r]; if (this.m[i] !== 2) { this.put(i); this.draw(); flash(this.cell(i), 'glow'); return this.check(); } }
  },
};
export default Catdoku;
