// Gate defense (3D): two lanes. Left lane: zombies and survivors walk at you. Right lane: weapon gates.
// You fire automatically; drag left/right to choose the lane. Shoot a weapon gate down to its 0 → better gun
// (pistol → SMG → assault rifle → shotgun → minigun → laser). Survivors that reach you join and shoot too
// (but your bullets hit them on the way!). Every 40 s a boss. Zombies that reach the line cost a heart.
import './defense.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, hearts, toast } from '../core/ui';
import { gameOver } from '../core/flow';
import { Stage, THREE, RoundedBoxGeometry, mat, mesh } from '../core/three';
import { person, animate, labelTexture, type Person } from '../art/people3d';
import { car3d } from '../art/car3d';
import { Score } from '../core/score';
import type { Game } from './registry';

const WEAPONS = [
  { n: 'Пістолет', rate: 3, dmg: 1, shots: 1, spread: 0, col: 0xffe27a },
  { n: 'Пістолет-кулемет', rate: 8, dmg: 1, shots: 1, spread: .04, col: 0xffe27a },
  { n: 'Автомат', rate: 8, dmg: 2, shots: 1, spread: .02, col: 0xffc04a },
  { n: 'Дробовик', rate: 3, dmg: 2, shots: 5, spread: .12, col: 0xffa04a },
  { n: 'Мініган', rate: 20, dmg: 2, shots: 1, spread: .05, col: 0xff8a3a },
  { n: 'Лазер', rate: 10, dmg: 6, shots: 1, spread: 0, col: 0x6af0ff },
];
const GATE_HP = [25, 70, 160, 300, 600];
const XMIN = -2.4, XMAX = 2.4, FAR = -30;
interface Ent { o: Person; hp: number; max: number; kind: 'zombie' | 'human' | 'boss'; speed: number }
interface Gate { o: THREE.Group; hp: number; tier: number; panel: THREE.Mesh }
interface Bullet { m: THREE.Mesh; x: number; z: number; vx: number; dmg: number }

