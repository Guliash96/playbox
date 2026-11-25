// Sled run (3D): endless downhill in 3 lanes. Swipe ←/→ to change lane, swipe ↑ (or tap the middle) to jump.
// Pines and snowmen must be dodged, rocks and logs can be jumped, coins add score.
import './runner.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill } from '../core/ui';
import { gameOver } from '../core/flow';
import { Stage, THREE, RoundedBoxGeometry, mat, mesh } from '../core/three';
import { Score } from '../core/score';
import type { Game } from './registry';

const LANE = 1.7, SKY = 0xcfe4ff;
type Kind = 'tree' | 'snowman' | 'rock' | 'log' | 'coin' | 'deco';
interface Ob { o: THREE.Object3D; lane: number; kind: Kind; got?: boolean }

// ---------- shared assets ----------
const M = {
  snow: mat(0xffffff, { roughness: .9 }), pine: mat(0x2f7d4f, { roughness: .8, flatShading: true }), pine2: mat(0x3a9460, { roughness: .8, flatShading: true }),
  bark: mat(0x7a5038, { roughness: .9 }), rock: mat(0x7d8696, { roughness: .9, flatShading: true }), wood: mat(0x8a5a2b, { roughness: .8 }), woodEnd: mat(0xd9a86c, { roughness: .8 }),
  gold: mat(0xffc533, { metalness: .7, roughness: .25, emissive: 0x6b4a00, emissiveIntensity: .4 }), coal: mat(0x222222), carrot: mat(0xff7a1a),
  red: mat(0xe8443a, { roughness: .4 }), blue: mat(0x2f6fd6, { roughness: .6 }), skin: mat(0xf2c9a0, { roughness: .7 }), pink: mat(0xff3d7f, { roughness: .6 }), yellow: mat(0xffd23f), metal: mat(0xcfd6df, { metalness: .8, roughness: .3 }),
};
const G = {
  trunk: new THREE.CylinderGeometry(.12, .16, .6, 7), cone: [new THREE.ConeGeometry(.95, 1.1, 8), new THREE.ConeGeometry(.75, 1, 8), new THREE.ConeGeometry(.52, .9, 8)],
  cap: [new THREE.ConeGeometry(.55, .45, 8), new THREE.ConeGeometry(.42, .4, 8), new THREE.ConeGeometry(.3, .4, 8)],
  rock: new THREE.DodecahedronGeometry(.6, 0), log: new THREE.CylinderGeometry(.24, .24, 1.5, 12).rotateZ(Math.PI / 2), logEnd: new THREE.CircleGeometry(.24, 12),
  coin: new THREE.CylinderGeometry(.3, .3, .07, 20).rotateX(Math.PI / 2), ball: [new THREE.SphereGeometry(.45, 16, 12), new THREE.SphereGeometry(.33, 16, 12), new THREE.SphereGeometry(.24, 16, 12)],
};
function tree(scale = 1) {
  const g = new THREE.Group(); const t = mesh(G.trunk, M.bark); t.position.y = .3; g.add(t);
  G.cone.forEach((c, i) => { const m = mesh(c, i % 2 ? M.pine2 : M.pine); m.position.y = .9 + i * .62; m.rotation.y = i * .4; g.add(m); const s = mesh(G.cap[i], M.snow); s.position.y = 1.18 + i * .62; s.rotation.y = i * .4; g.add(s); });
  g.scale.setScalar(scale); return g;
}
function snowman() {
  const g = new THREE.Group(); G.ball.forEach((b, i) => { const m = mesh(b, M.snow); m.position.y = [.42, 1.08, 1.58][i]; g.add(m); });
  for (const x of [-.09, .09]) { const e = mesh(new THREE.SphereGeometry(.035, 8, 6), M.coal, false); e.position.set(x, 1.64, .21); g.add(e); }
  const n = mesh(new THREE.ConeGeometry(.05, .26, 8).rotateX(Math.PI / 2), M.carrot, false); n.position.set(0, 1.57, .32); g.add(n);
  const hat = mesh(new THREE.CylinderGeometry(.17, .17, .26, 12), M.coal); hat.position.y = 1.86; g.add(hat);
  const sc = mesh(new THREE.TorusGeometry(.27, .06, 8, 16).rotateX(Math.PI / 2), M.red); sc.position.y = 1.35; g.add(sc);
  return g;
}
function rock() { const g = new THREE.Group(); const r = mesh(G.rock, M.rock); r.scale.set(1, .55, .8); r.position.y = .2; g.add(r); const s = mesh(G.rock, M.snow); s.scale.set(.7, .25, .6); s.position.y = .46; g.add(s); return g; }
function log() { const g = new THREE.Group(); const l = mesh(G.log, M.wood); l.position.y = .24; g.add(l); for (const x of [-.75, .75]) { const e = mesh(G.logEnd, M.woodEnd, false); e.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2; e.position.set(x + (x > 0 ? .001 : -.001), .24, 0); g.add(e); } const s = mesh(new RoundedBoxGeometry(1.3, .08, .3, 2, .04), M.snow); s.position.y = .47; g.add(s); return g; }
function coin() { const m = mesh(G.coin, M.gold); m.position.y = .7; return m; }
function rider() {
  const g = new THREE.Group();
  const sled = mesh(new RoundedBoxGeometry(.78, .12, 1.25, 3, .05), M.red); sled.position.y = .24; g.add(sled);
  for (const x of [-.32, .32]) {
    const run = mesh(new THREE.BoxGeometry(.05, .05, 1.3), M.metal); run.position.set(x, .08, .05); g.add(run);
    const tip = mesh(new THREE.TorusGeometry(.16, .025, 6, 12, Math.PI / 2), M.metal); tip.rotation.y = Math.PI / 2; tip.position.set(x, .24, -.6); g.add(tip);
    for (const z of [-.35, .35]) { const p = mesh(new THREE.BoxGeometry(.04, .16, .04), M.wood); p.position.set(x, .16, z); g.add(p); }
  }
  const body = mesh(new THREE.CapsuleGeometry(.24, .32, 6, 12), M.blue); body.position.set(0, .66, .12); body.rotation.x = -.25; g.add(body);
  const belt = mesh(new THREE.TorusGeometry(.245, .04, 6, 16).rotateX(Math.PI / 2), M.yellow); belt.position.set(0, .58, .1); g.add(belt);
  const head = mesh(new THREE.SphereGeometry(.19, 16, 12), M.skin); head.position.set(0, 1.08, .02); g.add(head);
  const hat = mesh(new THREE.ConeGeometry(.2, .32, 14), M.pink); hat.position.set(0, 1.3, .03); hat.rotation.x = .25; g.add(hat);
  const pom = mesh(new THREE.SphereGeometry(.07, 10, 8), M.snow); pom.position.set(0, 1.46, .07); g.add(pom);
  const scarf = mesh(new THREE.TorusGeometry(.17, .055, 8, 16).rotateX(Math.PI / 2), M.yellow); scarf.position.set(0, .92, .04); g.add(scarf);
  for (const x of [-.27, .27]) { const a = mesh(new THREE.CapsuleGeometry(.065, .3, 4, 8), M.blue); a.position.set(x, .55, -.12); a.rotation.x = 1.1; g.add(a); }
  return g;
}

