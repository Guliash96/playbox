// Bus station (3D). Passengers stand in queues (columns of groups of 5) that run off the bottom of the screen.
// Tap a queue: its front group walks out. Same colour as the bus at the stop → boards, otherwise waits on one of
// 5 platform spots. The queue steps forward. A bus takes 2–4 groups (10–20 people), then drives off.
import './bus.css';
import { R, pick, shuffle } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { Score } from '../core/score';
import { t } from '../core/i18n';
import { Stage, THREE, RoundedBoxGeometry, mat, mesh, ease } from '../core/three';
import { CrowdMesh, numberSprite, setSpriteText } from '../art/people3d';
import { busSVG } from '../art/bus';
import type { Game } from './registry';

const COLS = ['#ff3d7f', '#2f9bff', '#ffb020', '#7b5cff', '#2fbf71', '#18b5c4'];
const HOLD = 5, CELL = 1.3, FRONT = -2.6, PLAT = -4.1, ROADZ = -5.9, SLOTW = 1.45;
const OFF: [number, number][] = [[-.28, -.26], [.28, -.26], [-.28, .26], [.28, .26], [0, 0]];
interface Pp { x: number; z: number; way: [number, number][]; hide?: boolean; ph: number }
interface Grp { c: number; people: number[] }

function generate(W: number, buses: number, k: number, nc: number) {
  const seq: number[] = []; let prev = -1;
  for (let b = 0; b < buses; b++) { let c; do c = R(nc); while (c === prev && nc > 1); prev = c; seq.push(c); }
  const order: number[] = []; seq.forEach(c => { for (let j = 0; j < k; j++) order.push(c); });
  // a few local swaps so the platform has to be used, still solvable with 5 spots
  for (let i = 0; i < order.length - 2; i++) if (Math.random() < .25) [order[i], order[i + 2]] = [order[i + 2], order[i]];
  const cols: number[][] = Array.from({ length: W }, () => []);
  // appending in global order keeps every column FIFO-consistent with that order
  order.forEach(c => cols[R(W)].push(c));
  return { seq, cols };
}

