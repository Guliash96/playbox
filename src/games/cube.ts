// Cube arrows: a 3D stack of blocks, each with an exit direction. Drag to rotate, tap to fire a block out.
// Blocked → bumps and costs a heart. Built inside-out so every cube is solvable.
import './cube.css';
import { shuffle, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, hearts, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done, outOfHearts } from '../core/flow';
import type { Game } from './registry';

type V = [number, number, number];
const DIRS: V[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
// CSS faces: transform, outward normal, local u (right) and v (down) axes in cube space (x right, y down, z to viewer)
const FACES: { t: string; n: V; u: V; v: V; sh: number }[] = [
  { t: 'translateZ(var(--h))', n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], sh: 0 },
  { t: 'rotateY(180deg) translateZ(var(--h))', n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], sh: -.18 },
  { t: 'rotateY(90deg) translateZ(var(--h))', n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], sh: -.1 },
  { t: 'rotateY(-90deg) translateZ(var(--h))', n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], sh: -.1 },
  { t: 'rotateX(90deg) translateZ(var(--h))', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], sh: .12 },
  { t: 'rotateX(-90deg) translateZ(var(--h))', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], sh: -.25 },
];
const COLS = ['#ff6b9a', '#4aa8ff', '#ffb84a', '#9a7bff', '#33c9b5', '#ff7a59'];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ARROW = '<svg viewBox="0 0 24 24"><path d="M3 12h13M11 6l6 6-6 6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HEAD = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.5" fill="#fff"/><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/></svg>';
const TAIL = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="#fff" opacity=".45"/></svg>';
interface B { p: V; d: number; col: string; el?: HTMLElement; gone?: boolean }

function generate(X: number, Y: number, Z: number): B[] {
  const c: V = [(X - 1) / 2, (Y - 1) / 2, (Z - 1) / 2], cells: V[] = [];
  for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) cells.push([x, y, z]);
  const ring = (p: V) => Math.max(Math.abs(p[0] - c[0]) / X, Math.abs(p[1] - c[1]) / Y, Math.abs(p[2] - c[2]) / Z);
  // inside-out placement: a new block's exit ray only crosses cells not placed yet → reverse order solves it
  const order = shuffle(cells).sort((a, b) => ring(a) - ring(b) + (Math.random() - .5) * .08);
  const occ = new Set<string>(), K = (p: V) => p.join(','), out: B[] = [];
  const clear = (p: V, d: V) => { let q: V = [p[0] + d[0], p[1] + d[1], p[2] + d[2]]; while (q[0] >= 0 && q[0] < X && q[1] >= 0 && q[1] < Y && q[2] >= 0 && q[2] < Z) { if (occ.has(K(q))) return false; q = [q[0] + d[0], q[1] + d[1], q[2] + d[2]]; } return true; };
  for (const p of order) {
    const ok = DIRS.map((d, i) => i).filter(i => clear(p, DIRS[i]));
    if (!ok.length) continue;
    out.push({ p, d: pick(ok), col: pick(COLS) }); occ.add(K(p));
  }
  return out;
}

