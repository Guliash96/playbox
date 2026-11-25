// Gate defense (3D, 3 lanes). Middle: zombies walk at you. Right: weapon gates — shoot them down and a golden
// gun drops; run into it to catch it (pistol → SMG → rifle → shotgun → minigun → laser). Left: cages with
// 3–5 survivors — shoot them open and the survivors join your squad. A boss comes every 45 s.
import './defense.css';
import { pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, pill, hearts, toast } from '../core/ui';
import { gameOver } from '../core/flow';
import { Score } from '../core/score';
import { sfx } from '../core/sfx';
import { t } from '../core/i18n';
import { Stage, THREE, RoundedBoxGeometry, mat, mesh, ease } from '../core/three';
import { person, animate, setGun, gunMesh, labelTexture, numberSprite, setSpriteText, poof, type Person } from '../art/people3d';
import { car3d } from '../art/car3d';
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
const LANE = 2.2, XMIN = -2.8, XMAX = 2.8, FAR = -26, WORLD = 1.8;
interface Ent { o: Person; hp: number; kind: 'zombie' | 'boss'; speed: number; dead?: boolean; tag?: THREE.Sprite }
interface Cage { o: THREE.Group; hp: number; n: number; tag: THREE.Sprite; people: Person[] }
interface Gate { o: THREE.Group; hp: number; tier: number; tag: THREE.Sprite }
interface Drop { o: THREE.Group; tier: number }
interface Bullet { m: THREE.Mesh; x: number; z: number; vx: number; dmg: number }

const gold = new THREE.MeshStandardMaterial({ color: 0xffc533, metalness: .9, roughness: .2, emissive: 0xffa000, emissiveIntensity: .7 });