const Runner: Game & Record<string, any> = {
  title: 'Сани', theme: 'th-runner',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = ''; this.best = store.get('rn_best', 0);
    const st: Stage = this.st = new Stage(el, { fov: 55, shadows: true, clear: SKY });
    st.scene.fog = new THREE.Fog(SKY, 22, 70);
    const sun = st.lights(new THREE.Vector3(-4, 10, 4), 10); st.scene.add(sun.target);
    this.sun = sun;
    // snowfield with moving stripes
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64; const c = cv.getContext('2d')!;
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#e3eefc'; c.fillRect(0, 28, 64, 6); c.fillStyle = '#eef4fd'; c.fillRect(0, 50, 64, 3);
    const tex = this.tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 40); tex.colorSpace = THREE.SRGBColorSpace;
    const ground = mesh(new THREE.PlaneGeometry(40, 160).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: .95 }), false); ground.position.z = -60; st.scene.add(ground);
    for (const x of [-LANE * 1.5, -LANE / 2, LANE / 2, LANE * 1.5]) { const gr = mesh(new THREE.PlaneGeometry(.06, 160).rotateX(-Math.PI / 2), mat(0xb9cdea, { roughness: 1 }), false); gr.position.set(x, .01, -60); st.scene.add(gr); }
    // far mountains
    for (let k = 0; k < 9; k++) { const h = 14 + Math.random() * 14, m = new THREE.Mesh(new THREE.ConeGeometry(h * .8, h, 6), new THREE.MeshStandardMaterial({ color: 0x9db7dc, flatShading: true, fog: false })); m.position.set(-60 + k * 15, h / 2 - 4, -95); st.scene.add(m); const cap = new THREE.Mesh(new THREE.ConeGeometry(h * .3, h * .38, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, fog: false })); cap.position.set(m.position.x, h - 4 - h * .19, -94.8); st.scene.add(cap); }
    // falling snow
    const N = 260, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 24; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = -Math.random() * 40 + 6; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.flakes = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: .09, transparent: true, opacity: .9 })); st.scene.add(this.flakes);
    this.player = rider(); st.scene.add(this.player);
    st.camera.position.set(0, 3.1, 5.6); st.camera.lookAt(0, .7, -5);
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.reset(); this.state = 'ready'; this.tip();
    setTools([['Нова гра', () => { this.reset(); this.state = 'ready'; this.tip(); }]]);
  },
  stop() { this.st?.dispose(); this.unbind?.(); },
  tip() { this.el.querySelector('.rtip')?.remove(); const t = document.createElement('div'); t.className = 'rtip'; t.innerHTML = '<b>Торкнись, щоб почати</b><br>свайп ← → змінює смугу, ↑ стрибок'; this.el.appendChild(t); },
  reset() {
    for (const o of this.obs || []) this.st.scene.remove(o.o);
    this.obs = [] as Ob[]; this.lane = 0; this.px = 0; this.jump = 0; this.vy = 0; this.speed = 12; this.dist = 0; this.coins = 0; this.nextRow = 16; this.cont = false; this.t = 0; this.paid = 0;
    for (let z = 2; z > -70; z -= 3.2) this.deco(z);
    this.hud();
  },
  add(o: THREE.Object3D, lane: number, z: number, kind: Kind) { o.position.set(kind === 'deco' ? lane : lane * LANE, 0, z); this.st.scene.add(o); this.obs.push({ o, lane, kind }); },
  deco(z: number) { for (const s of [-1, 1]) if (Math.random() < .8) this.add(Math.random() < .85 ? tree(1 + Math.random() * .7) : rock(), s * (4 + Math.random() * 6), z + Math.random() * 2, 'deco'); },
  hud() { setStats(`${pill(Math.floor(this.score()))}${pill('Монети ' + this.coins)}${pill('Рекорд ' + this.best)}`); },
  score() { return this.dist + this.coins * 10; },
  bind() {
    let sx = 0, sy = 0, st = 0; const el = this.el;
    el.onpointerdown = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; st = performance.now(); };
    el.onpointerup = (e: PointerEvent) => {
      if (this.state === 'ready') { this.state = 'run'; el.querySelector('.rtip')?.remove(); return; }
      if (this.state !== 'run') return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1);
      else if (dy < -28) this.hop();
      else if (performance.now() - st < 300) { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; x < .33 ? this.move(-1) : x > .67 ? this.move(1) : this.hop(); }
    };
    const kd = (e: KeyboardEvent) => { if (this.state === 'ready') { this.state = 'run'; this.el.querySelector('.rtip')?.remove(); } if (e.key === 'ArrowLeft') this.move(-1); if (e.key === 'ArrowRight') this.move(1); if (e.key === 'ArrowUp' || e.key === ' ') this.hop(); };
    addEventListener('keydown', kd); this.unbind = () => removeEventListener('keydown', kd);
  },
  move(d: number) { const n = Math.max(-1, Math.min(1, this.lane + d)); if (n !== this.lane) { this.lane = n; haptic(); } },
  hop() { if (this.jump <= .01) { this.vy = 9.5; haptic(); } },
  spawnRow(z: number) {
    const free = pick([-1, 0, 1]), lvl = Math.min(1, this.dist / 2500);
    for (const l of [-1, 0, 1]) {
      if (l === free) { if (Math.random() < .65) for (let k = 0; k < 5; k++) this.add(coin(), l, z - k * 1.6, 'coin'); continue; }
      const r = Math.random();
      if (r < .32 + lvl * .3) Math.random() < .7 ? this.add(tree(.95), l, z, 'tree') : this.add(snowman(), l, z, 'snowman');
      else if (r < .55 + lvl * .25) Math.random() < .5 ? this.add(log(), l, z, 'log') : this.add(rock(), l, z, 'rock');
    }
    this.deco(z - 1);
  },
  frame(dt: number) {
    const p = this.player, run = this.state === 'run';
    if (run) {
      this.t += dt; this.speed = Math.min(30, 12 + this.t * .22); const dz = this.speed * dt; this.dist += dz;
      this.px += (this.lane - this.px) * Math.min(1, dt * 12);
      this.vy -= 30 * dt; this.jump = Math.max(0, this.jump + this.vy * dt); if (this.jump === 0) this.vy = Math.max(this.vy, 0);
      for (const o of this.obs) o.o.position.z += dz;
      for (const o of this.obs.filter((o: Ob) => o.o.position.z > 9)) this.st.scene.remove(o.o);
      this.obs = this.obs.filter((o: Ob) => o.o.position.z <= 9);
      this.nextRow -= dz; if (this.nextRow <= 0) { this.spawnRow(-68); this.nextRow = Math.max(6, 11 - this.t * .05) + Math.random() * 4; }
      this.tex.offset.y += dz / 4;
      for (const o of this.obs) {
        if (o.kind === 'deco' || o.got || Math.abs(o.o.position.z) > .65 || Math.abs(o.lane - this.px) > .45) continue;
        if (o.kind === 'coin') { o.got = true; this.coins++; haptic(); Score.good(5); const c = o.o; this.st.tween(250, k => { c.position.y = .7 + k * 1.2; c.scale.setScalar(1 - k); }); continue; }
        if ((o.kind === 'rock' || o.kind === 'log') && this.jump > .4) continue;
        this.crash(); break;
      }
      if ((this.hudT = (this.hudT || 0) + dt) > .2) { this.hudT = 0; this.hud(); }
    }
    for (const o of this.obs) if (o.kind === 'coin') o.o.rotation.y += dt * 4;
    // rider pose + camera follow
    const x = this.px * LANE; p.position.set(x, this.jump * .55 + (run ? Math.sin(this.t * 18) * .015 : 0), 0);
    p.rotation.z = (this.px - this.lane) * .35; p.rotation.x = this.jump > 0 ? -this.vy * .02 : 0;
    const cam = this.st.camera; cam.position.x += (x * .55 - cam.position.x) * Math.min(1, dt * 6); cam.lookAt(cam.position.x * .6, .7, -5);
    this.sun.position.set(x - 4, 10, 4); this.sun.target.position.set(x, 0, -2);
    const f = this.flakes.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < f.count; i++) { let y = f.getY(i) - dt * 1.6, z = f.getZ(i) + (run ? this.speed * dt * .5 : 0); if (y < 0) y = 10; if (z > 6) z -= 40; f.setY(i, y); f.setZ(i, z); }
    f.needsUpdate = true;
  },
  crash() {
    this.state = 'crash'; haptic('err');
    const p = this.player; this.st.tween(500, k => { p.rotation.z = k * 1.4; p.position.y = Math.sin(k * Math.PI) * .6; });
    const sc = Math.floor(this.score()); if (sc > this.best) { this.best = sc; store.set('rn_best', sc); } this.hud();
    Score.add(this.dist - (this.paid || 0)); this.paid = this.dist;
    const revive = () => { this.cont = true; for (const o of this.obs.filter((o: Ob) => o.kind !== 'deco' && o.o.position.z > -16)) { this.st.scene.remove(o.o); o.got = true; } this.state = 'run'; };
    setTimeout(() => gameOver('Бум!', `<p>Рахунок: <b>${sc}</b> · рекорд ${this.best}</p>`, this.cont ? null : revive, () => { this.reset(); this.state = 'ready'; this.tip(); }), 600);
  },
};
export default Runner;
