// Cube arrows (3D): a stack of rounded blocks, each with an exit direction. Drag to spin, tap to fire a block.
// Blocked → it bumps the block in its way and costs a heart. Built inside-out so every cube is solvable.
import './cube.css';
import { shuffle, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, hearts, pill } from '../core/ui';
import { Ads } from '../core/ads';
import { done, outOfHearts } from '../core/flow';
import { Stage, THREE, RoundedBoxGeometry, mat, ease } from '../core/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Game } from './registry';

type V = [number, number, number];
const DIRS: V[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const COLS = [0xff6b9a, 0x4aa8ff, 0xffb84a, 0x9a7bff, 0x33c9b5, 0xff7a59];
interface B { p: V; d: number; col: number; g?: THREE.Group; m?: THREE.MeshStandardMaterial; gone?: boolean; busy?: boolean }

function generate(X: number, Y: number, Z: number): B[] {
  const c: V = [(X - 1) / 2, (Y - 1) / 2, (Z - 1) / 2], cells: V[] = [];
  for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) for (let z = 0; z < Z; z++) cells.push([x, y, z]);
  const ring = (p: V) => Math.max(Math.abs(p[0] - c[0]) / X, Math.abs(p[1] - c[1]) / Y, Math.abs(p[2] - c[2]) / Z);
  // inside-out: each new block's exit ray only crosses cells not placed yet → removing in reverse order works
  const order = shuffle(cells).sort((a, b) => ring(a) - ring(b) + (Math.random() - .5) * .08);
  const occ = new Set<string>(), K = (p: V) => p.join(','), out: B[] = [];
  const clear = (p: V, d: V) => { let q: V = [p[0] + d[0], p[1] + d[1], p[2] + d[2]]; while (q[0] >= 0 && q[0] < X && q[1] >= 0 && q[1] < Y && q[2] >= 0 && q[2] < Z) { if (occ.has(K(q))) return false; q = [q[0] + d[0], q[1] + d[1], q[2] + d[2]]; } return true; };
  for (const p of order) {
    const ok = DIRS.map((_, i) => i).filter(i => clear(p, DIRS[i]));
    if (!ok.length) continue;
    out.push({ p, d: pick(ok), col: pick(COLS) }); occ.add(K(p));
  }
  return out;
}

// ---------- decals (white arrows / rings) as real geometry lying on the faces ----------
const arrowShape = (() => { const s = new THREE.Shape(); s.moveTo(-.3, -.07); s.lineTo(.06, -.07); s.lineTo(.06, -.18); s.lineTo(.3, 0); s.lineTo(.06, .18); s.lineTo(.06, .07); s.lineTo(-.3, .07); s.closePath(); return new THREE.ShapeGeometry(s); })();
const ringGeo = new THREE.RingGeometry(.2, .29, 28), dotGeo = new THREE.CircleGeometry(.11, 20), tailGeo = new THREE.CircleGeometry(.07, 16);
function placed(geo: THREE.BufferGeometry, n: THREE.Vector3, x: THREE.Vector3) {
  const z = n.clone(), y = new THREE.Vector3().crossVectors(z, x), m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(n.clone().multiplyScalar(.476));
  return geo.clone().applyMatrix4(m);
}
const decalCache = new Map<number, THREE.BufferGeometry>();
function decals(d: number) {
  if (decalCache.has(d)) return decalCache.get(d)!;
  const dv = new THREE.Vector3(...DIRS[d]), parts: THREE.BufferGeometry[] = [];
  for (const nv of DIRS) {
    const n = new THREE.Vector3(...nv), k = n.dot(dv);
    if (k > 0) { const x = Math.abs(n.y) > .5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0); parts.push(placed(ringGeo, n, x), placed(dotGeo, n, x)); }
    else if (k < 0) { parts.push(placed(tailGeo, n, Math.abs(n.y) > .5 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0))); }
    else parts.push(placed(arrowShape, n, dv));
  }
  const g = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p)); decalCache.set(d, g); return g;
}
const boxGeo = new RoundedBoxGeometry(.94, .94, .94, 3, .13);
const decalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .25, roughness: .4, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });

