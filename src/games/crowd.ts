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

const MAXV = 180, SPEED = 7, HALF = 2.7, GAP = .9, GW = HALF - GAP / 2;
type Op = { k: '+' | '-' | 'x' | '/'; v: number };
interface Pair { ops: [Op, Op]; o: THREE.Group; done?: boolean }
interface Horde { z: number; n: number; start: number; mesh: CrowdMesh; tag: THREE.Sprite; done?: boolean }
const apply = (n: number, o: Op) => Math.max(0, Math.round(o.k === '+' ? n + o.v : o.k === '-' ? n - o.v : o.k === 'x' ? n * o.v : n / o.v));
const label = (o: Op) => (o.k === '+' ? '+' : o.k === '-' ? '−' : o.k === 'x' ? '×' : '÷') + o.v;
const good = (o: Op) => o.k === '+' || o.k === 'x';
const spiral = (i: number, n = 1) => { const sc = Math.min(1, 1.05 / (.26 * Math.sqrt(Math.max(1, Math.min(n, MAXV))))), a = i * 2.39996, r = .26 * Math.sqrt(i) * sc; return [Math.cos(a) * r, Math.sin(a) * r * .85]; };
const SHIRTS = [0x2f7bff, 0x3d8bff, 0x2a6fe0, 0x4f9bff];

