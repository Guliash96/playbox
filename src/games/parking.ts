// Parking (3D): cars of 1–3 cells drive forward when tapped. Clear road → they leave the lot.
// Blocked → they drive up to the blocker, bump it (it rocks), roll back, and cost a heart.
import './parking.css';
import { pick, shuffle } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, hearts, pill } from '../core/ui';
import { Ads } from '../core/ads';
import { done, outOfHearts } from '../core/flow';
import { Stage, THREE, mat, mesh, ease } from '../core/three';
import { car3d } from '../art/car3d';
import { Score } from '../core/score';
import { sfx } from '../core/sfx';
import type { Game } from './registry';

const D = [[-1, 0], [0, 1], [1, 0], [0, -1]];          // up right down left (row, col)
const COLS = ['#ff3d7f', '#2f9bff', '#ffb020', '#7b5cff', '#2fbf71', '#e8443a', '#18b5c4', '#f4f4f4'];
interface Car { id: number; fr: number; fc: number; len: number; d: number; col: string; obj?: THREE.Group; gone?: boolean; busy?: boolean }

function cellsOf(c: Car) { const [dr, dc] = D[c.d]; return Array.from({ length: c.len }, (_, k) => [c.fr - dr * k, c.fc - dc * k]); }
function generate(n: number, lvl: number): Car[] {
  const occ: number[][] = Array.from({ length: n }, () => Array(n).fill(-1)), cars: Car[] = [];
  const free = (r: number, c: number) => r >= 0 && r < n && c >= 0 && c < n && occ[r][c] < 0;
  const pathLen = (r: number, c: number, d: number) => { const [dr, dc] = D[d]; let k = 0; r += dr; c += dc; while (r >= 0 && r < n && c >= 0 && c < n) { if (occ[r][c] >= 0) return -1; k++; r += dr; c += dc; } return k; };
  const lens = lvl < 3 ? [2, 2, 2, 1] : lvl < 6 ? [2, 2, 3, 1] : [2, 3, 3, 2, 1];
  // reverse construction: a new car's exit path is clear of cars placed before it → reverse order solves it
  for (let pass = 0; pass < 3; pass++) {
    for (const [r, c] of shuffle(Array.from({ length: n * n }, (_, i) => [Math.floor(i / n), i % n]))) {
      if (!free(r, c)) continue;
      const len = pick(lens), opts: [number, number][] = [];
      for (let d = 0; d < 4; d++) {
        const car: Car = { id: 0, fr: r, fc: c, len, d, col: '' };
        if (!cellsOf(car).every(([y, x]) => free(y, x))) continue;
        const p = pathLen(r, c, d); if (p >= 0) opts.push([d, p]);
      }
      if (!opts.length) continue;
      opts.sort((a, b) => b[1] - a[1]);
      const car: Car = { id: cars.length, fr: r, fc: c, len, d: Math.random() < .7 ? opts[0][0] : pick(opts)[0], col: pick(COLS) };
      cellsOf(car).forEach(([y, x]) => occ[y][x] = car.id); cars.push(car);
    }
  }
  return cars;
}

