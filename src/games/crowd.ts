// Crowd gates (3D): your crowd runs forward; drag to steer through one of two gates (+N, −N, ×2, ÷2).
// Every few gates a zombie horde blocks the road — it is sized so you win only if you picked
// the better gate in more than half of the gates before it. Reach the finish to clear the level.
import './crowd.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { Stage, THREE, mat, mesh } from '../core/three';
import { crowdGeometry, labelTexture } from '../art/people3d';
import { Score } from '../core/score';
import type { Game } from './registry';

const MAXV = 160, SPEED = 7, HALF = 2.6;
type Op = { k: '+' | '-' | 'x' | '/'; v: number };
interface Pair { z: number; ops: [Op, Op]; o: THREE.Group; done?: boolean }
interface Horde { z: number; n: number; mesh: THREE.InstancedMesh; done?: boolean }
const apply = (n: number, o: Op) => Math.max(0, Math.round(o.k === '+' ? n + o.v : o.k === '-' ? n - o.v : o.k === 'x' ? n * o.v : n / o.v));
const label = (o: Op) => (o.k === '+' ? '+' : o.k === '-' ? '−' : o.k === 'x' ? '×' : '÷') + o.v;
const good = (o: Op) => o.k === '+' || o.k === 'x';

function spiral(i: number) { const a = i * 2.39996, r = .2 * Math.sqrt(i); return [Math.cos(a) * r, Math.sin(a) * r * .8]; }

