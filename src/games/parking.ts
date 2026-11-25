// Parking: cars (1–3 cells) drive forward when tapped. Clear path → leaves the lot.
// Blocked → drives up to the blocker, bumps it (blocker shakes), rolls back, costs a heart.
import './parking.css';
import { R, pick, shuffle, $$ } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, hearts, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done, outOfHearts } from '../core/flow';
import { carSVG } from '../art/car';
import type { Game } from './registry';

const D = [[-1, 0], [0, 1], [1, 0], [0, -1]];          // up right down left
const ROT = [-90, 0, 90, 180];
const COLS = ['#ff3d7f', '#2f9bff', '#ffb020', '#7b5cff', '#2fbf71', '#e8443a', '#18b5c4', '#f2f2f2'];
interface Car { id: number; fr: number; fc: number; len: number; d: number; col: string; el?: HTMLElement; gone?: boolean }

function cellsOf(c: Car) { const [dr, dc] = D[c.d]; return Array.from({ length: c.len }, (_, k) => [c.fr - dr * k, c.fc - dc * k]); }

function generate(n: number, lvl: number): Car[] {
  const occ: number[][] = Array.from({ length: n }, () => Array(n).fill(-1)), cars: Car[] = [];
  const free = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n && occ[r][c] < 0;
  const pathLen = (r: number, c: number, d: number) => { const [dr, dc] = D[d]; let k = 0; r += dr; c += dc; while (r >= 0 && r < n && c >= 0 && c < n) { if (occ[r][c] >= 0) return -1; k++; r += dr; c += dc; } return k; };
  const lens = lvl < 3 ? [2, 2, 2, 1] : lvl < 6 ? [2, 2, 3, 1] : [2, 3, 3, 2, 1];
  // reverse construction: each new car's exit path is clear of cars placed before it,
  // so removing cars in reverse placement order always solves the board
  for (let pass = 0; pass < 3; pass++) {
    const cells = shuffle(Array.from({ length: n * n }, (_, i) => [Math.floor(i / n), i % n]));
    for (const [r, c] of cells) {
      if (!free(r, c)) continue;
      const len = pick(lens), opts: [number, number][] = [];
      for (let d = 0; d < 4; d++) {
        const car: Car = { id: 0, fr: r, fc: c, len, d, col: '' };
        if (!cellsOf(car).every(([y, x]) => free(y, x))) continue;
        const p = pathLen(r, c, d); if (p >= 0) opts.push([d, p]);
      }
      if (!opts.length) continue;
      opts.sort((a, b) => b[1] - a[1]);
      const d = Math.random() < .7 ? opts[0][0] : pick(opts)[0];
      const car: Car = { id: cars.length, fr: r, fc: c, len, d, col: pick(COLS) };
      cellsOf(car).forEach(([y, x]) => occ[y][x] = car.id); cars.push(car);
    }
  }
  return cars;
}

const Parking: Game & Record<string, any> = {
  title: 'Парковка', theme: 'th-parking',
  start(el: HTMLElement) { this.el = el; this.load(); this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(el); },
  stop() { this.ro?.disconnect(); },
  load() {
    this.lvl = store.get('pk_lvl', 1); this.n = Math.min(9, 5 + Math.floor(this.lvl / 2)); this.hp = 3;
    this.cars = generate(this.n, this.lvl); this.busy = 0;
    this.el.innerHTML = `<div class="lot"><div class="lines"></div></div>`;
    this.board = this.el.firstElementChild;
    for (const c of this.cars) {
      const e = document.createElement('button'); e.className = 'car'; e.setAttribute('aria-label', 'машина');
      e.innerHTML = carSVG(c.len, c.col); e.onclick = () => this.tap(c); c.el = e; this.board.appendChild(e);
    }
    this.layout(); this.hud();
    setTools([['Підказка за рекламу', () => Ads.rewarded(() => this.hint())], ['Заново', () => this.load()]]);
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${hearts(this.hp)}`); },
  layout() {
    const n = this.n, cs = this.cs = Math.floor(Math.min(this.el.clientWidth - 28, this.el.clientHeight - 24, 480) / n);
    this.board.style.cssText = `width:${n * cs + 16}px;height:${n * cs + 16}px;--cs:${cs}px`;
    for (const c of this.cars) if (!c.gone) this.place(c);
  },
  place(c: Car) {
    const cs = this.cs, cells = cellsOf(c), rs = cells.map(x => x[0]), cs2 = cells.map(x => x[1]);
    const r0 = Math.min(...rs), c0 = Math.min(...cs2), h = c.d % 2 === 1;
    Object.assign(c.el!.style, { left: 8 + c0 * cs + 'px', top: 8 + r0 * cs + 'px', width: (h ? c.len : 1) * cs + 'px', height: (h ? 1 : c.len) * cs + 'px' });
    c.el!.style.setProperty('--w', c.len * cs - 6 + 'px'); c.el!.style.setProperty('--h', cs - 6 + 'px'); c.el!.style.setProperty('--rot', ROT[c.d] + 'deg');
  },
  occAt(r: number, c: number): Car | undefined { return this.cars.find((k: Car) => !k.gone && cellsOf(k).some(([y, x]) => y === r && x === c)); },
  ahead(c: Car) { const [dr, dc] = D[c.d]; let r = c.fr + dr, k = c.fc + dc, dist = 0; while (r >= 0 && r < this.n && k >= 0 && k < this.n) { const b = this.occAt(r, k); if (b) return { dist, blocker: b }; dist++; r += dr; k += dc; } return { dist, blocker: null }; },
  tap(c: Car) {
    if (c.gone || this.hp <= 0 || c.el!.dataset.moving) return;
    const { dist, blocker } = this.ahead(c), [dr, dc] = D[c.d], cs = this.cs, e = c.el!;
    e.dataset.moving = '1';
    if (!blocker) {
      c.gone = true; haptic();
      const far = (dist + c.len + 2) * cs, t = 280 + dist * 45;
      e.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dc * far}px,${dr * far}px)` }], { duration: t, easing: 'cubic-bezier(.45,0,.9,.6)', fill: 'forwards' })
        .onfinish = () => e.remove();
      if (this.cars.every((k: Car) => k.gone)) done('pk_lvl', this.lvl, () => this.load());
      return;
    }
    const go = dist * cs + cs * .12, t = 120 + dist * 60;
    e.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dc * go}px,${dr * go}px)`, offset: .45, easing: 'ease-in' }, { transform: `translate(${dc * (go - 6)}px,${dr * (go - 6)}px)`, offset: .55 }, { transform: 'translate(0,0)' }],
      { duration: t * 2 + 200, easing: 'ease-out' }).onfinish = () => { delete e.dataset.moving; };
    setTimeout(() => {
      haptic('err'); flash(blocker.el!, blocker.d % 2 === c.d % 2 ? 'nudge' : 'shake', 400);
      this.hp--; this.hud();
      if (this.hp <= 0) outOfHearts(() => { this.hp = 1; this.hud(); }, () => this.load());
    }, t * .9 + 90);
  },
  hint() { const c = this.cars.find((k: Car) => !k.gone && !this.ahead(k).blocker); if (c) flash(c.el!, 'glow'); },
};
export default Parking;
