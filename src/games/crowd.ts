// Crowd gates (3D): run forward, drag to steer through one of two gates (+N, −N, ×2, ÷2). Every few gates a
// zombie horde blocks the road, sized so you win only if you picked the better gate in more than half of them.
// Past the black-and-white finish arch waits a boss; before it you may double your crowd for an ad.
import './crowd.css';
import { R } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, closeModal, pill } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { Score } from '../core/score';
import { t } from '../core/i18n';
import { Stage, THREE, RoundedBoxGeometry, mat, mesh } from '../core/three';
import { CrowdMesh, person, animate, labelTexture, numberSprite, setSpriteText, poof, type Person } from '../art/people3d';
import type { Game } from './registry';

const MAXV = 320, SPEED = 7, HALF = 2.7, GAP = .9, GW = HALF - GAP / 2;
type Op = { k: '+' | '-' | 'x' | '/'; v: number };
interface Pair { ops: [Op, Op]; o: THREE.Group; done?: boolean }
interface Trap { o: THREE.Group; kind: string; gx: number; ph: number; w: number; hit: (x: number, dz: number, t: number) => boolean; anim: (t: number) => void }
interface Horde { z: number; n: number; start: number; mesh: CrowdMesh; tag: THREE.Sprite; done?: boolean }
const apply = (n: number, o: Op) => Math.max(0, Math.round(o.k === '+' ? n + o.v : o.k === '-' ? n - o.v : o.k === 'x' ? n * o.v : n / o.v));
const apF = (n: number, o: Op) => o.k === '+' ? n + o.v : o.k === '-' ? n - o.v : o.k === 'x' ? n * o.v : n / o.v;
const label = (o: Op) => (o.k === '+' ? '+' : o.k === '-' ? '−' : o.k === 'x' ? '×' : '÷') + o.v;
const good = (o: Op) => apF(100, o) > 100;
// loose sunflower layout: spacing shrinks only when the crowd gets wide, people get a little jitter
const JIT = Array.from({ length: MAXV }, () => [(Math.random() - .5) * .14, (Math.random() - .5) * .14, Math.random() * 6]);
const spiral = (i: number, n = 1) => { const m = Math.max(1, Math.min(n, MAXV)), sp = Math.min(.36, (HALF - .35) / Math.sqrt(m)), a = i * 2.39996, r = sp * Math.sqrt(i + .5); return [Math.cos(a) * r + JIT[i % MAXV][0], Math.sin(a) * r * .8 + JIT[i % MAXV][1]]; };
const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => { const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - ax - vx * t, pz - az - vz * t); };
const SHIRTS = [0x2f7bff, 0x3d8bff, 0x2a6fe0, 0x4f9bff];
let chev: THREE.Texture | null = null;
function chevron() {
  if (chev) return chev; const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d')!;
  x.fillStyle = '#4a86ff'; x.fillRect(0, 0, 64, 128); x.fillStyle = '#e8435a';
  for (let y = -16; y < 128; y += 40) { x.beginPath(); x.moveTo(0, y + 16); x.lineTo(32, y); x.lineTo(64, y + 16); x.lineTo(64, y + 30); x.lineTo(32, y + 14); x.lineTo(0, y + 30); x.fill(); }
  chev = new THREE.CanvasTexture(c); chev.colorSpace = THREE.SRGBColorSpace; return chev;
}

