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
    const curb = mat(0xffc533, { roughness: .6 });
    for (const [x, z, sx, sz] of [[0, -(n / 2 + .35), n + 1, .2], [0, n / 2 + .35, n + 1, .2], [-(n / 2 + .35), 0, .2, n + .5], [n / 2 + .35, 0, .2, n + .5]]) {
      const c = mesh(new THREE.BoxGeometry(sx, .16, sz), curb); c.position.set(x, .03, z); w.add(c);
    }
    for (let k = 0; k < 10; k++) { // bushes around the lot
      const a = (k / 10) * Math.PI * 2, r = n / 2 + 1.4 + Math.random() * .6;
      const b = mesh(new THREE.IcosahedronGeometry(.32 + Math.random() * .18, 2), mat(0x4f9a4a, { roughness: .9 })); b.position.set(Math.cos(a) * r, .2, Math.sin(a) * r); w.add(b);
    }
    for (const c of this.cars) {
      const o = car3d(c.len, c.col), cells = cellsOf(c);
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
    const need = (n + 1.6) / 2, d = Math.max(need / (half * cam.aspect), need / half * .95) * 1.05, el = 56 * Math.PI / 180;
    cam.position.set(0, Math.sin(el) * d, Math.cos(el) * d + .3); cam.lookAt(0, 0, .35);
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
      c.gone = true; haptic(); Score.good(10);
      const far = dist + c.len + this.n;
      st.tween(300 + far * 55, k => { o.position.copy(home).addScaledVector(dir, far * ease.in(k)); o.rotation.z = 0; }).then(() => this.world.remove(o));
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
  hint() {
    const c = this.cars.find((k: Car) => !k.gone && !this.ahead(k).blocker); if (!c) return;
    const o = c.obj!, y = o.position.y; this.st.tween(1200, k => { o.position.y = y + Math.abs(Math.sin(k * Math.PI * 3)) * .35; });
  },
};
export default Parking;