const Defense: Game & Record<string, any> = {
  title: 'Оборона', theme: 'th-defense',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = ''; this.best = store.get('df_best', 0);
    const st: Stage = this.st = new Stage(el, { fov: 48, shadows: true, clear: 0xb7c7b0 });
    st.scene.fog = new THREE.Fog(0xb7c7b0, 26, 52);
    st.lights(new THREE.Vector3(-4, 14, 8), 12);
    const sc = st.scene;
    const road = mesh(new THREE.PlaneGeometry(7.4, 110).rotateX(-Math.PI / 2), mat(0x50555e, { roughness: .95 }), false); road.position.z = -40; sc.add(road);
    const grass = mesh(new THREE.PlaneGeometry(80, 110).rotateX(-Math.PI / 2), mat(0x7a9a5f, { roughness: 1 }), false); grass.position.set(0, -.02, -40); sc.add(grass);
    const tint = (x: number, c: number) => { const p = mesh(new THREE.PlaneGeometry(LANE - .3, 110).rotateX(-Math.PI / 2), mat(c, { transparent: true, opacity: .28, roughness: 1 }), false); p.position.set(x, .006, -40); sc.add(p); };
    tint(-LANE, 0x3fbf5f); tint(LANE, 0x3d8bff); tint(0, 0xd9443a);
    const wall = mat(0xcfd2d6, { roughness: .8 }), stripe = mat(0xffc533);
    for (const x of [-LANE / 2, LANE / 2]) for (let z = 2; z > -75; z -= 2.2) { const b = mesh(new RoundedBoxGeometry(.22, .34, 2, 2, .06), wall); b.position.set(x, .17, z); sc.add(b); const s = mesh(new THREE.BoxGeometry(.23, .06, .6), stripe, false); s.position.set(x, .3, z); sc.add(s); }
    for (let k = 0; k < 14; k++) { const c = car3d(2, pick(['#6b6b70', '#8a5a2b', '#5a6b7a', '#7a3a3a', '#c9b79c'])); c.position.set((k % 2 ? -1 : 1) * (5.2 + Math.random() * 3), 0, -k * 5.5 - 2); c.rotation.y = Math.random() * 3; sc.add(c); }
    for (let k = 0; k < 10; k++) { const tr = new THREE.Group(); const tk = mesh(new THREE.CylinderGeometry(.12, .16, .8, 6), mat(0x6b4429)); tk.position.y = .4; tr.add(tk); for (let j = 0; j < 3; j++) { const b = mesh(new THREE.IcosahedronGeometry(.55 - j * .1, 1), mat(0x4f8a46, { roughness: .9 })); b.position.set((Math.random() - .5) * .3, 1 + j * .4, 0); tr.add(b); } tr.position.set((k % 2 ? -1 : 1) * (9 + Math.random() * 4), 0, -k * 7); sc.add(tr); }
    const line = mesh(new THREE.BoxGeometry(7.4, .03, .14), mat(0xff3d3d, { emissive: 0xff2020, emissiveIntensity: .6 }), false); line.position.set(0, .02, .8); sc.add(line);
    this.bulletGeo = new THREE.CapsuleGeometry(.05, .32, 2, 6).rotateX(Math.PI / 2);
    st.onResize = () => { const c = st.camera, k = Math.max(1, 3.9 / (7.6 * Math.tan(c.fov * Math.PI / 360) * c.aspect)); c.position.set(0, 5 * k, 5.8 * k); c.lookAt(0, .4, -6); };
    st.resize();
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.reset(); this.state = 'ready';
    setTools([['Нова гра', () => { Score.commit(); this.reset(); this.state = 'ready'; }]]);
  },
  stop() { this.st?.dispose(); },
  reset() {
    const sc = this.st.scene;
    for (const a of [this.ents, this.cages, this.gates, this.drops]) for (const e of a || []) sc.remove(e.o);
    for (const b of this.bullets || []) sc.remove(b.m); for (const a of this.allies || []) sc.remove(a); if (this.player) sc.remove(this.player);
    this.ents = []; this.cages = []; this.gates = []; this.drops = []; this.bullets = []; this.allies = [];
    this.x = 0; this.tx = 0; this.wpn = 0; this.cool = 0; this.t = 0; this.spawnT = 1.2; this.gateT = 3; this.cageT = 7; this.bossT = 45; this.kills = 0; this.hp = 3; this.cont = false; this.bosses = 0;
    this.player = person('soldier', 0x5f7a3a); this.player.scale.setScalar(1.25); this.player.rotation.y = Math.PI; sc.add(this.player);
    this.tip(); this.hud();
  },
  tip() { this.el.querySelector('.rtip')?.remove(); const e = document.createElement('div'); e.className = 'rtip'; e.innerHTML = `<b>${t('Торкнись, щоб почати')}</b><br>${t('веди пальцем вліво/вправо')}<br>${t('ліворуч клітки з людьми, посередині зомбі, праворуч зброя')}`; this.el.appendChild(e); },
  hud() { setStats(`${pill('Вбито ' + this.kills)}${pill(t(WEAPONS[this.wpn].n))}${hearts(this.hp)}`); },
  bind() {
    const el = this.el; let down = false;
    const toX = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return XMIN + (e.clientX - r.left) / r.width * (XMAX - XMIN); };
    el.onpointerdown = (e: PointerEvent) => { down = true; if (this.state === 'ready') { this.state = 'run'; el.querySelector('.rtip')?.remove(); } this.tx = toX(e); };
    el.onpointermove = (e: PointerEvent) => { if (down) this.tx = toX(e); };
    el.onpointerup = () => { down = false; };
  },
  // ---------- spawns ----------
  spawnZombie(boss = false) {
    const o = person(boss ? 'boss' : 'zombie', pick([0x6b5b7a, 0x7a6b4f, 0x5a6b5a, 0x8a4a4a, 0x4a5a7a]));
    const lvl = 1 + this.t / 35, hp = boss ? Math.round(90 * (1 + this.bosses * .9)) : Math.max(1, Math.round((lvl - .4) * (Math.random() < .2 ? 2.5 : 1)));
    if (!boss) o.scale.setScalar(1.2); o.position.set((Math.random() - .5) * 1.4, 0, FAR); this.st.scene.add(o);
    const e: Ent = { o, hp, kind: boss ? 'boss' : 'zombie', speed: boss ? .9 : 1.7 + Math.random() * .7 + this.t * .004 };
    if (boss) { e.tag = numberSprite(String(hp), '#d81b4a', .7); e.tag.position.y = 1.9; o.add(e.tag); toast(t('Бос!')); haptic('err'); }
    this.ents.push(e);
  },
  spawnCage() {
    const g = new THREE.Group(), n = 3 + Math.floor(Math.random() * 3), hp = Math.round(12 + this.t * .5 + n * 4);
    const bar = mat(0x6b6f78, { metalness: .6, roughness: .4 });
    const base = mesh(new RoundedBoxGeometry(1.9, .12, 1.5, 2, .04), mat(0x5a3a22)); base.position.y = .06; g.add(base);
    const roof = mesh(new RoundedBoxGeometry(1.9, .1, 1.5, 2, .04), mat(0x5a3a22)); roof.position.y = 1.75; g.add(roof);
    for (let i = 0; i < 9; i++) { const b = mesh(new THREE.CylinderGeometry(.03, .03, 1.65, 6), bar); const a = i / 9; b.position.set(-.9 + a * 1.8 + .1, .9, .72); g.add(b); }
    for (const x of [-.92, .92]) for (let i = 0; i < 4; i++) { const b = mesh(new THREE.CylinderGeometry(.03, .03, 1.65, 6), bar); b.position.set(x, .9, -.6 + i * .4); g.add(b); }
    const people: Person[] = [];
    for (let i = 0; i < n; i++) { const p = person('human', pick([0x2f9bff, 0xff8a1f, 0xffd23f, 0xff7ab2, 0x3fbf5f])); p.scale.setScalar(.82); p.position.set(-.6 + (i % 3) * .6, .1, -.2 + Math.floor(i / 3) * .45); p.userData.arms.forEach((a: any) => a.rotation.z = Math.PI * .85 * (a.position.x > 0 ? -1 : 1)); g.add(p); people.push(p); }
    const tag = numberSprite(String(hp), '#2fbf71', 1.1); tag.position.y = 2.25; g.add(tag);
    g.position.set(-LANE, 0, FAR); this.st.scene.add(g); this.cages.push({ o: g, hp, n, tag, people });
  },
  spawnGate() {
    const tier = Math.max(this.wpn, ...this.gates.map((g: Gate) => g.tier + 1), ...this.drops.map((d: Drop) => d.tier));
    if (tier >= WEAPONS.length - 1) return;
    const g = new THREE.Group(), hp = GATE_HP[tier], frame = mat(0x2b2f36, { roughness: .5 });
    for (const x of [-1.05, 1.05]) { const p = mesh(new RoundedBoxGeometry(.18, 2, .18, 2, .05), frame); p.position.set(x, 1, 0); g.add(p); }
    const top = mesh(new RoundedBoxGeometry(2.3, .2, .2, 2, .05), frame); top.position.y = 2; g.add(top);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 1.2), new THREE.MeshBasicMaterial({ map: labelTexture(t(WEAPONS[tier + 1].n), '#2f7bff'), transparent: true, opacity: .9, side: THREE.DoubleSide }));
    panel.position.y = 1.15; g.add(panel);
    const preview = gunMesh(tier + 1, gold); preview.scale.setScalar(1.3); preview.position.set(0, 2.45, 0); preview.rotation.y = Math.PI / 2; g.add(preview);
    const tag = numberSprite(String(hp), '#2f7bff', 1.1); tag.position.y = 3; g.add(tag);
    g.position.set(LANE, 0, FAR); this.st.scene.add(g); this.gates.push({ o: g, hp, tier, tag });
  },
  drop(tier: number, z: number) {
    const g = new THREE.Group(), gun = gunMesh(tier, gold); gun.scale.setScalar(2.2); gun.position.y = 1.1; g.add(gun);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, 5, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 2.5; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.6, .8, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .7 })); ring.position.y = .03; g.add(ring);
    g.position.set(LANE, 0, z); this.st.scene.add(g); this.drops.push({ o: g, tier });
    toast(t('Лови зброю: {0}!', t(WEAPONS[tier].n)));
  },
  flash(s: Person) {
    if (!this.mf) { this.mf = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffe27a, transparent: true, opacity: .9, depthWrite: false })); this.mf.scale.set(.45, .45, 1); this.st.scene.add(this.mf); }
    const p = new THREE.Vector3(); (s.getObjectByName('gun') || s).getWorldPosition(p); this.mf.position.set(p.x, p.y + .05, p.z - .9); this.mf.visible = true; clearTimeout(this.mft); this.mft = setTimeout(() => { if (this.mf) this.mf.visible = false; }, 45);
  },
  fire() {
    const w = WEAPONS[this.wpn], shooters = [this.player, ...this.allies];
    if (!this.bmat || this.bmatW !== this.wpn) { this.bmat = new THREE.MeshBasicMaterial({ color: w.col }); this.bmatW = this.wpn; }
    this.flash(this.player); sfx('shoot');
    shooters.forEach((s: Person, i: number) => {
      if (i > 0 && Math.random() < .45) return;
      for (let k = 0; k < w.shots; k++) {
        const x = s.position.x, aim = this.aim(x, s.position.z), m = new THREE.Mesh(this.bulletGeo, this.bmat), vx = aim + (Math.random() - .5) * 2 * w.spread + (w.shots > 1 ? (k - (w.shots - 1) / 2) * w.spread : 0);
        m.position.set(x, .95, s.position.z - .6); this.st.scene.add(m); this.bullets.push({ m, x, z: s.position.z - .6, vx: vx * 30, dmg: w.dmg });
      }
    });
  },
  /** gentle aim assist towards the nearest target in the lane you are standing in */
  aim(x: number, z: number) {
    const lane = Math.round(x / LANE), lx = lane * LANE;
    const targets = lane === 0 ? this.ents.filter((e: Ent) => !e.dead).map((e: Ent) => e.o.position) : lane < 0 ? this.cages.filter((c: Cage) => c.hp > 0).map((c: Cage) => c.o.position) : this.gates.filter((g: Gate) => g.hp > 0).map((g: Gate) => g.o.position);
    const tg = targets.filter((p: THREE.Vector3) => Math.abs(p.x - lx) < 1.3 && p.z < z).sort((a: THREE.Vector3, b: THREE.Vector3) => b.z - a.z)[0];
    return tg ? (tg.x - x) / Math.max(1, (z - tg.z) / 30) / 30 : 0;
  },
  // ---------- frame ----------
  frame(dt: number) {
    const run = this.state === 'run', sc = this.st.scene;
    this.x += (this.tx - this.x) * Math.min(1, dt * 12); this.x = Math.max(XMIN, Math.min(XMAX, this.x));
    const moving = Math.abs(this.tx - this.x) > .06; this.player.position.x = this.x; if (moving) animate(this.player, dt, 1); else { this.player.userData.legs.forEach((l: any) => l.rotation.x *= .8); this.player.position.y = 0; }
    this.allies.forEach((a: Person, i: number) => { const row = Math.floor(i / 2), tx = this.x + ((i % 2) ? 1 : -1) * (.55 + row * .35); a.position.x += (Math.max(XMIN, Math.min(XMAX, tx)) - a.position.x) * Math.min(1, dt * 8); a.position.z += ((.5 + row * .45) - a.position.z) * Math.min(1, dt * 4); });
    for (const d of this.drops) d.o.children[0].rotation.y += dt * 2.5;
    if (!run) return;
    this.t += dt;
    if ((this.spawnT -= dt) <= 0) { this.spawnZombie(); this.spawnT = Math.max(.4, 1.5 - this.t * .012) * (.6 + Math.random() * .8); }
    if ((this.gateT -= dt) <= 0) { this.spawnGate(); this.gateT = 12; }
    if ((this.cageT -= dt) <= 0) { this.spawnCage(); this.cageT = 13 + Math.random() * 4; }
    if ((this.bossT -= dt) <= 0) { this.spawnZombie(true); this.bossT = 45; }
    if ((this.cool -= dt) <= 0) { this.fire(); this.cool = 1 / WEAPONS[this.wpn].rate; }
    for (const e of this.ents) if (!e.dead) { e.o.position.z += e.speed * dt; animate(e.o, dt, e.speed * .5); }
    for (const c of this.cages) { c.o.position.z += WORLD * dt; c.people.forEach((p, i) => p.position.y = .1 + Math.abs(Math.sin(this.t * 6 + i)) * .08); }
    for (const g of this.gates) g.o.position.z += WORLD * dt;
    for (const d of this.drops) d.o.position.z += 2.6 * dt;
    // bullets
    for (const b of this.bullets) {
      b.z -= 30 * dt; b.x += b.vx * dt; b.m.position.set(b.x, .95, b.z);
      let hit = false;
      for (const e of this.ents) { const r = e.kind === 'boss' ? .9 : .4; if (!e.dead && Math.abs(e.o.position.x - b.x) < r && Math.abs(e.o.position.z - b.z) < .5) { e.hp -= b.dmg; this.flashBody(e.o); if (e.tag) setSpriteText(e.tag, String(Math.max(0, e.hp)), '#d81b4a'); hit = true; break; } }
      if (!hit) for (const c of this.cages) if (c.hp > 0 && Math.abs(c.o.position.x - b.x) < 1 && Math.abs(c.o.position.z - b.z) < .8) { c.hp = Math.max(0, c.hp - b.dmg); setSpriteText(c.tag, String(c.hp), '#2fbf71'); hit = true; if (!c.hp) this.freeCage(c); break; }
      if (!hit) for (const g of this.gates) if (g.hp > 0 && Math.abs(g.o.position.x - b.x) < 1.1 && Math.abs(g.o.position.z - b.z) < .3) { g.hp = Math.max(0, g.hp - b.dmg); setSpriteText(g.tag, String(g.hp), '#2f7bff'); hit = true; if (!g.hp) this.openGate(g); break; }
      if (hit) b.z = -99;
    }
    for (const b of this.bullets.filter((b: Bullet) => b.z < FAR - 2)) sc.remove(b.m);
    this.bullets = this.bullets.filter((b: Bullet) => b.z >= FAR - 2);
    // deaths / arrivals
    for (const e of this.ents) {
      if (!e.dead && e.hp <= 0) {
        e.dead = true; this.kills += e.kind === 'boss' ? 50 : 1; Score.good(e.kind === 'boss' ? 100 : 3);
        if (e.kind === 'boss') { this.bosses++; toast(t('Боса знищено!')); haptic('ok'); }
        const o = e.o; poof(sc, this.st, o.position.x, .8, o.position.z, 0x8fbf6a, e.kind === 'boss' ? 14 : 5);
        this.st.tween(320, k => { o.rotation.x = -k * 1.5; o.position.y = -k * .4; }).then(() => sc.remove(o));
      } else if (!e.dead && e.o.position.z > -.2) {
        e.dead = true; sc.remove(e.o); this.hp -= e.kind === 'boss' ? 3 : 1; haptic('err'); Score.bad(); this.flashRed();
        if (this.hp <= 0) return this.over();
      }
    }
    this.ents = this.ents.filter((e: Ent) => !e.dead || e.o.parent);
    for (const c of this.cages.filter((c: Cage) => c.o.position.z > 1.5)) sc.remove(c.o);
    this.cages = this.cages.filter((c: Cage) => c.o.position.z <= 1.5);
    for (const g of this.gates.filter((g: Gate) => g.o.position.z > 1.5)) sc.remove(g.o);
    this.gates = this.gates.filter((g: Gate) => g.o.position.z <= 1.5);
    for (const d of [...this.drops]) {
      if (d.o.position.z > -.4 && Math.abs(this.x - d.o.position.x) < 1.1) this.catchGun(d);
      else if (d.o.position.z > 1.6) { sc.remove(d.o); this.drops.splice(this.drops.indexOf(d), 1); toast(t('Зброю пропущено')); Score.bad(); }
    }
    if ((this.hudT = (this.hudT || 0) + dt) > .25) { this.hudT = 0; this.hud(); }
  },
  flashBody(o: Person) { const m = o.userData.body.material as THREE.MeshStandardMaterial; const old = m; const f = old.clone(); f.emissive.setRGB(.8, .15, .15); o.userData.body.material = f; setTimeout(() => { o.userData.body.material = old; f.dispose(); }, 60); },
  freeCage(c: Cage) {
    const sc = this.st.scene; haptic('ok'); Score.good(20); poof(sc, this.st, c.o.position.x, 1, c.o.position.z, 0xcfd2d6, 10, .16);
    c.o.remove(c.tag);
    c.o.children.filter(ch => !(ch as any).userData?.kind).forEach(ch => c.o.remove(ch));
    c.people.forEach((p, i) => {
      const wp = new THREE.Vector3(); p.getWorldPosition(wp); c.o.remove(p); p.scale.setScalar(1); p.position.copy(wp); p.position.y = 0; sc.add(p);
      const from = p.position.clone();
      this.st.tween(900 + i * 120, k => { const tx = this.x, tz = .6; p.position.set(from.x + (tx - from.x) * ease.inOut(k), Math.abs(Math.sin(k * 20)) * .1, from.z + (tz - from.z) * ease.inOut(k)); animate(p, .016, 1.4); }).then(() => {
        sc.remove(p);
        if (this.allies.length < 10) { const a = person('soldier', pick([0x2f9bff, 0xff8a1f, 0x3fbf5f])); a.scale.setScalar(1.1); setGun(a, this.wpn); a.rotation.y = Math.PI; a.position.copy(p.position); sc.add(a); this.allies.push(a); }
      });
    });
    toast(t('+{0} бійців', c.n));
  },
  openGate(g: Gate) {
    const sc = this.st.scene; haptic('ok'); poof(sc, this.st, g.o.position.x, 1.2, g.o.position.z, 0x7fd1ff, 12, .15);
    sc.remove(g.o); this.gates.splice(this.gates.indexOf(g), 1); this.drop(g.tier + 1, g.o.position.z);
  },
  catchGun(d: Drop) {
    this.st.scene.remove(d.o); this.drops.splice(this.drops.indexOf(d), 1);
    if (d.tier > this.wpn) { this.wpn = d.tier; setGun(this.player, this.wpn); this.allies.forEach((a: Person) => setGun(a, this.wpn)); }
    haptic('ok'); Score.good(30); toast(t('Нова зброя: {0}', t(WEAPONS[this.wpn].n))); this.hud();
  },
  flashRed() { this.el.classList.remove('hurt'); void this.el.offsetWidth; this.el.classList.add('hurt'); },
  over() {
    this.state = 'over';
    if (this.kills > this.best) { this.best = this.kills; store.set('df_best', this.best); }
    const revive = () => { this.cont = true; this.hp = 2; for (const e of this.ents) this.st.scene.remove(e.o); this.ents = []; this.state = 'run'; this.hud(); };
    gameOver(t('Оборону прорвано'), `<p>${t('Вбито:')} <b>${this.kills}</b> ${t('· рекорд {0}', this.best)}</p><p class="muted">${t('Зброя: {0}', t(WEAPONS[this.wpn].n))}</p>`, this.cont ? null : revive, () => { this.reset(); this.state = 'ready'; });
  },
};
export default Defense;