const Crowd: Game & Record<string, any> = {
  title: 'Натовп', theme: 'th-crowd',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '<div class="cnum"></div>';
    const st: Stage = this.st = new Stage(el, { fov: 50, shadows: true, clear: 0x9fd6ff });
    st.scene.fog = new THREE.Fog(0x9fd6ff, 25, 60);
    st.lights(new THREE.Vector3(-3, 12, 6), 8);
    const track = mesh(new THREE.BoxGeometry(HALF * 2 + .4, .4, 400), mat(0xf2e6d0, { roughness: .9 }), false); track.position.set(0, -.2, -190); st.scene.add(track);
    for (const x of [-HALF - .25, HALF + .25]) { const r = mesh(new THREE.BoxGeometry(.18, .3, 400), mat(0xff7ab2)); r.position.set(x, .1, -190); st.scene.add(r); }
    const water = mesh(new THREE.PlaneGeometry(200, 400).rotateX(-Math.PI / 2), mat(0x3d9be0, { roughness: .3, metalness: .1 }), false); water.position.set(0, -1.2, -190); st.scene.add(water);
    this.geo = crowdGeometry(); this.mine = new THREE.InstancedMesh(this.geo, mat(0xffffff, { roughness: .5 }), MAXV); this.mine.castShadow = true; st.scene.add(this.mine);
    for (let i = 0; i < MAXV; i++) this.mine.setColorAt(i, new THREE.Color(0x2f7bff));
    st.camera.position.set(0, 7, 7.5); st.camera.lookAt(0, 0, -6);
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.load();
  },
  stop() { this.st?.dispose(); },
  load() {
    const sc = this.st.scene;
    for (const p of this.pairs || []) sc.remove(p.o); for (const h of this.hordes || []) sc.remove(h.mesh); if (this.finish) sc.remove(this.finish);
    const L = this.lvl = store.get('cr_lvl', 1);
    this.n = 10; this.x = 0; this.tx = 0; this.z = 0; this.state = 'ready'; this.cont = false; this.fight = null;
    this.pairs = [] as Pair[]; this.hordes = [] as Horde[];
    // build the course; horde size is the midpoint of "all good" and "all bad" picks since the last horde
    let z = -14, best = this.n, worst = this.n, waves = 2 + Math.floor(L / 2);
    for (let w = 0; w < waves; w++) {
      const gates = 4 + R(4);
      for (let gi = 0; gi < gates; gi++) {
        const g: Op = Math.random() < .25 && best < 60 ? { k: 'x', v: 2 } : { k: '+', v: 5 + R(6) * 5 };
        const b: Op = Math.random() < .3 && worst > 12 ? { k: '/', v: 2 } : { k: '-', v: 3 + R(5) * 3 };
        if (Math.random() < .15) { b.k = '+'; b.v = Math.max(2, Math.round((g.k === '+' ? g.v : 10) / 3)); }  // sometimes both are good, one better
        const ops: [Op, Op] = Math.random() < .5 ? [g, b] : [b, g];
        best = Math.min(MAXV, Math.max(apply(best, ops[0]), apply(best, ops[1]))); worst = Math.min(apply(worst, ops[0]), apply(worst, ops[1]));
        this.pairs.push({ z, ops, o: this.gate(ops, z) }); z -= 11;
      }
      const n = Math.max(4, Math.round((best + worst) / 2) + 1);
      this.hordes.push({ z: z + 3, n, mesh: this.horde(n, z + 3) }); z -= 14;
      best = Math.max(1, best - n); worst = Math.max(1, Math.min(best, worst - n + Math.round((best - worst) / 3)));
    }
    this.end = z;
    const fin = this.finish = new THREE.Group();
    for (let k = 0; k < 8; k++) { const t = mesh(new THREE.BoxGeometry(HALF * 2 / 8, .04, .8), mat(k % 2 ? 0x1b1b1f : 0xffffff), false); t.position.set(-HALF + HALF / 8 + k * HALF * 2 / 8, .02, 0); fin.add(t); }
    const arch = mesh(new THREE.TorusGeometry(HALF + .2, .18, 8, 24, Math.PI), mat(0xffd23f)); arch.position.y = .1; fin.add(arch);
    fin.position.z = z; sc.add(fin);
    this.renderCrowd(); this.hud(); this.tip();
    setTools([['Заново', () => this.load()]]);
  },
  gate(ops: [Op, Op], z: number) {
    const g = new THREE.Group(), post = mat(0xffffff, { roughness: .4 });
    ops.forEach((o, i) => {
      const x = i ? HALF / 2 : -HALF / 2, col = good(o) ? '#2f9bff' : '#ff3d5a';
      const p = new THREE.Mesh(new THREE.PlaneGeometry(HALF - .2, 1.5), new THREE.MeshBasicMaterial({ map: labelTexture(label(o), col), transparent: true, opacity: .85, side: THREE.DoubleSide }));
      p.position.set(x, 1.1, 0); g.add(p);
    });
    for (const x of [-HALF, 0, HALF]) { const m = mesh(new THREE.BoxGeometry(.12, 2, .12), post); m.position.set(x, 1, 0); g.add(m); }
    g.position.z = z; this.st.scene.add(g); return g;
  },
  horde(n: number, z: number) {
    const m = new THREE.InstancedMesh(this.geo, mat(0xffffff, { roughness: .6 }), Math.min(n, MAXV)); m.castShadow = true;
    const d = new THREE.Object3D();
    for (let i = 0; i < m.count; i++) { const [x, zz] = spiral(i); d.position.set(Math.max(-HALF + .2, Math.min(HALF - .2, x)), 0, z + zz); d.rotation.y = Math.PI; d.updateMatrix(); m.setMatrixAt(i, d.matrix); m.setColorAt(i, new THREE.Color(i % 3 ? 0x5aa84a : 0x6fbf5a)); }
    this.st.scene.add(m); m.userData.n = n; return m;
  },
  tip() { this.el.querySelector('.rtip')?.remove(); const t = document.createElement('div'); t.className = 'rtip'; t.innerHTML = '<b>Торкнись, щоб почати</b><br>веди пальцем, щоб вибрати ворота'; this.el.appendChild(t); },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill('Хвиля ' + Math.min(this.hordes.filter((h: Horde) => h.done).length + 1, this.hordes.length) + '/' + this.hordes.length)}`); },
  bind() {
    const el = this.el; let down = false, sx = 0, bx = 0;
    el.onpointerdown = (e: PointerEvent) => { down = true; sx = e.clientX; bx = this.tx; if (this.state === 'ready') { this.state = 'run'; el.querySelector('.rtip')?.remove(); } };
    el.onpointermove = (e: PointerEvent) => { if (down) this.tx = Math.max(-HALF + .6, Math.min(HALF - .6, bx + (e.clientX - sx) / el.clientWidth * HALF * 2.6)); };
    el.onpointerup = () => { down = false; };
  },
  renderCrowd(t = 0) {
    const d = new THREE.Object3D(), n = Math.min(this.n, MAXV);
    this.mine.count = n;
    for (let i = 0; i < n; i++) {
      const [x, z] = spiral(i), bob = Math.abs(Math.sin(t * 12 + i)) * .08;
      d.position.set(Math.max(-HALF + .15, Math.min(HALF - .15, this.x + x)), bob, z + .6); d.rotation.set(0, 0, 0); d.updateMatrix(); this.mine.setMatrixAt(i, d.matrix);
    }
    this.mine.instanceMatrix.needsUpdate = true;
  },
  frame(dt: number) {
    this.t = (this.t || 0) + dt;
    if (this.state === 'run' && !this.fight) {
      const dz = SPEED * dt; this.z += dz;
      for (const p of this.pairs) { p.o.position.z += dz; if (p.o.position.z > 14) p.o.visible = false; } for (const h of this.hordes) { h.z += dz; h.mesh.position.z += dz; } this.finish.position.z += dz;
      this.x += (this.tx - this.x) * Math.min(1, dt * 10);
      for (const p of this.pairs) if (!p.done && p.o.position.z > 0) {
        p.done = true; const op = p.ops[this.x < 0 ? 0 : 1], before = this.n; this.n = Math.min(999, apply(this.n, op));
        this.pop(this.n > before ? '+' + (this.n - before) : this.n < before ? '−' + (before - this.n) : '0', this.n >= before); haptic(this.n >= before ? 'ok' : 'err'); good(op) ? Score.good(10) : Score.bad();
        if (this.n <= 0) return this.lose();
      }
      for (const h of this.hordes) if (!h.done && h.z > -.6) { this.fight = h; this.fightT = 0; }
      if (this.finish.position.z > 0 && this.state === 'run') { this.state = 'won'; done('cr_lvl', this.lvl, () => this.load()); }
    }
    if (this.fight) {
      this.fightT += dt;
      if (this.fightT > .05) {
        this.fightT = 0; const h: Horde = this.fight, k = Math.max(1, Math.round(Math.min(this.n, h.n) / 12));
        this.n = Math.max(0, this.n - k); h.n = Math.max(0, h.n - k); h.mesh.count = Math.min(h.n, MAXV); haptic();
        if (h.n <= 0) { h.done = true; this.fight = null; this.hud(); Score.add(h.mesh.userData.n * 3); }
        else if (this.n <= 0) { this.fight = null; return this.lose(); }
      }
    }
    if (this.state === 'run' || this.state === 'ready') this.renderCrowd(this.state === 'run' ? this.t : 0);
    const lab = this.el.querySelector('.cnum') as HTMLElement, v = new THREE.Vector3(this.x, 1.6, .4).project(this.st.camera);
    lab.textContent = String(this.n); lab.style.transform = `translate(${(v.x + 1) / 2 * this.el.clientWidth}px,${(1 - v.y) / 2 * this.el.clientHeight}px) translate(-50%,-50%)`;
  },
  pop(t: string, up: boolean) { const e = document.createElement('div'); e.className = 'cpop ' + (up ? 'up' : 'down'); e.textContent = t; this.el.appendChild(e); setTimeout(() => e.remove(), 800); },
  lose() {
    this.state = 'lost'; this.renderCrowd(); haptic('err');
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +20 людей', () => Ads.rewarded(() => { this.cont = true; this.n = 20; this.state = 'run'; if (this.fight) this.fight = null; })]);
    b.push(['Спробувати знову', () => this.load()]);
    setTimeout(() => modal('<h2>Натовп розбито</h2><p class="muted">Обирай вигідніші ворота: вони сині, а ×2 найкращі, коли людей багато.</p>', b), 300);
  },
};
export default Crowd;