const Cube: Game & Record<string, any> = {
  title: 'Куб-стрілки', theme: 'th-cube',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '';
    const st: Stage = this.st = new Stage(el, { fov: 32, shadows: true });
    st.lights(new THREE.Vector3(3, 10, 6), 6);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: .28 })); floor.receiveShadow = true; floor.position.y = -3.2; st.scene.add(floor);
    st.onResize = () => this.frame();
    st.onFrame = (dt: number) => { if (!this.drag && this.root) { this.spin *= .94; this.root.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), this.spin * dt); } };
    this.bind(); this.load();
  },
  stop() { this.st?.dispose(); },
  load() {
    const st: Stage = this.st;
    if (this.root) st.scene.remove(this.root);
    const L = this.lvl = store.get('cb_lvl', 1);
    const dims = this.dims = (L < 3 ? [3, 3, 3] : L < 5 ? [4, 3, 3] : L < 8 ? [4, 4, 3] : [4, 4, 4]) as V;
    this.hp = 3; this.blocks = generate(...dims); this.spin = 0;
    const root = this.root = new THREE.Group(); root.rotation.set(.45, -.65, 0); st.scene.add(root);
    { const f = st.scene.children.find(o => (o as any).material?.type === 'ShadowMaterial'); if (f) f.position.y = -Math.max(...dims) * .62 - .6; }
    this.blocks.forEach((b: B, i: number) => {
      const g = new THREE.Group(), m = mat(b.col, { roughness: .38, metalness: .05, transparent: true });
      const box = new THREE.Mesh(boxGeo, m); box.castShadow = true; box.receiveShadow = true;
      const dec = new THREE.Mesh(decals(b.d), decalMat);
      g.add(box, dec); g.position.set(b.p[0] - (dims[0] - 1) / 2, b.p[1] - (dims[1] - 1) / 2, b.p[2] - (dims[2] - 1) / 2);
      g.userData.b = i; g.userData.home = g.position.clone(); b.g = g; b.m = m; root.add(g);
      g.scale.setScalar(.01); st.tween(380, k => g.scale.setScalar(.01 + .99 * ease.back(k)), i * 12);
    });
    this.frame(); this.hud();
    setTools([['Підказка за рекламу', () => Ads.rewarded(() => this.hint())], ['Заново', () => this.load()]]);
  },
  frame() {
    const cam = this.st.camera, size = Math.max(...(this.dims || [3, 3, 3])) * 1.5 + .5, half = Math.tan(cam.fov * Math.PI / 360);
    const d = Math.max(size / 2 / (half * cam.aspect), size / 2 / half);
    cam.position.set(0, d * .18, d); cam.lookAt(0, -.2, 0);
  },
  bind() {
    const el = this.el; let sx = 0, sy = 0, moved = false, down = false, lastT = 0;
    el.onpointerdown = (e: PointerEvent) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; this.spin = 0; lastT = performance.now(); };
    el.onpointermove = (e: PointerEvent) => {
      if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 7) return; moved = true; this.drag = true;
      const now = performance.now(), dtt = Math.max(1, now - lastT); lastT = now;
      this.root.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * .011);
      this.root.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), dy * .011);
      this.spin = dx * .011 / (dtt / 1000) * .25; sx = e.clientX; sy = e.clientY;
    };
    el.onpointerup = (e: PointerEvent) => {
      if (down && !moved) { const h = this.st.pick(e, this.blocks.filter((b: B) => !b.gone).map((b: B) => b.g!)); if (h) { let o: any = h.object; while (o && o.userData.b == null) o = o.parent; if (o) this.tap(this.blocks[o.userData.b]); } }
      down = false; this.drag = false;
    };
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(this.blocks.filter((b: B) => !b.gone).length + ' бл.')}${hearts(this.hp)}`); },
  ahead(b: B) {
    const d = DIRS[b.d], [X, Y, Z] = this.dims; let q: V = [b.p[0] + d[0], b.p[1] + d[1], b.p[2] + d[2]], dist = 0;
    while (q[0] >= 0 && q[0] < X && q[1] >= 0 && q[1] < Y && q[2] >= 0 && q[2] < Z) {
      const hit = this.blocks.find((k: B) => !k.gone && k.p[0] === q[0] && k.p[1] === q[1] && k.p[2] === q[2]);
      if (hit) return { dist, hit }; dist++; q = [q[0] + d[0], q[1] + d[1], q[2] + d[2]];
    }
    return { dist, hit: null };
  },
  async tap(b: B) {
    if (b.gone || b.busy || this.hp <= 0) return;
    const st: Stage = this.st, { dist, hit } = this.ahead(b), dv = new THREE.Vector3(...DIRS[b.d]), g = b.g!, home = g.userData.home as THREE.Vector3;
    b.busy = true;
    if (!hit) {
      b.gone = true; haptic(); this.hud();
      st.tween(560, k => { g.position.copy(home).addScaledVector(dv, 9 * ease.in(k)); b.m!.opacity = 1 - ease.in(k); g.children[1].visible = k < .6; }).then(() => this.root.remove(g));
      if (this.blocks.every((k: B) => k.gone)) done('cb_lvl', this.lvl, () => this.load());
      return;
    }
    const go = dist + .08;
    await st.tween(120 + dist * 80, k => g.position.copy(home).addScaledVector(dv, go * ease.in(k)));
    haptic('err'); this.hp--; this.hud();
    const hg = hit.g!, hh = hg.userData.home as THREE.Vector3, hm = hit.m!;
    st.tween(380, k => { const s = Math.sin(k * Math.PI * 4) * (1 - k); hg.position.copy(hh).addScaledVector(dv, s * .1); hm.emissive.setRGB(.5 * (1 - k), .2 * (1 - k), .2 * (1 - k)); });
    await st.tween(200 + dist * 60, k => g.position.copy(home).addScaledVector(dv, go * (1 - ease.out(k))));
    b.busy = false;
    if (this.hp <= 0) outOfHearts(() => { this.hp = 1; this.hud(); }, () => this.load());
  },
  hint() {
    const b = this.blocks.find((k: B) => !k.gone && !this.ahead(k).hit); if (!b) return;
    this.st.tween(1500, k => b.m!.emissive.setScalar(Math.abs(Math.sin(k * Math.PI * 4)) * .45));
  },
};
export default Cube;