const Cube: Game & Record<string, any> = {
  title: 'Куб-стрілки', theme: 'th-cube',
  start(el: HTMLElement) { this.el = el; this.rx = -24; this.ry = 34; this.load(); this.bindDrag(); },
  stop() { this.unbind?.(); },
  load() {
    const L = this.lvl = store.get('cb_lvl', 1);
    this.dims = (L < 3 ? [3, 3, 3] : L < 5 ? [4, 3, 3] : L < 8 ? [4, 4, 3] : [4, 4, 4]) as V;
    this.hp = 3; this.blocks = generate(...this.dims as V);
    const [X, Y, Z] = this.dims, s = this.s = Math.floor(Math.min(this.el.clientWidth, this.el.clientHeight, 460) / (Math.max(X, Y, Z) * 1.85));
    this.el.innerHTML = `<div class="cscene"><div class="cube" style="--s:${s}px;--h:${s / 2}px"></div></div>`;
    this.cube = this.el.querySelector('.cube');
    for (const b of this.blocks) {
      const d = DIRS[b.d], e = document.createElement('div'); e.className = 'blk';
      const pos = [(b.p[0] - (X - 1) / 2) * s, (b.p[1] - (Y - 1) / 2) * s, (b.p[2] - (Z - 1) / 2) * s];
      e.style.transform = `translate3d(${pos[0]}px,${pos[1]}px,${pos[2]}px)`; e.dataset.pos = pos.join(',');
      e.innerHTML = FACES.map(f => {
        const k = dot(d, f.n), bg = `background:color-mix(in srgb,${b.col} ${100 - Math.abs(f.sh) * 100}%,${f.sh > 0 ? '#fff' : '#000'})`;
        const icon = k > 0 ? HEAD : k < 0 ? TAIL : `<span style="transform:rotate(${Math.atan2(dot(d, f.v), dot(d, f.u))}rad)">${ARROW}</span>`;
        return `<i style="transform:${f.t};${bg}">${icon}</i>`;
      }).join('');
      b.el = e; this.cube.appendChild(e);
    }
    this.rot(); this.hud();
    setTools([['Підказка за рекламу', () => Ads.rewarded(() => this.hint())], ['Заново', () => this.load()]]);
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(this.blocks.filter((b: B) => !b.gone).length + ' бл.')}${hearts(this.hp)}`); },
  rot() { this.cube.style.transform = `rotateX(${this.rx}deg) rotateY(${this.ry}deg)`; },
  bindDrag() {
    let sx = 0, sy = 0, moved = false, down = false, target: HTMLElement | null = null;
    const pd = (e: PointerEvent) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; target = (e.target as HTMLElement).closest('.blk'); };
    const pm = (e: PointerEvent) => {
      if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 7) return; moved = true;
      this.ry += dx * .45; this.rx = Math.max(-85, Math.min(85, this.rx - dy * .45)); sx = e.clientX; sy = e.clientY; this.rot();
    };
    const pu = () => { if (down && !moved && target) { const b = this.blocks.find((k: B) => k.el === target); if (b) this.tap(b); } down = false; target = null; };
    this.el.addEventListener('pointerdown', pd); addEventListener('pointermove', pm); addEventListener('pointerup', pu);
    this.unbind = () => { this.el.removeEventListener('pointerdown', pd); removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); };
  },
  ahead(b: B) {
    const d = DIRS[b.d], [X, Y, Z] = this.dims; let q: V = [b.p[0] + d[0], b.p[1] + d[1], b.p[2] + d[2]], dist = 0;
    while (q[0] >= 0 && q[0] < X && q[1] >= 0 && q[1] < Y && q[2] >= 0 && q[2] < Z) {
      const hit = this.blocks.find((k: B) => !k.gone && k.p[0] === q[0] && k.p[1] === q[1] && k.p[2] === q[2]);
      if (hit) return { dist, hit }; dist++; q = [q[0] + d[0], q[1] + d[1], q[2] + d[2]];
    }
    return { dist, hit: null };
  },
  tap(b: B) {
    if (b.gone || this.hp <= 0 || b.el!.dataset.moving) return;
    const { dist, hit } = this.ahead(b), d = DIRS[b.d], s = this.s, base = b.el!.dataset.pos!.split(',').map(Number), e = b.el!;
    const at = (k: number) => `translate3d(${base[0] + d[0] * k}px,${base[1] + d[1] * k}px,${base[2] + d[2] * k}px)`;
    e.dataset.moving = '1';
    if (!hit) {
      b.gone = true; haptic(); this.hud();
      e.animate([{ transform: at(0) }, { transform: at(s * 9), opacity: 0 }], { duration: 520, easing: 'cubic-bezier(.4,0,.9,.5)', fill: 'forwards' }).onfinish = () => e.remove();
      if (this.blocks.every((k: B) => k.gone)) done('cb_lvl', this.lvl, () => this.load());
      return;
    }
    const go = dist * s + s * .15;
    e.animate([{ transform: at(0) }, { transform: at(go), offset: .4 }, { transform: at(0) }], { duration: 260 + dist * 90, easing: 'ease-in-out' }).onfinish = () => { delete e.dataset.moving; };
    setTimeout(() => {
      haptic('err'); flash(hit.el!, 'bump', 400); this.hp--; this.hud();
      if (this.hp <= 0) outOfHearts(() => { this.hp = 1; this.hud(); }, () => this.load());
    }, 110 + dist * 40);
  },
  hint() { const b = this.blocks.find((k: B) => !k.gone && !this.ahead(k).hit); if (b) flash(b.el!, 'hintb', 1600); },
};
export default Cube;
