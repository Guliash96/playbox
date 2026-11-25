// Blocks: 8x8 board, drag 3 pieces, full rows/columns clear.
import './blocks.css';
import { pick, $$ } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill } from '../core/ui';
import { gameOver } from '../core/flow';
import { Score } from '../core/score';
import type { Game } from './registry';

const BCOL = ['#ff3d7f', '#2f9bff', '#ffb020', '#7b5cff', '#e8443a', '#18b5c4', '#2fbf71'];
type Cells = [number, number][];
const SHAPES: Cells[] = (() => {
  const base = ['1', '11', '111', '1111', '11111', '11/11', '111/111/111', '111/111', '10/11', '100/111', '010/111', '110/011'];
  const parse = (s: string) => { const o: Cells = []; s.split('/').forEach((row, r) => [...row].forEach((ch, c) => ch === '1' && o.push([r, c]))); return o; };
  const rot = (p: Cells): Cells => { const m = Math.max(...p.map(x => x[0])); return p.map(([r, c]) => [c, m - r]); };
  const seen = new Set<string>(), out: Cells[] = [];
  base.forEach(s => { let p = parse(s); for (let i = 0; i < 4; i++) { p = rot(p); const k = JSON.stringify([...p].sort((a, b) => a[0] - b[0] || a[1] - b[1])); if (!seen.has(k)) { seen.add(k); out.push(p); } } });
  return out;
})();
interface Piece { cells: Cells; col: string }

const cellHTML = (col: string) => `<i class="f" style="--c:${col}"></i>`;
function pieceHTML(p: Piece, cs: number, gap: number) {
  const w = Math.max(...p.cells.map(x => x[1])) + 1, h = Math.max(...p.cells.map(x => x[0])) + 1;
  return `<div class="pc" style="gap:${gap}px;grid-template-columns:repeat(${w},${cs}px);grid-template-rows:repeat(${h},${cs}px)">${p.cells.map(([r, c]) => `<i class="f" style="grid-row:${r + 1};grid-column:${c + 1};--c:${p.col}"></i>`).join('')}</div>`;
}

const Blocks: Game & Record<string, any> = {
  title: 'Блоки', theme: 'th-blocks',
  start(el: HTMLElement) { this.el = el; this.b = Array(64).fill(0); this.score = 0; this.cont = false; this.best = store.get('bb_best', 0); this.refill(); this.draw(); setTools([['Нова гра', () => this.start(el)]]); },
  hud() { setStats(`${pill(this.score)}${pill('Рекорд ' + this.best)}`); },
  fits(p: Piece, r: number, c: number) { return p.cells.every(([dr, dc]) => { const y = r + dr, x = c + dc; return y >= 0 && y < 8 && x >= 0 && x < 8 && !this.b[y * 8 + x]; }); },
  anyFit(p: Piece) { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (this.fits(p, r, c)) return true; return false; },
  canMove() { return this.tray.some((p: Piece) => p && this.anyFit(p)); },
  refill() { for (let t = 0; t < 40; t++) { this.tray = [0, 1, 2].map(() => ({ cells: pick(SHAPES), col: pick(BCOL) })); if (this.canMove()) break; } },
  draw() {
    this.el.innerHTML = `<div class="bb"><div class="board">${this.b.map((v: string) => v ? cellHTML(v) : '<i></i>').join('')}</div><div class="tray">${this.tray.map((p: Piece, i: number) => `<div class="slot" data-i="${i}">${p ? pieceHTML(p, 17, 2) : ''}</div>`).join('')}</div></div>`;
    this.hud();
    $$('.slot', this.el).forEach(s => s.onpointerdown = (e: PointerEvent) => this.grab(e, s, +s.dataset.i!));
  },
  grab(e: PointerEvent, slot: HTMLElement, i: number) {
    const p: Piece = this.tray[i]; if (!p) return; e.preventDefault();
    const board = this.el.querySelector('.board'), cells = [...board.children] as HTMLElement[];
    const r0 = cells[0].getBoundingClientRect(), step = cells[1].getBoundingClientRect().left - r0.left, cs = r0.width;
    const g = document.createElement('div'); g.className = 'drag'; g.innerHTML = pieceHTML(p, cs, step - cs); document.body.appendChild(g);
    slot.style.opacity = '.2'; haptic();
    const lift = e.pointerType !== 'mouse'; let tgt: number[] | null = null; board.style.setProperty('--pc', p.col);
    const move = (ev: PointerEvent) => {
      const w = g.offsetWidth, h = g.offsetHeight, x = ev.clientX - w / 2, y = ev.clientY - h / 2 - (lift ? h / 2 + 40 : 0);
      g.style.left = x + 'px'; g.style.top = y + 'px';
      const c = Math.round((x - r0.left) / step), r = Math.round((y - r0.top) / step);
      cells.forEach(el => el.classList.remove('pv'));
      tgt = this.fits(p, r, c) ? [r, c] : null;
      if (tgt) p.cells.forEach(([dr, dc]) => cells[(r + dr) * 8 + c + dc].classList.add('pv'));
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      g.remove(); slot.style.opacity = ''; cells.forEach(el => el.classList.remove('pv'));
      if (tgt) this.place(i, tgt[0], tgt[1]);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up); move(e);
  },
  place(i: number, r: number, c: number) {
    const p: Piece = this.tray[i];
    p.cells.forEach(([dr, dc]) => this.b[(r + dr) * 8 + c + dc] = p.col); this.tray[i] = null; this.score += p.cells.length;
    const full = new Map<number, string>(); let lines = 0;
    for (let k = 0; k < 8; k++) {
      let row = true, col = true;
      for (let j = 0; j < 8; j++) { if (!this.b[k * 8 + j]) row = false; if (!this.b[j * 8 + k]) col = false; }
      if (row) { lines++; for (let j = 0; j < 8; j++) full.set(k * 8 + j, this.b[k * 8 + j]); }
      if (col) { lines++; for (let j = 0; j < 8; j++) full.set(j * 8 + k, this.b[j * 8 + k]); }
    }
    full.forEach((_, x) => this.b[x] = 0);
    Score.good(p.cells.length);
    if (lines) { this.score += lines * lines * 10; Score.add(lines * lines * 20 * Score.mult); haptic('ok'); } else haptic();
    if (this.score > this.best) { this.best = this.score; store.set('bb_best', this.best); }
    if (this.tray.every((x: Piece) => !x)) this.refill();
    this.draw();
    const cells = this.el.querySelectorAll('.board i');
    let k = 0; full.forEach((col, x) => { const ghost = document.createElement('b'); ghost.className = 'burstcell'; ghost.style.cssText = `--c:${col};animation-delay:${(k++ % 8) * 25}ms`; cells[x].appendChild(ghost); });
    if (lines > 1) { const t = document.createElement('div'); t.className = 'combo'; t.textContent = `Комбо ×${lines}`; this.el.querySelector('.bb').appendChild(t); setTimeout(() => t.remove(), 900); }
    if (!this.canMove()) setTimeout(() => this.over(), 500);
  },
  over() {
    const b: any[] = [];
    if (!this.cont) b.push(['', () => ((() => { this.cont = true; for (let r = 2; r < 6; r++) for (let c = 2; c < 6; c++) this.b[r * 8 + c] = 0; if (!this.canMove()) this.refill(); this.draw(); }))()]);
    gameOver('Місця немає', `<p>Рахунок: <b>${this.score}</b> · рекорд ${this.best}</p>`, this.cont ? null : () => b[0][1](), () => this.start(this.el));
  },
};
export default Blocks;