const Parking: Game & Record<string, any> = {
  title: 'Парковка', theme: 'th-parking',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '';
    const st: Stage = this.st = new Stage(el, { fov: 34, shadows: true });
    st.lights(new THREE.Vector3(4, 14, 6), 8);
    st.onResize = () => this.frame();
    el.onpointerup = (e: PointerEvent) => { const h = st.pick(e, this.cars.filter((c: Car) => !c.gone).map((c: Car) => c.obj!)); if (h) { let o: any = h.object; while (o && o.userData.car == null) o = o.parent; if (o) this.tap(this.cars[o.userData.car]); } };
    this.load();
  },
  stop() { this.st?.dispose(); },
  load() {
    const st: Stage = this.st;
    if (this.world) st.scene.remove(this.world);
    this.lvl = store.get('pk_lvl', 1); const n = this.n = Math.min(9, 5 + Math.floor(this.lvl / 2)); this.hp = 3;
    this.cars = generate(n, this.lvl);
    const w = this.world = new THREE.Group(); st.scene.add(w);
    // ground, lot, painted bays, curbs
    const ground = mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), mat(0x9aa19a, { roughness: 1 }), false); ground.position.y = -.06; w.add(ground);
    const lot = mesh(new THREE.BoxGeometry(n + .5, .1, n + .5), mat(0x474c55, { roughness: .95 }), false); lot.position.y = -.05; w.add(lot);
    const paint = mat(0xffffff, { roughness: .8, transparent: true, opacity: .55 });
    for (let k = 0; k <= n; k++) {
      const a = mesh(new THREE.BoxGeometry(n, .004, .035), paint, false); a.position.set(0, .002, k - n / 2); w.add(a);
      const b = mesh(new THREE.BoxGeometry(.035, .004, n), paint, false); b.position.set(k - n / 2, .002, 0); w.add(b);
    }
    const R = this.ring = n / 2 + .95, road = mat(0x3a3f47, { roughness: .95 });
    for (const [x, z, sx, sz] of [[0, -R, 2 * R + 1, 1], [0, R, 2 * R + 1, 1], [-R, 0, 1, 2 * R + 1], [R, 0, 1, 2 * R + 1], [R + 8, -R, 16, 1]]) { const r = mesh(new THREE.BoxGeometry(sx, .02, sz), road, false); r.position.set(x, -.04, z); w.add(r); }
    const dash = mat(0xffffff, { roughness: .8 });
    for (let k = -R; k < R; k += .6) for (const [x, z, rot] of [[k, -R, 0], [k, R, 0], [-R, k, 1], [R, k, 1]] as [number, number, number][]) { const d = mesh(new THREE.BoxGeometry(.3, .01, .05), dash, false); d.position.set(x, -.02, z); d.rotation.y = rot * Math.PI / 2; w.add(d); }
    const edge = mat(0xffd23f); for (const [x, z, sx, sz] of [[0, -n / 2 - .2, n + .4, .06], [0, n / 2 + .2, n + .4, .06], [-n / 2 - .2, 0, .06, n + .4], [n / 2 + .2, 0, .06, n + .4]]) { const e = mesh(new THREE.BoxGeometry(sx, .03, sz), edge, false); e.position.set(x, .005, z); w.add(e); }
    for (let k = 0, placed = 0; k < 80 && placed < 16; k++) {
      const x = (Math.random() - .5) * (2 * R + 7), z = (Math.random() - .5) * (2 * R + 7), tr = new THREE.Group();
      if (Math.max(Math.abs(x), Math.abs(z)) < R + 1.2) continue;                 // keep off the lot and the ring road
      if (z > -R - 1.3 && z < -R + 1.3 && x > R - 1) continue;                     // keep the exit road clear
      placed++;
      const tk = mesh(new THREE.CylinderGeometry(.08, .12, .5, 6), mat(0x6b4429)); tk.position.y = .25; tr.add(tk);
      for (let j = 0; j < 4; j++) { const b = mesh(new THREE.IcosahedronGeometry(.32 - j * .03, 1), mat([0x4f9a4a, 0x5fae55, 0x3f8a3f][j % 3], { roughness: .85 })); b.position.set(Math.cos(j * 2.1) * .18 * (j < 3 ? 1 : 0), .6 + (j === 3 ? .28 : 0), Math.sin(j * 2.1) * .18 * (j < 3 ? 1 : 0)); tr.add(b); }
      tr.position.set(x, 0, z); tr.scale.setScalar(.9 + Math.random() * .5); w.add(tr);
    }
    for (const c of this.cars) {
      const o = car3d(c.len, c.col, true), cells = cellsOf(c);
      const cr = cells.reduce((s, x) => s + x[0], 0) / c.len, cc = cells.reduce((s, x) => s + x[1], 0) / c.len;
      o.position.set(cc - (n - 1) / 2, 0, cr - (n - 1) / 2);
      o.rotation.y = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][c.d];
      o.userData.car = c.id; o.userData.home = o.position.clone(); c.obj = o; w.add(o);
      o.scale.setScalar(.01); st.tween(350, k => o.scale.setScalar(.01 + .99 * ease.back(k)), c.id * 18);
    }
    this.frame(); this.hud();
    setTools([['Підказка за рекламу', () => Ads.rewarded(() => this.hint())], ['Заново', () => this.load()]]);
  },
  frame() {
    const st: Stage = this.st, cam = st.camera, n = this.n || 6, half = Math.tan(cam.fov * Math.PI / 360);
    const need = (n + 3.6) / 2, d = Math.max(need / (half * cam.aspect), need / half * .95), el = 70 * Math.PI / 180;
    cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d + .2); cam.lookAt(0, 0, .2);
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${hearts(this.hp)}`); },
  occAt(r: number, c: number): Car | undefined { return this.cars.find((k: Car) => !k.gone && cellsOf(k).some(([y, x]) => y === r && x === c)); },
  ahead(c: Car) { const [dr, dc] = D[c.d]; let r = c.fr + dr, k = c.fc + dc, dist = 0; while (r >= 0 && r < this.n && k >= 0 && k < this.n) { const b = this.occAt(r, k); if (b) return { dist, blocker: b }; dist++; r += dr; k += dc; } return { dist, blocker: null }; },
  async tap(c: Car) {
    if (c.gone || c.busy || this.hp <= 0) return;
    const st: Stage = this.st, { dist, blocker } = this.ahead(c), [dr, dc] = D[c.d], o = c.obj!, home = o.userData.home as THREE.Vector3;
    const dir = new THREE.Vector3(dc, 0, dr);
    c.busy = true;
    if (!blocker) {
      c.gone = true; sfx('whoosh'); Score.good(10);
      this.drive(o, this.exitPath(o.position.clone(), c.d));
      if (this.cars.every((k: Car) => k.gone)) done('pk_lvl', this.lvl, () => this.load());
      return;
    }
    const go = dist + .1, t = 140 + dist * 70;
    await st.tween(t, k => o.position.copy(home).addScaledVector(dir, go * ease.in(k)));
    haptic('err'); this.hp--; this.hud(); Score.bad();
    const b = blocker.obj!, bh = b.userData.home as THREE.Vector3, side = new THREE.Vector3(dr, 0, dc);
    st.tween(420, k => { const s = Math.sin(k * Math.PI * 5) * (1 - k); b.position.copy(bh).addScaledVector(side, s * .08).addScaledVector(dir, s * .05); b.rotation.x = s * .06; });
    await st.tween(t + 120, k => o.position.copy(home).addScaledVector(dir, go * (1 - ease.out(k))));
    c.busy = false;
    if (this.hp <= 0) outOfHearts(() => { this.hp = 1; this.hud(); }, () => this.load());
  },
  /** lot edge → ring road → clockwise to the top-right exit → off screen */
  exitPath(p: THREE.Vector3, d: number) {
    const R = this.ring, pts: THREE.Vector3[] = [p.clone()], v = (x: number, z: number) => new THREE.Vector3(x, 0, z);
    const side = ['top', 'right', 'bottom', 'left'][d];
    const onRing = side === 'top' ? v(p.x, -R) : side === 'bottom' ? v(p.x, R) : side === 'left' ? v(-R, p.z) : v(R, p.z);
    pts.push(onRing);
    const route: Record<string, THREE.Vector3[]> = { top: [], right: [v(R, R), v(-R, R), v(-R, -R)], bottom: [v(-R, R), v(-R, -R)], left: [v(-R, -R)] };
    pts.push(...route[side], v(R + 16, -R));
    return pts;
  },
  drive(o: THREE.Object3D, pts: THREE.Vector3[]) {
    const segs = pts.slice(1).map((q, i) => ({ a: pts[i], b: q, l: pts[i].distanceTo(q) })), total = segs.reduce((s, x) => s + x.l, 0);
    this.st.tween(500 + total * 90, k => {
      let s = Math.min(total, k * total * (k < .2 ? k / .2 : 1));
      for (const g of segs) { if (s <= g.l || g === segs[segs.length - 1]) { const f = g.l ? Math.min(1, s / g.l) : 1; o.position.lerpVectors(g.a, g.b, f); const dx = g.b.x - g.a.x, dz = g.b.z - g.a.z; if (dx || dz) { const want = Math.atan2(-dz, dx); let dr = want - o.rotation.y; while (dr > Math.PI) dr -= 2 * Math.PI; while (dr < -Math.PI) dr += 2 * Math.PI; o.rotation.y += dr * .35; } break; } s -= g.l; }
    }).then(() => this.world.remove(o));
  },
  hint() {
    const c = this.cars.find((k: Car) => !k.gone && !this.ahead(k).blocker); if (!c) return;
    const o = c.obj!, y = o.position.y; this.st.tween(1200, k => { o.position.y = y + Math.abs(Math.sin(k * Math.PI * 3)) * .35; });
  },
};
export default Parking;