const Defense: Game & Record<string, any> = {
  title: 'Оборона', theme: 'th-defense',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = ''; this.best = store.get('df_best', 0);
    const st: Stage = this.st = new Stage(el, { fov: 50, shadows: true, clear: 0x9fb3a0 });
    st.scene.fog = new THREE.Fog(0x9fb3a0, 16, 38);
    st.lights(new THREE.Vector3(-3, 12, 6), 10);
    // road, lanes, median barrier, roadside wrecks
    const road = mesh(new THREE.PlaneGeometry(6.2, 100).rotateX(-Math.PI / 2), mat(0x4a4f57, { roughness: .95 }), false); road.position.z = -35; st.scene.add(road);
    const grass = mesh(new THREE.PlaneGeometry(60, 100).rotateX(-Math.PI / 2), mat(0x6f8f5a, { roughness: 1 }), false); grass.position.set(0, -.01, -35); st.scene.add(grass);
    const rightLane = mesh(new THREE.PlaneGeometry(2.9, 100).rotateX(-Math.PI / 2), mat(0x3d5a8a, { roughness: .9, transparent: true, opacity: .35 }), false); rightLane.position.set(1.55, .005, -35); st.scene.add(rightLane);
    const stripeA = mat(0xffd23f), stripeB = mat(0x1b1b1f);
    for (let z = 2; z > -70; z -= .8) { const b = mesh(new RoundedBoxGeometry(.25, .3, .78, 2, .05), (Math.round(z / .8) % 2) ? stripeA : stripeB); b.position.set(0, .15, z); st.scene.add(b); }
    for (let k = 0; k < 10; k++) { const c = car3d(2, pick(['#6b6b70', '#8a5a2b', '#5a6b7a', '#7a3a3a'])); c.position.set((Math.random() < .5 ? -1 : 1) * (4.2 + Math.random() * 3), 0, -k * 7 - 3); c.rotation.y = Math.random() * 3; c.rotation.z = Math.random() < .3 ? .3 : 0; st.scene.add(c); }
    const line = mesh(new THREE.BoxGeometry(6.2, .02, .12), mat(0xff3d3d, { emissive: 0xff2020, emissiveIntensity: .5 }), false); line.position.set(0, .02, .7); st.scene.add(line);
    st.onResize = () => { const c = st.camera, k = Math.max(1, 3.1 / (7.5 * Math.tan(c.fov * Math.PI / 360) * c.aspect)); c.position.set(0, 5.2 * k, 5.4 * k); c.lookAt(0, .4, -8); }; st.resize();
    this.bulletGeo = new THREE.CapsuleGeometry(.05, .3, 2, 6).rotateX(Math.PI / 2);
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.reset(); this.state = 'ready';
    setTools([['Нова гра', () => { this.reset(); this.state = 'ready'; }]]);
  },
  stop() { this.st?.dispose(); },
  reset() {
    const sc = this.st.scene;
    for (const e of this.ents || []) sc.remove(e.o); for (const g of this.gates || []) sc.remove(g.o); for (const b of this.bullets || []) sc.remove(b.m); for (const a of this.allies || []) sc.remove(a);
    if (this.player) sc.remove(this.player);
    this.ents = [] as Ent[]; this.gates = [] as Gate[]; this.bullets = [] as Bullet[]; this.allies = [] as Person[];
    this.x = -1.4; this.tx = -1.4; this.wpn = 0; this.cool = 0; this.t = 0; this.spawnT = 1; this.gateT = 2; this.bossT = 40; this.kills = 0; this.hp = 3; this.cont = false; this.bosses = 0;
    this.player = person('soldier', 0x5f7a3a); this.player.position.set(this.x, 0, 0); this.player.rotation.y = 0; sc.add(this.player);
    this.tip(); this.hud();
  },
  tip() { this.el.querySelector('.rtip')?.remove(); const t = document.createElement('div'); t.className = 'rtip'; t.innerHTML = '<b>Торкнись, щоб почати</b><br>веди пальцем вліво/вправо<br>ліворуч зомбі, праворуч ворота зброї'; this.el.appendChild(t); },
  hud() { setStats(`${pill('Вбито ' + this.kills)}${pill(WEAPONS[this.wpn].n)}${hearts(this.hp)}`); },
  bind() {
    const el = this.el; let down = false;
    const toX = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return XMIN + (e.clientX - r.left) / r.width * (XMAX - XMIN); };
    el.onpointerdown = (e: PointerEvent) => { down = true; if (this.state === 'ready') { this.state = 'run'; el.querySelector('.rtip')?.remove(); } this.tx = toX(e); };
    el.onpointermove = (e: PointerEvent) => { if (down) this.tx = toX(e); };
    el.onpointerup = () => { down = false; };
  },
  spawnEnemy(kind: 'zombie' | 'human' | 'boss') {
    const shirt = kind === 'human' ? pick([0x2f9bff, 0xff8a1f, 0xffd23f, 0xff7ab2]) : pick([0x6b5b7a, 0x7a6b4f, 0x5a6b5a, 0x8a4a4a]);
    const o = person(kind, shirt); o.rotation.y = 0;
    const lvl = 1 + this.t / 35, hp = kind === 'boss' ? Math.round(90 * (1 + this.bosses * .9)) : kind === 'human' ? 1 : Math.round(1 + lvl * (Math.random() < .2 ? 3 : 1));
    o.position.set(-2.4 + Math.random() * 1.9, 0, FAR); this.st.scene.add(o);
    this.ents.push({ o, hp, max: hp, kind, speed: kind === 'boss' ? .9 : kind === 'human' ? 2.3 : 1.5 + Math.random() * .8 + this.t * .004 });
  },
  spawnGate() {
    if (this.wpn >= WEAPONS.length - 1) return;
    const tier = this.wpn, g = new THREE.Group(), hp = GATE_HP[tier];
    const frame = mat(0x2b2f36, { roughness: .5 });
    for (const x of [-1.05, 1.05]) { const p = mesh(new THREE.BoxGeometry(.14, 1.9, .14), frame); p.position.set(x, .95, 0); g.add(p); }
    const top = mesh(new THREE.BoxGeometry(2.24, .14, .14), frame); top.position.y = 1.9; g.add(top);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.24), new THREE.MeshBasicMaterial({ map: labelTexture(String(hp), '#2f7bff', WEAPONS[tier + 1].n), transparent: true, opacity: .92, side: THREE.DoubleSide }));
    panel.position.y = 1.1; g.add(panel);
    g.position.set(1.55, 0, FAR); this.st.scene.add(g);
    this.gates.push({ o: g, hp, tier, panel });
  },
  fire() {
    const w = WEAPONS[this.wpn], shooters = [this.player, ...this.allies];
    if (!this.bmat || this.bmatW !== this.wpn) { this.bmat = mat(w.col, { emissive: w.col, emissiveIntensity: 1.2 }); this.bmatW = this.wpn; }
    shooters.forEach((s: Person, i: number) => {
      if (i > 0 && Math.random() < .45) return;                 // allies fire a bit slower
      for (let k = 0; k < w.shots; k++) {
        const m = new THREE.Mesh(this.bulletGeo, this.bmat), x = s.position.x + .05, vx = (Math.random() - .5) * 2 * w.spread + (w.shots > 1 ? (k - (w.shots - 1) / 2) * w.spread : 0);
        m.position.set(x, 1.1, s.position.z - .5); this.st.scene.add(m);
        this.bullets.push({ m, x, z: s.position.z - .5, vx: vx * 30, dmg: w.dmg });
      }
    });
  },
  frame(dt: number) {
    const run = this.state === 'run';
    this.x += (this.tx - this.x) * Math.min(1, dt * 12); this.x = Math.max(XMIN, Math.min(XMAX, this.x));
    this.player.position.x = this.x;
    this.allies.forEach((a: Person, i: number) => { const tx = this.x + ((i % 2) ? 1 : -1) * (.5 + Math.floor(i / 2) * .45), tz = .55 + Math.floor(i / 2) * .35; a.position.x += (Math.max(XMIN, Math.min(XMAX, tx)) - a.position.x) * Math.min(1, dt * 8); a.position.z = tz; });
    if (!run) return;
    this.t += dt;
    // spawns
    if ((this.spawnT -= dt) <= 0) { this.spawnEnemy(Math.random() < .22 ? 'human' : 'zombie'); this.spawnT = Math.max(.35, 1.6 - this.t * .012) * (.6 + Math.random() * .8); }
    if ((this.gateT -= dt) <= 0) { this.spawnGate(); this.gateT = 9; }
    if ((this.bossT -= dt) <= 0) { this.spawnEnemy('boss'); this.bossT = 40; toast('Бос!'); haptic('err'); }
    // shooting
    if ((this.cool -= dt) <= 0) { this.fire(); this.cool = 1 / WEAPONS[this.wpn].rate; }
    // move entities
    for (const e of this.ents) { e.o.position.z += e.speed * dt; animate(e.o, dt, e.speed * .6); }
    for (const g of this.gates) g.o.position.z += 1.6 * dt;
    // bullets
    for (const b of this.bullets) {
      b.z -= 30 * dt; b.x += b.vx * dt; b.m.position.set(b.x, 1.1, b.z);
      for (const e of this.ents) {
        const r = e.kind === 'boss' ? .9 : .38;
        if (e.hp > 0 && Math.abs(e.o.position.x - b.x) < r && Math.abs(e.o.position.z - b.z) < .5) { e.hp -= b.dmg; b.z = -99; this.hitFx(e); break; }
      }
      if (b.z > -98) for (const g of this.gates) {
        if (g.hp > 0 && Math.abs(g.o.position.x - b.x) < 1.05 && Math.abs(g.o.position.z - b.z) < .3) { g.hp = Math.max(0, g.hp - b.dmg); b.z = -99; this.gateHit(g); break; }
      }
    }
    for (const b of this.bullets.filter((b: Bullet) => b.z < FAR - 2)) this.st.scene.remove(b.m);
    this.bullets = this.bullets.filter((b: Bullet) => b.z >= FAR - 2);
    // deaths and arrivals
    for (const e of this.ents) {
      if (e.hp <= 0 && !(e as any).dead) {
        (e as any).dead = true; const o = e.o;
        if (e.kind === 'human') { toast('Ой! Це був вцілілий'); Score.bad(); }
        else { this.kills += e.kind === 'boss' ? 50 : 1; Score.good(e.kind === 'boss' ? 100 : 3); if (e.kind === 'boss') { this.bosses++; toast('Боса знищено!'); haptic('ok'); } }
        this.st.tween(350, k => { o.rotation.x = -k * 1.5; o.position.y = -k * .3; }).then(() => this.st.scene.remove(o));
      }
      if (!(e as any).dead && e.o.position.z > -.3) {
        (e as any).dead = true; this.st.scene.remove(e.o);
        if (e.kind === 'human') { if (this.allies.length < 8) { const a = person('soldier', 0x2f9bff); a.position.set(e.o.position.x, 0, .6); this.st.scene.add(a); this.allies.push(a); toast('+1 боєць'); haptic('ok'); } }
        else { this.hp -= e.kind === 'boss' ? 3 : 1; haptic('err'); this.flashRed(); if (this.hp <= 0) return this.over(); }
      }
    }
    this.ents = this.ents.filter((e: any) => !e.dead || e.o.parent);
    for (const g of this.gates.filter((g: Gate) => g.o.position.z > 2)) this.st.scene.remove(g.o);
    this.gates = this.gates.filter((g: Gate) => g.o.position.z <= 2);
    if ((this.hudT = (this.hudT || 0) + dt) > .25) { this.hudT = 0; this.hud(); }
  },
  hitFx(e: Ent) { const t = e.o.children[0] as THREE.Mesh, m = t.material as THREE.MeshStandardMaterial; m.emissive?.setRGB(.6, .1, .1); setTimeout(() => m.emissive?.setRGB(0, 0, 0), 60); },
  gateHit(g: Gate) {
    const m = g.panel.material as THREE.MeshBasicMaterial;
    if (g.hp > 0) { if (g.hp % Math.max(1, Math.round(GATE_HP[g.tier] / 40)) === 0 || g.hp < 10) { m.map?.dispose(); m.map = labelTexture(String(g.hp), '#2f7bff', WEAPONS[g.tier + 1].n); } return; }
    m.map?.dispose(); m.map = labelTexture('✓', '#2fbf71', WEAPONS[g.tier + 1].n);
    if (g.tier === this.wpn) { this.wpn++; this.hud(); haptic('ok'); toast('Нова зброя: ' + WEAPONS[this.wpn].n); }
    const o = g.o; this.st.tween(400, k => o.scale.setScalar(1 + Math.sin(k * Math.PI) * .15));
  },
  flashRed() { this.el.classList.remove('hurt'); void this.el.offsetWidth; this.el.classList.add('hurt'); },
  over() {
    this.state = 'over';
    if (this.kills > this.best) { this.best = this.kills; store.set('df_best', this.best); }
    const revive = () => { this.cont = true; this.hp = 2; for (const e of this.ents) this.st.scene.remove(e.o); this.ents = []; this.state = 'run'; this.hud(); };
    gameOver('Оборону прорвано', `<p>Вбито: <b>${this.kills}</b> · рекорд ${this.best}</p><p class="muted">Зброя: ${WEAPONS[this.wpn].n}</p>`, this.cont ? null : revive, () => { this.reset(); this.state = 'ready'; });
  },
};
export default Defense;