const Crowd: Game & Record<string, any> = {
  title: 'Натовп', theme: 'th-crowd',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '<div class="cnum"></div>';
    const st: Stage = this.st = new Stage(el, { fov: 50, shadows: true, clear: 0xffc9f2 });
    st.scene.fog = new THREE.Fog(0xffc9f2, 30, 66);
    st.lights(new THREE.Vector3(-4, 14, 8), 9);
    const sc = st.scene;
    const track = mesh(new THREE.BoxGeometry(HALF * 2 + .5, .5, 500), mat(0xf4f1ff, { roughness: .8 }), false); track.position.set(0, -.25, -240); sc.add(track);
    for (const x of [-HALF - .3, HALF + .3]) { const r = mesh(new RoundedBoxGeometry(.24, .4, 500, 2, .08), mat(0xe6e2f0)); r.position.set(x, .15, -240); sc.add(r); }
    // pink bands across the road + lavender crystal cliffs on both sides; they scroll and wrap around
    const band = mat(0xffc6ec, { roughness: .7 }); this.dashes = [];
    for (let z = 4; z > -480; z -= 6) { const d = mesh(new THREE.BoxGeometry(HALF * 2 + .4, .01, 3), band, false); d.position.set(0, .004, z); sc.add(d); this.dashes.push(d); }
    const cliff = mat(0xf0b8ff, { roughness: .6 }), cry = [mat(0xd9a6ff, { roughness: .25, metalness: .1 }), mat(0xffb3e6, { roughness: .25 }), mat(0xb7a6ff, { roughness: .25 })];
    for (let z = 4; z > -480; z -= 8) for (const s of [-1, 1]) {
      const g = new THREE.Group(); const c = mesh(new RoundedBoxGeometry(3, 1.6 + Math.random() * 1.6, 7.6, 2, .3), cliff, false); c.position.set(s * (HALF + 2.1), -.1, 0); g.add(c);
      for (let k = 0; k < 2; k++) { const r = mesh(new THREE.IcosahedronGeometry(.5 + Math.random() * .6, 0), cry[R(3)]); r.position.set(s * (HALF + 1.2 + Math.random() * 1.8), .9 + Math.random(), (Math.random() - .5) * 6); r.rotation.set(Math.random(), Math.random(), Math.random()); r.scale.y = 1.6; g.add(r); }
      if (Math.random() < .3) { const blk = mesh(new RoundedBoxGeometry(.9, .9, .9, 2, .1), mat(0xff4f6a)); blk.position.set(s * (HALF + 1.4), 1.6, 0); g.add(blk); }
      g.position.z = z; sc.add(g); this.dashes.push(g);
    }
    const water = mesh(new THREE.PlaneGeometry(300, 500).rotateX(-Math.PI / 2), mat(0xffc9f2, { roughness: .9 }), false); water.position.set(0, -1.4, -240); sc.add(water);
    this.mine = new CrowdMesh(MAXV, sc, 'human'); for (let i = 0; i < MAXV; i++) this.mine.color(i, SHIRTS[i % 4]);
    st.onResize = () => { const c = st.camera, k = Math.max(1, 3.6 / (9 * Math.tan(c.fov * Math.PI / 360) * c.aspect)); c.position.set(0, 7 * k, 7.8 * k); c.lookAt(0, 0, -6); };
    st.resize();
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.load();
  },
  stop() { this.st?.dispose(); clearInterval(this.offerT); },
  load() {
    const sc = this.st.scene;
    for (const p of this.pairs || []) sc.remove(p.o); for (const h of this.hordes || []) { h.mesh.dispose(sc); sc.remove(h.tag); } for (const tr of this.traps || []) sc.remove(tr.o);
    if (this.finish) sc.remove(this.finish); if (this.boss) sc.remove(this.boss);
    const L = this.lvl = store.get('cr_lvl', 1);
    this.n = 10; this.x = 0; this.tx = 0; this.state = 'ready'; this.cont = false; this.fight = null; this.offered = false; this.loss = 0;
    this.pairs = [] as Pair[]; this.hordes = [] as Horde[]; this.traps = [] as Trap[];
    let z = -14, best = this.n, worst = this.n, trick = 4 + R(5); const waves = 2 + Math.floor(L / 2);
    const gp = () => {                                   // a good option
      const r = Math.random();
      if (r < .18 && best < 90) return { k: 'x', v: 2 } as Op;
      if (r < .28 && best < 90) return { k: '/', v: .5 } as Op;       // ÷0.5 = ×2, looks scary
      if (r < .36 && best < 60) return { k: 'x', v: 3 } as Op;
      return { k: '+', v: 5 + R(6) * 5 } as Op;
    };
    const bp = () => {                                   // a bad option
      const r = Math.random();
      if (r < .18 && worst > 12) return { k: '/', v: 2 } as Op;
      if (r < .3 && worst > 12) return { k: 'x', v: .5 } as Op;        // ×0.5 = halves, looks nice
      return { k: '-', v: Math.max(2, Math.min(3 + R(5) * 3, Math.floor(worst * .6))) } as Op;
    };
    for (let w = 0; w < waves; w++) {
      const gates = 4 + R(4);
      for (let gi = 0; gi < gates; gi++) {
        const g = gp(), b = Math.random() < .15 ? { k: '+', v: Math.max(2, Math.round((g.k === '+' ? g.v : 10) / 3)) } as Op : bp();
        const ops: [Op, Op] = Math.random() < .5 ? [g, b] : [b, g];
        // every 4–8 gates the colours lie: good one red, bad one blue (or both red) — read the numbers!
        const lie = --trick <= 0; if (lie) trick = 4 + R(5);
        best = Math.min(MAXV, Math.max(apply(best, ops[0]), apply(best, ops[1]))); worst = Math.min(apply(worst, ops[0]), apply(worst, ops[1]));
        this.pairs.push({ ops, o: this.gate(ops, z, lie ? (Math.random() < .7 ? 'swap' : 'red') : '') }); z -= 11;
        // traps between gates (from level 2)
        if (L >= 2 && gi < gates - 1 && Math.random() < Math.min(.6, .25 + L * .05)) { this.traps.push(this.trap(z + 5.5, L)); best = Math.round(best * .9); worst = Math.round(worst * .8); }
      }
      const n = Math.max(4, Math.round((best * .9 + worst) / 2) + 1);
      this.hordes.push(this.horde(n, z + 3)); z -= 14;
      best = Math.max(1, best - n); worst = Math.max(1, Math.min(best, worst - n + Math.round((best - worst) / 3)));
    }
    this.finishZ = z; this.bossHp = Math.max(8, Math.round(best * .6 + 6)); this.buildFinish(z);
    this.render(0); this.hud(); this.tip();
    setTools([['i:restart', () => { Score.lose(); this.load(); }]]);
  },
  gate(ops: [Op, Op], z: number, lie: '' | 'swap' | 'red') {
    const g = new THREE.Group(), post = mat(0xffffff, { roughness: .4 });
    ops.forEach((o, i) => {
      const x = (i ? 1 : -1) * (GAP / 2 + GW / 2), gd = good(o), blue = lie === 'red' ? false : lie === 'swap' ? !gd : gd, col = blue ? '#2f9bff' : '#ff3d5a';
      const p = new THREE.Mesh(new THREE.PlaneGeometry(GW - .2, 1.6), new THREE.MeshBasicMaterial({ map: labelTexture(label(o), col), transparent: true, opacity: .85, side: THREE.DoubleSide }));
      p.position.set(x, 1.15, 0); g.add(p);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(GW - .1, .08), new THREE.MeshBasicMaterial({ color: blue ? 0x9fd8ff : 0xffa0b0 })); glow.position.set(x, .32, .02); g.add(glow);
    });
    for (const x of [-HALF, -GAP / 2, GAP / 2, HALF]) { const m = mesh(new RoundedBoxGeometry(.16, 2.2, .16, 2, .05), post); m.position.set(x, 1.1, 0); g.add(m); }
    const wall = mesh(new RoundedBoxGeometry(GAP - .2, 1.2, .5, 2, .08), mat(0xff3d5a)); wall.position.set(0, .6, 0); g.add(wall);
    const stripe = mesh(new THREE.BoxGeometry(GAP - .18, .2, .52), mat(0xffffff)); stripe.position.set(0, .7, 0); g.add(stripe);
    g.position.z = z; this.st.scene.add(g); return g;
  },
  // ---------- traps ----------
  trap(z: number, L: number): Trap {
    const g = new THREE.Group(), red = mat(0xff4058, { roughness: .35 }), white = mat(0xffffff, { roughness: .4 }), kinds = ['spinner', 'hammer', 'rollers', 'spikes'];
    const kind = kinds[L < 3 ? R(2) * 2 : R(4)], ph = Math.random() * 6, w = 1.6 + Math.random() * .8 + L * .04, gx = (Math.random() - .5) * 2.4;
    const striped = (len: number, r: number, n = 6) => { const s = new THREE.Group(); for (let i = 0; i < n; i++) { const c = mesh(new THREE.CylinderGeometry(r, r, len / n, 14), i % 2 ? white : red); c.position.y = -len / 2 + (i + .5) * len / n; s.add(c); } return s; };
    const star = (x: number, y: number, zz: number) => { const s = mesh(new THREE.OctahedronGeometry(.22, 0).scale(1, 1, .4), mat(0xff3030, { emissive: 0x801010 })); s.position.set(x, y, zz); g.add(s); return s; };
    let hit: Trap['hit'] = () => false, anim: Trap['anim'] = () => { };
    if (kind === 'spinner') {
      const base = mesh(new THREE.CylinderGeometry(.5, .6, .2, 20), red); base.position.set(gx, .1, 0); g.add(base);
      const post = striped(1.1, .2, 4); post.position.set(gx, .7, 0); g.add(post);
      const arm = new THREE.Group(); arm.position.set(gx, 1, 0); g.add(arm);
      const bar = striped(4.4, .07, 10); bar.rotation.z = Math.PI / 2; bar.position.y = -.55; arm.add(bar);
      const s1 = star(2.2, -.55, 0), s2 = star(-2.2, -.55, 0); g.remove(s1, s2); arm.add(s1, s2);
      anim = t => { arm.rotation.y = t * w + ph; s1.rotation.z = s2.rotation.z = t * 6; };
      hit = (x, dz, t) => { const a = t * w + ph, cx = Math.cos(a) * 2.2, cz = -Math.sin(a) * 2.2; return segDist(x, dz, gx - cx, -cz, gx + cx, cz) < .26; };
    } else if (kind === 'hammer') {
      const side = Math.random() < .5 ? -1 : 1, piv = new THREE.Group(); piv.position.set(side * (HALF + .5), 2.6, 0); g.add(piv);
      const stand = striped(2.6, .16, 5); stand.position.set(side * (HALF + .5), 1.3, 0); g.add(stand);
      const handle = striped(2.6, .1, 7); handle.rotation.z = Math.PI / 2; handle.position.x = -side * 1.3; piv.add(handle);
      const head = new THREE.Group(); head.position.x = -side * 2.9; piv.add(head);
      const hh = mesh(new THREE.CylinderGeometry(.62, .62, 1.3, 22), red); hh.rotation.x = Math.PI / 2; head.add(hh);
      for (const zz of [-.3, .3]) { const b = mesh(new THREE.CylinderGeometry(.63, .63, .16, 22), white); b.rotation.x = Math.PI / 2; b.position.z = zz; head.add(b); }
      // the hammer slams down onto the road and lifts up again
      const down = (t: number) => Math.max(0, Math.sin(t * w * 1.3 + ph));
      anim = t => { piv.rotation.z = side * (-1.35 + down(t) * 1.35); };
      hit = (x, dz, t) => down(t) > .92 && Math.abs(dz) < .75 && Math.abs(x - side * (HALF + .5 - 2.9)) < .85;
    } else if (kind === 'rollers') {
      const gap = 1.7, l1 = gx - gap / 2 + HALF, l2 = HALF - (gx + gap / 2);
      const roller = (len: number, cx: number) => { const r = new THREE.Group(); r.position.set(cx, .38, 0); const c = mesh(new THREE.CylinderGeometry(.34, .34, len, 20), red); c.rotation.z = Math.PI / 2; r.add(c); for (let i = 0; i < len * 4; i++) { const sp = mesh(new THREE.ConeGeometry(.08, .22, 6), mat(0x2f4bff)); const a = i * 1.7; sp.position.set(-len / 2 + (i + .5) / 4, Math.cos(a) * .42, Math.sin(a) * .42); sp.rotation.x = a + Math.PI / 2; r.add(sp); } g.add(r); return r; };
      const r1 = roller(l1, -HALF + l1 / 2), r2 = roller(l2, HALF - l2 / 2);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(gap - .1, .12, 1.6), new THREE.MeshStandardMaterial({ map: chevron(), roughness: .6 })); ramp.position.set(gx, .06, 0); ramp.rotation.x = -.06; g.add(ramp);
      anim = t => { r1.rotation.x = r2.rotation.x = t * 5; };
      hit = (x, dz) => Math.abs(dz) < .4 && Math.abs(x - gx) > gap / 2 - .1;
    } else {
      const safe = 1.3, pad = new THREE.Mesh(new THREE.CircleGeometry(.75, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb9f5c8, transparent: true, opacity: .8 })); pad.position.set(gx, .012, .4); g.add(pad);
      const btn = mesh(new THREE.CylinderGeometry(.3, .3, .08, 20), mat(0x5fd66a)); btn.position.set(gx, .04, .4); g.add(btn);
      const spikes: THREE.Mesh[] = [];
      for (let r = 0; r < 3; r++) for (let x = -HALF + .35; x < HALF; x += .62) { if (Math.abs(x + (r % 2) * .31 - gx) < safe / 2) continue; const c = mesh(new THREE.ConeGeometry(.17, .9, 12), mat(0xe01e3c, { roughness: .3 })); c.position.set(x + (r % 2) * .31, .45, -r * .6); g.add(c); spikes.push(c); const ring = new THREE.Mesh(new THREE.RingGeometry(.15, .22, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.position.set(c.position.x, .01, c.position.z); g.add(ring); }
      anim = t => { const k = .6 + .4 * Math.abs(Math.sin(t * 2.4 + ph)); spikes.forEach(s => s.scale.y = k); };
      hit = (x, dz) => dz < .35 && dz > -1.5 && Math.abs(x - gx) > safe / 2;
    }
    g.position.z = z; this.st.scene.add(g); return { o: g, kind, gx, ph, w, hit, anim };
  },
  horde(n: number, z: number): Horde {
    const m = new CrowdMesh(Math.min(n, MAXV), this.st.scene, 'zombie');
    for (let i = 0; i < m.max; i++) m.color(i, [0x6b5b7a, 0x5a6b5a, 0x7a6b4f, 0x8a4a4a][i % 4]);
    const tag = numberSprite(String(n), '#3a8a3a', 1.3); this.st.scene.add(tag);
    const h: Horde = { z, n, start: n, mesh: m, tag }; this.poseHorde(h, 0); return h;
  },
  poseHorde(h: Horde, t: number) {
    const m = h.mesh; m.count = Math.min(h.n, m.max);
    for (let i = 0; i < m.count; i++) { const [x, z] = spiral(i, h.n); m.pose(i, Math.max(-HALF + .2, Math.min(HALF - .2, x)), Math.abs(Math.sin(t * 5 + i)) * .05, h.z - z, 0, .72); }
    m.commit(); h.tag.position.set(0, 2.4, h.z);
  },
  buildFinish(z: number) {
    const sc = this.st.scene, f = this.finish = new THREE.Group();
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d')!;
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#1b1b1f' : '#ffffff'; x.fillRect(i * 16, j * 16, 16, 16); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 1.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex })); ground.position.y = .01; f.add(ground);
    const banner = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2 + .6, .7, .12), [mat(0x1b1b1f), mat(0x1b1b1f), mat(0x1b1b1f), mat(0x1b1b1f), new THREE.MeshStandardMaterial({ map: tex }), new THREE.MeshStandardMaterial({ map: tex })]);
    banner.position.y = 3.1; f.add(banner);
    for (const s of [-1, 1]) { const p = mesh(new RoundedBoxGeometry(.3, 3.4, .3, 2, .08), [mat(0xffffff), mat(0x1b1b1f)][0]); p.position.set(s * (HALF + .3), 1.7, 0); f.add(p); }
    f.position.z = z; sc.add(f);
    const b = this.boss = person('boss', 0x8a2a4a) as Person; b.position.z = z - 12; sc.add(b);
    this.bossTag = numberSprite(String(this.bossHp), '#d81b4a', .65); this.bossTag.position.y = 2.1; b.add(this.bossTag);
  },
  tip() { this.el.querySelector('.rtip')?.remove(); const e = document.createElement('div'); e.className = 'rtip'; e.innerHTML = `<b>${t('Торкнись, щоб почати')}</b><br>${t('веди пальцем, щоб вибрати ворота')}`; this.el.appendChild(e); },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(t('Хвиля {0}/{1}', Math.min(this.hordes.filter((h: Horde) => h.done).length + 1, this.hordes.length), this.hordes.length))}`); },
  bind() {
    const el = this.el; let down = false, sx = 0, bx = 0;
    el.onpointerdown = (e: PointerEvent) => { down = true; sx = e.clientX; bx = this.tx; if (this.state === 'ready') { this.state = 'run'; el.querySelector('.rtip')?.remove(); } };
    el.onpointermove = (e: PointerEvent) => { if (down) this.tx = Math.max(-HALF + .9, Math.min(HALF - .9, bx + (e.clientX - sx) / el.clientWidth * HALF * 2.6)); };
    el.onpointerup = () => { down = false; };
  },
  render(t: number) {
    const n = Math.min(this.n, MAXV), m: CrowdMesh = this.mine, run = this.state === 'run' || this.state === 'boss';
    m.count = n;
    for (let i = 0; i < n; i++) { const [x, z] = spiral(i, this.n), ph = JIT[i][2]; m.pose(i, Math.max(-HALF + .2, Math.min(HALF - .2, this.x + x)), run ? Math.abs(Math.sin(t * 12 + ph)) * .14 : 0, z + .8 + (run ? Math.sin(t * 6 + ph) * .05 : 0), Math.PI + Math.sin(t * 3 + ph) * .15, .72, run ? -.18 : 0); }
    m.commit();
  },
  move(dz: number) {
    for (const p of this.pairs) { p.o.position.z += dz; p.o.visible = p.o.position.z < 14; }
    for (const h of this.hordes) h.z += dz;
    for (const tr of this.traps) { tr.o.position.z += dz; tr.o.visible = tr.o.position.z < 14 && tr.o.position.z > -70; }
    for (const d of this.dashes) { d.position.z += dz; if (d.position.z > 10) d.position.z -= 486; }
    this.finish.position.z += dz; this.boss.position.z += dz;
  },
  frame(dt: number) {
    this.t = (this.t || 0) + dt;
    if (this.state === 'run' && !this.fight) {
      this.move(SPEED * dt);
      this.x += (this.tx - this.x) * Math.min(1, dt * 10);
      for (const p of this.pairs) if (!p.done && p.o.position.z > 0) {
        p.done = true; const before = this.n, disp = Math.min(this.n, MAXV); let cl = 0, cr = 0;
        for (let i = 0; i < disp; i++) { const x = this.x + spiral(i, this.n)[0]; if (x < -GAP / 2) cl++; else if (x > GAP / 2) cr++; }
        const nl = Math.round(this.n * cl / disp), nr = Math.round(this.n * cr / disp);
        this.n = Math.min(999, (nl ? apply(nl, p.ops[0]) : 0) + (nr ? apply(nr, p.ops[1]) : 0));
        this.pop(this.n > before ? '+' + (this.n - before) : this.n < before ? '−' + (before - this.n) : '0', this.n >= before);
        const main = cl >= cr ? p.ops[0] : p.ops[1], clean = Math.max(cl, cr) / disp > .85;
        haptic(this.n >= before ? 'ok' : 'err'); good(main) && clean ? Score.good(10) : Score.bad();
        if (disp - cl - cr > 0) this.fx(.6, 0xff3d5a);
        if (this.n <= 0) return this.lose();
      }
      this.trapHits(dt);
      if (this.n <= 0) return this.lose();
      for (const h of this.hordes) if (!h.done && h.z > -1.2) { this.fight = h; this.fightT = 0; }
      if (!this.offered && this.finish.position.z > -.5) { this.offered = true; this.offer(); }
    }
    if (this.state === 'boss') {
      if (this.boss.position.z < -2.2) { this.move(SPEED * .7 * dt); animate(this.boss, dt * .3, .5); }
      else if ((this.bt = (this.bt || 0) + dt) > .06) {
        this.bt = 0; const k = Math.max(1, Math.round(this.n / 15)); this.n = Math.max(0, this.n - k); this.bossHp = Math.max(0, this.bossHp - k);
        setSpriteText(this.bossTag, String(this.bossHp), '#d81b4a'); this.fx(this.boss.position.z + 1, 0x8fbf6a); haptic();
        if (this.bossHp <= 0) { this.state = 'won'; const b = this.boss; this.st.tween(600, q => { b.rotation.x = -q * 1.5; b.position.y = -q; }); Score.add(this.lvl * 50); done('cr_lvl', this.lvl, () => this.load()); }
        else if (this.n <= 0) return this.lose();
      }
    }
    if (this.fight) {
      this.fightT += dt;
      if (this.fightT > .05) {
        this.fightT = 0; const h: Horde = this.fight, k = Math.max(1, Math.round(Math.min(this.n, h.n) / 12));
        this.n = Math.max(0, this.n - k); h.n = Math.max(0, h.n - k); setSpriteText(h.tag, String(h.n), '#3a8a3a'); haptic();
        this.fx(h.z + .4, 0x8fbf6a); this.fx(.4, 0x5fb0ff);
        if (h.n <= 0) { h.done = true; this.fight = null; h.tag.visible = false; this.hud(); Score.add(h.start * 3); }
        else if (this.n <= 0) { this.fight = null; return this.lose(); }
      }
    }
    for (const h of this.hordes) this.poseHorde(h, this.t);
    for (const tr of this.traps) if (tr.o.visible) tr.anim(this.t);
    this.render(this.t);
    const lab = this.el.querySelector('.cnum') as HTMLElement, v = new THREE.Vector3(this.x, 1.9, .5).project(this.st.camera);
    lab.textContent = String(this.n); lab.style.transform = `translate(${(v.x + 1) / 2 * this.el.clientWidth}px,${(1 - v.y) / 2 * this.el.clientHeight}px) translate(-50%,-50%)`;
  },
  /** people touching a trap are lost (each shown person stands for n/shown people) */
  trapHits(dt: number) {
    const disp = Math.min(this.n, MAXV); if (!disp) return;
    for (const tr of this.traps) {
      const tz = tr.o.position.z; if (tz < -2.5 || tz > 4.5) continue;
      let hits = 0, hx = 0, hz = 0;
      for (let i = 0; i < disp; i++) { const [x, z] = spiral(i, this.n), px = Math.max(-HALF + .2, Math.min(HALF - .2, this.x + x)), pz = z + .8; if (tr.hit(px, pz - tz, this.t)) { hits++; hx = px; hz = pz; } }
      if (!hits) continue;
      this.loss += hits * (this.n / disp) * dt * 9;
      if (this.loss >= 1) {
        const k = Math.floor(this.loss); this.loss -= k; this.n = Math.max(0, this.n - k);
        poof(this.st.scene, this.st, hx, .5, hz, 0x2f7bff, 4, .1); if (Math.random() < .3) haptic('err');
        if (!this.trapPop || this.t - this.trapPop > .6) { this.trapPop = this.t; this.pop('−' + k, false); Score.bad(); }
      }
    }
  },
  fx(z: number, col: number) { if (Math.random() < .6) poof(this.st.scene, this.st, (Math.random() - .5) * 3, .6, z + (Math.random() - .5), col, 4, .1); },
  /** 5-second offer at the finish: double the crowd for an ad */
  offer() {
    this.state = 'paused'; let s = 5;
    const go = () => { clearInterval(this.offerT); this.state = 'boss'; };
    modal(`<h2>${t('Бос попереду!')}</h2><p class="muted">${t('У боса {0} HP. Подвоїти натовп за рекламу?', this.bossHp)}</p><div class="count" id="ocnt">5</div>`,
      [[t('×2 людей за рекламу'), () => { clearInterval(this.offerT); Ads.rewarded(() => { this.n = Math.min(999, this.n * 2); this.pop('×2', true); go(); }); }], [t('Ні, вперед!'), go]]);
    this.offerT = setInterval(() => { s--; const c = document.getElementById('ocnt'); if (c) c.textContent = String(s); if (s <= 0) { closeModal(); go(); } }, 1000);
  },
  pop(txt: string, up: boolean) { const e = document.createElement('div'); e.className = 'cpop ' + (up ? 'up' : 'down'); e.textContent = txt; this.el.appendChild(e); setTimeout(() => e.remove(), 800); },
  lose() {
    this.state = 'lost'; haptic('err'); Score.bad();
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +20 людей', () => Ads.rewarded(() => { this.cont = true; this.n = 20; this.state = this.finish.position.z > 0 ? 'boss' : 'run'; this.fight = null; })]);
    b.push(['Спробувати знову', () => { Score.lose(); this.load(); }]);
    setTimeout(() => modal(`<h2>${t('Натовп розбито')}</h2><p class="muted">${t('Дивись на числа, а не лише на колір воріт: іноді вигідні ворота червоні. Обходь пастки.')}</p>`, b), 300);
  },
};
export default Crowd;