const Crowd: Game & Record<string, any> = {
  title: 'Натовп', theme: 'th-crowd',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '<div class="cnum"></div>';
    const st: Stage = this.st = new Stage(el, { fov: 50, shadows: true, clear: 0x9fd6ff });
    st.scene.fog = new THREE.Fog(0x9fd6ff, 28, 64);
    st.lights(new THREE.Vector3(-4, 14, 8), 9);
    const sc = st.scene;
    const track = mesh(new THREE.BoxGeometry(HALF * 2 + .5, .5, 500), mat(0xeee3cc, { roughness: .9 }), false); track.position.set(0, -.25, -240); sc.add(track);
    for (const x of [-HALF - .3, HALF + .3]) { const r = mesh(new RoundedBoxGeometry(.24, .4, 500, 2, .08), mat(0xff7ab2)); r.position.set(x, .15, -240); sc.add(r); }
    const dash = mat(0xffffff, { transparent: true, opacity: .6 }); for (let z = 4; z > -480; z -= 4) { const d = mesh(new THREE.BoxGeometry(.1, .01, 1.8), dash, false); d.position.set(0, .005, z); sc.add(d); this.dashes = (this.dashes || []).concat(d); }
    const water = mesh(new THREE.PlaneGeometry(300, 500).rotateX(-Math.PI / 2), mat(0x3d9be0, { roughness: .25, metalness: .1 }), false); water.position.set(0, -1.4, -240); sc.add(water);
    this.mine = new CrowdMesh(MAXV, sc, 'human'); for (let i = 0; i < MAXV; i++) this.mine.color(i, SHIRTS[i % 4]);
    st.onResize = () => { const c = st.camera, k = Math.max(1, 3.6 / (9 * Math.tan(c.fov * Math.PI / 360) * c.aspect)); c.position.set(0, 7 * k, 7.8 * k); c.lookAt(0, 0, -6); };
    st.resize();
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.load();
  },
  stop() { this.st?.dispose(); clearInterval(this.offerT); },
  load() {
    const sc = this.st.scene;
    for (const p of this.pairs || []) sc.remove(p.o); for (const h of this.hordes || []) { h.mesh.dispose(sc); sc.remove(h.tag); }
    if (this.finish) sc.remove(this.finish); if (this.boss) sc.remove(this.boss);
    const L = this.lvl = store.get('cr_lvl', 1);
    this.n = 10; this.x = 0; this.tx = 0; this.state = 'ready'; this.cont = false; this.fight = null; this.offered = false;
    this.pairs = [] as Pair[]; this.hordes = [] as Horde[];
    let z = -14, best = this.n, worst = this.n; const waves = 2 + Math.floor(L / 2);
    for (let w = 0; w < waves; w++) {
      const gates = 4 + R(4);
      for (let gi = 0; gi < gates; gi++) {
        const g: Op = Math.random() < .25 && best < 70 ? { k: 'x', v: 2 } : { k: '+', v: 5 + R(6) * 5 };
        const b: Op = Math.random() < .3 && worst > 12 ? { k: '/', v: 2 } : { k: '-', v: Math.max(2, Math.min(3 + R(5) * 3, Math.floor(worst * .6))) };
        if (Math.random() < .15) { b.k = '+'; b.v = Math.max(2, Math.round((g.k === '+' ? g.v : 10) / 3)); }
        const ops: [Op, Op] = Math.random() < .5 ? [g, b] : [b, g];
        best = Math.min(MAXV, Math.max(apply(best, ops[0]), apply(best, ops[1]))); worst = Math.min(apply(worst, ops[0]), apply(worst, ops[1]));
        this.pairs.push({ ops, o: this.gate(ops, z) }); z -= 11;
      }
      const n = Math.max(4, Math.round((best + worst) / 2) + 1);
      this.hordes.push(this.horde(n, z + 3)); z -= 14;
      best = Math.max(1, best - n); worst = Math.max(1, Math.min(best, worst - n + Math.round((best - worst) / 3)));
    }
    this.finishZ = z; this.bossHp = Math.max(8, Math.round(best * .6 + 6)); this.buildFinish(z);
    this.render(0); this.hud(); this.tip();
    setTools([['Заново', () => { Score.commit(); this.load(); }]]);
  },
  gate(ops: [Op, Op], z: number) {
    const g = new THREE.Group(), post = mat(0xffffff, { roughness: .4 });
    ops.forEach((o, i) => {
      const x = (i ? 1 : -1) * (GAP / 2 + GW / 2), col = good(o) ? '#2f9bff' : '#ff3d5a';
      const p = new THREE.Mesh(new THREE.PlaneGeometry(GW - .2, 1.6), new THREE.MeshBasicMaterial({ map: labelTexture(label(o), col), transparent: true, opacity: .82, side: THREE.DoubleSide }));
      p.position.set(x, 1.15, 0); g.add(p);
    });
    for (const x of [-HALF, -GAP / 2, GAP / 2, HALF]) { const m = mesh(new RoundedBoxGeometry(.16, 2.2, .16, 2, .05), post); m.position.set(x, 1.1, 0); g.add(m); }
    const wall = mesh(new RoundedBoxGeometry(GAP - .2, 1.2, .5, 2, .08), mat(0xff3d5a)); wall.position.set(0, .6, 0); g.add(wall);
    const stripe = mesh(new THREE.BoxGeometry(GAP - .18, .2, .52), mat(0xffffff)); stripe.position.set(0, .7, 0); g.add(stripe);
    g.position.z = z; this.st.scene.add(g); return g;
  },
  horde(n: number, z: number): Horde {
    const m = new CrowdMesh(Math.min(n, MAXV), this.st.scene, 'zombie');
    for (let i = 0; i < m.max; i++) m.color(i, [0x6b5b7a, 0x5a6b5a, 0x7a6b4f, 0x8a4a4a][i % 4]);
    const tag = numberSprite(String(n), '#3a8a3a', 1.3); this.st.scene.add(tag);
    const h: Horde = { z, n, start: n, mesh: m, tag }; this.poseHorde(h, 0); return h;
  },
  poseHorde(h: Horde, t: number) {
    const m = h.mesh; m.count = Math.min(h.n, m.max);
    for (let i = 0; i < m.count; i++) { const [x, z] = spiral(i); m.pose(i, Math.max(-HALF + .2, Math.min(HALF - .2, x)), Math.abs(Math.sin(t * 5 + i)) * .05, h.z - z, 0, .9); }
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
    for (let i = 0; i < n; i++) { const [x, z] = spiral(i, this.n); m.pose(i, Math.max(-HALF + .2, Math.min(HALF - .2, this.x + x)), run ? Math.abs(Math.sin(t * 12 + i * 1.7)) * .12 : 0, z + .8, Math.PI, .9, run ? -.18 : 0); }
    m.commit();
  },
  move(dz: number) {
    for (const p of this.pairs) { p.o.position.z += dz; p.o.visible = p.o.position.z < 14; }
    for (const h of this.hordes) h.z += dz;
    for (const d of this.dashes) { d.position.z += dz; if (d.position.z > 8) d.position.z -= 484; }
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
    this.render(this.t);
    const lab = this.el.querySelector('.cnum') as HTMLElement, v = new THREE.Vector3(this.x, 1.9, .5).project(this.st.camera);
    lab.textContent = String(this.n); lab.style.transform = `translate(${(v.x + 1) / 2 * this.el.clientWidth}px,${(1 - v.y) / 2 * this.el.clientHeight}px) translate(-50%,-50%)`;
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
    b.push(['Спробувати знову', () => { Score.commit(); this.load(); }]);
    setTimeout(() => modal(`<h2>${t('Натовп розбито')}</h2><p class="muted">${t('Обирай вигідніші ворота: вони сині, а ×2 найкращі, коли людей багато.')}</p>`, b), 300);
  },
};
export default Crowd;