function busModel(col: string, k: number) {
  const g = new THREE.Group(), L = 2.4 + k * .95, body = mat(col, { roughness: .35, metalness: .1 }), glass = mat(0x22364f, { roughness: .1, metalness: .4 });
  const add = (m: THREE.Mesh, x: number, y: number, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  add(mesh(new RoundedBoxGeometry(L, 1.25, 1.35, 3, .22), body), 0, .95);
  add(mesh(new RoundedBoxGeometry(L - .1, .12, 1.37, 2, .05), mat(0xffffff)), 0, 1.6);
  add(mesh(new RoundedBoxGeometry(L - .7, .48, 1.38, 2, .08), glass), -.15, 1.18);
  add(mesh(new RoundedBoxGeometry(.08, .6, 1.2, 2, .03), glass), L / 2, 1.12);
  add(mesh(new RoundedBoxGeometry(.5, .95, .04, 2, .02), mat(0x9fd4f0, { roughness: .2 })), L / 2 - .55, .85, .69);
  add(mesh(new THREE.BoxGeometry(L, .14, 1.38), mat(new THREE.Color(col).multiplyScalar(.7))), 0, .4);
  for (const x of [L / 2 - .6, -L / 2 + .6]) for (const z of [.6, -.6]) { const w = add(mesh(new THREE.CylinderGeometry(.3, .3, .2, 16).rotateX(Math.PI / 2), mat(0x1e1e22, { roughness: .9 })), x, .3, z); w.castShadow = true; add(mesh(new THREE.CylinderGeometry(.13, .13, .21, 10).rotateX(Math.PI / 2), mat(0xd9dde3, { metalness: .6 })), x, .3, z); }
  for (const z of [.4, -.4]) add(mesh(new THREE.BoxGeometry(.04, .14, .22), mat(0xfff3b0, { emissive: 0xffe680, emissiveIntensity: .8 }), false), L / 2 + .01, .55, z);
  g.userData.L = L; return g;
}

const Bus: Game & Record<string, any> = {
  title: 'Автобуси', theme: 'th-bus',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '<div class="nextq"></div>';
    const st: Stage = this.st = new Stage(el, { fov: 40, shadows: true, clear: 0xbfe3ff });
    st.lights(new THREE.Vector3(-4, 16, 6), 12);
    const sc = st.scene;
    const grass = mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), mat(0x8cc063, { roughness: 1 }), false); grass.position.set(0, -.02, 10); sc.add(grass);
    const road = mesh(new THREE.PlaneGeometry(60, 2.4).rotateX(-Math.PI / 2), mat(0x4a4f57, { roughness: .95 }), false); road.position.set(0, 0, ROADZ); sc.add(road);
    for (let x = -30; x < 30; x += 2) { const d = mesh(new THREE.BoxGeometry(1, .01, .1), mat(0xffd23f), false); d.position.set(x, .01, ROADZ - .1); sc.add(d); }
    const plat = mesh(new RoundedBoxGeometry(60, .18, 1.6, 2, .05), mat(0xe9e2d3, { roughness: .9 }), false); plat.position.set(0, .09, PLAT); sc.add(plat);
    const curb = mesh(new THREE.BoxGeometry(60, .2, .14), mat(0xffd23f), false); curb.position.set(0, .1, PLAT - .82); sc.add(curb);
    const yard = mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), mat(0xcfc6b4, { roughness: .95 }), false); yard.position.set(0, .005, PLAT + .8 + 30); sc.add(yard);
    for (let k = 0; k < 8; k++) { const tr = new THREE.Group(), tk = mesh(new THREE.CylinderGeometry(.1, .14, .7, 6), mat(0x6b4429)); tk.position.y = .35; tr.add(tk); for (let j = 0; j < 3; j++) { const b = mesh(new THREE.IcosahedronGeometry(.5 - j * .1, 1), mat(0x4f8a46, { roughness: .9 })); b.position.set((Math.random() - .5) * .3, .9 + j * .35, 0); tr.add(b); } tr.position.set((k % 2 ? -1 : 1) * (6.5 + Math.random() * 3), 0, ROADZ - 2.2 - Math.random() * 2 + (k > 3 ? 0 : 0)); sc.add(tr); }
    this.slotM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 });
    this.st.onResize = () => this.frameCam(); st.onFrame = (dt: number) => this.frame(dt);
    el.onpointerdown = (e: PointerEvent) => this.pointer(e);
    this.load();
  },
  stop() { this.st?.dispose(); this.dead = true; },
  frameCam() {
    const c = this.st.camera, w = Math.max((this.W || 5) * CELL + 1.4, HOLD * SLOTW + 1), half = Math.tan(c.fov * Math.PI / 360);
    const d = Math.max(w / 2 / (half * c.aspect), 7) * .98; c.position.set(0, d * .72, d * .7 - .4); c.lookAt(0, 0, -2.4);
  },
  load() {
    const sc = this.st.scene; this.dead = false;
    for (const o of this.temp || []) sc.remove(o); this.temp = [];
    this.crowd?.dispose(sc); this.bus && sc.remove(this.bus);
    const L = this.lvl = store.get('bj_lvl', 1);
    this.W = Math.min(6, 4 + Math.floor(L / 3)); this.k = L < 4 ? 2 : L < 8 ? 3 : 4;
    const g = generate(this.W, 7 + L, this.k, Math.min(6, 3 + Math.floor(L / 3)));
    this.buses = g.seq; this.bi = 0; this.seats = 0; this.seated = 0; this.ready = false; this.over = false; this.cont = false; this.cap = HOLD;
    this.hold = [] as ({ g: Grp; here: boolean } | null)[];
    const total = g.cols.reduce((s, c) => s + c.length, 0) * 5;
    this.crowd = new CrowdMesh(total, sc, 'human'); this.pp = [] as Pp[];
    this.cols = g.cols.map((col, ci) => col.map((c, k) => {
      const people = OFF.map(([ox, oz]) => { const i = this.pp.length; const [x, z] = this.cellPos(ci, k); this.pp.push({ x: x + ox, z: z + oz, way: [], ph: Math.random() * 6 }); this.crowd.color(i, COLS[c]); return i; });
      return { c, people } as Grp;
    }));
    this.crowd.count = total;
    // platform spots + column marks
    for (let i = 0; i < HOLD + 2; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.1).rotateX(-Math.PI / 2), this.slotM); s.position.set(this.slotX(i), .19, PLAT + .1); s.visible = i < this.cap; sc.add(s); this.temp.push(s); }
    for (let c = 0; c < this.W; c++) { const l = mesh(new THREE.PlaneGeometry(1.1, 40).rotateX(-Math.PI / 2), mat(0xbfb6a2, { roughness: 1 }), false); l.position.set(this.colX(c), .01, FRONT + 20 - .6); sc.add(l); this.temp.push(l); }
    this.frameCam(); this.arrive(); this.hud();
    setTools([['Заново', () => { Score.commit(); this.load(); }]]);
  },
  colX(c: number) { return (c - (this.W - 1) / 2) * CELL; },
  cellPos(c: number, k: number): [number, number] { return [this.colX(c), FRONT + k * CELL]; },
  slotX(i: number) { return (i - (HOLD - 1) / 2) * SLOTW; },
  hud() {
    setStats(`${pill('Рів. ' + this.lvl)}${pill(t('Бус {0}/{1}', Math.min(this.bi + 1, this.buses.length), this.buses.length))}`);
    const q = this.el.querySelector('.nextq'); if (q) q.innerHTML = `<span>${t('Далі:')}</span>` + this.buses.slice(this.bi + 1, this.bi + 5).map((b: number) => `<i>${busSVG(COLS[b], this.k, [])}</i>`).join('');
  },
  // ---------- buses ----------
  arrive() {
    const sc = this.st.scene, c = this.buses[this.bi]; if (c == null) return;
    const b = this.bus = busModel(COLS[c], this.k); b.position.set(-16, 0, ROADZ); sc.add(b);
    this.tag = numberSprite(`0/${this.k * 5}`, '#1b1b1f', 1.3); this.tag.position.set(0, 2.4, 0); b.add(this.tag);
    this.seats = 0; this.seated = 0; this.ready = false;
    this.st.tween(1100, k => { b.position.x = -16 + 16 * ease.out(k); }).then(() => { if (this.dead) return; this.ready = true; this.autoBoard(); });
  },
  door() { const b = this.bus; return b ? [b.position.x + b.userData.L / 2 - .55, ROADZ + .85] as [number, number] : [0, ROADZ + .8] as [number, number]; },
  async depart() {
    this.ready = false; haptic('ok'); const b = this.bus;
    await this.st.tween(1200, k => { b.position.x = 18 * ease.in(k); });
    if (this.dead) return; this.st.scene.remove(b); this.bus = null;
    this.bi++; this.hud();
    if (this.bi >= this.buses.length) { this.over = true; return done('bj_lvl', this.lvl, () => this.load()); }
    this.arrive();
  },
  autoBoard() {
    const c = this.buses[this.bi];
    this.hold.forEach((h: any, i: number) => {
      if (!h || !h.here || h.g.c !== c || this.seats >= this.k) return;
      this.hold[i] = null; this.seats++; this.walkGroup(h.g, [[this.door()[0], PLAT + .2], this.door()], () => this.boarded());
    });
    this.checkFail();
  },
  boarded() { this.seated++; setSpriteText(this.tag, `${this.seated * 5}/${this.k * 5}`); if (this.seated >= this.k && this.seats >= this.k) this.depart(); },
  // ---------- people ----------
  walkGroup(g: Grp, way: [number, number][], onDone: () => void, hideAtEnd = true) {
    let left = g.people.length;
    g.people.forEach((i, j) => { const [ox, oz] = OFF[j]; const p: Pp = this.pp[i]; p.way = way.map(([x, z], n) => [x + ox * (n === way.length - 1 && !hideAtEnd ? 1 : .6), z + oz * .6]); p.hide = false; (p as any).done = () => { if (hideAtEnd) p.hide = true; if (--left === 0) onDone(); }; });
  },
  pointer(e: PointerEvent) {
    if (this.over || this.dead) return;
    const r = this.st.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    this.st.ray.setFromCamera(v, this.st.camera); const hit = new THREE.Vector3();
    if (!this.st.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return;
    if (hit.z < FRONT - .8) return;
    const ci = Math.round(hit.x / CELL + (this.W - 1) / 2); if (ci < 0 || ci >= this.W) return;
    this.tap(ci);
  },
  tap(ci: number) {
    const col: Grp[] = this.cols[ci]; if (!col.length) return;
    const g = col[0], toBus = this.ready && g.c === this.buses[this.bi] && this.seats < this.k;
    const free = this.hold.findIndex((h: any, i: number) => !h && i < this.cap), slot = free >= 0 ? free : (this.hold.length < this.cap ? this.hold.length : -1);
    if (!toBus && slot < 0) { haptic('err'); flash(this.st.renderer.domElement, 'shake'); return; }
    col.shift(); haptic();
    const [x] = this.cellPos(ci, 0);
    if (toBus) { this.seats++; Score.good(10); this.walkGroup(g, [[x, PLAT + .3], [this.door()[0], PLAT + .2], this.door()], () => this.boarded()); }
    else {
      Score.bad(); const h = { g, here: false }; this.hold[slot] = h;
      this.walkGroup(g, [[x, PLAT + .3], [this.slotX(slot), PLAT + .1]], () => { h.here = true; this.checkFail(); }, false);
    }
    // the queue steps forward
    col.forEach((gg, k) => gg.people.forEach((i, j) => { const [cx, cz] = this.cellPos(ci, k); this.pp[i].way = [[cx + OFF[j][0], cz + OFF[j][1]]]; }));
    this.hud();
  },
  checkFail() {
    if (this.over || !this.ready) return;
    const used = this.hold.filter(Boolean), c = this.buses[this.bi];
    if (used.length < this.cap || used.some((h: any) => !h.here || h.g.c === c)) return;
    if (this.cols.some((col: Grp[]) => col.length && col[0].c === c)) return;
    this.over = true; haptic('err');
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +1 місце на платформі', () => Ads.rewarded(() => { this.cont = true; this.over = false; this.cap++; this.temp[this.cap - 1].visible = true; })]);
    b.push(['Почати заново', () => { Score.commit(); this.load(); }]);
    setTimeout(() => modal(`<h2>${t('Платформа переповнена')}</h2><p class="muted">${t('Усі місця очікування зайняті.')}</p>`, b), 300);
  },
  frame(dt: number) {
    if (!this.crowd) return;
    const spd = 4.2, T = performance.now() / 1000;
    this.pp.forEach((p: Pp, i: number) => {
      let moving = false;
      if (p.way.length) {
        const [tx, tz] = p.way[0], dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), s = spd * dt;
        if (d <= s) { p.x = tx; p.z = tz; p.way.shift(); if (!p.way.length) (p as any).done?.(), (p as any).done = null; }
        else { p.x += dx / d * s; p.z += dz / d * s; moving = true; }
      }
      if (p.hide) { this.crowd.pose(i, 0, -50, 0, 0, .01); return; }
      const ry = moving ? Math.atan2(p.way[0] ? p.way[0][0] - p.x : 0, p.way[0] ? p.way[0][1] - p.z : 1) : Math.PI;
      this.crowd.pose(i, p.x, moving ? Math.abs(Math.sin(T * 14 + p.ph)) * .08 : 0, p.z, ry, .58, moving ? .15 : 0);
    });
    this.crowd.commit();
  },
};
export default Bus;
