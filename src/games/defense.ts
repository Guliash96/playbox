// Bridge defense (3D, 3 lanes on a bridge over the sea).
//  middle: a zombie horde walks at you — its toughness grows with time AND with your firepower;
//  left:   golden containers with a weapon on top — shoot one open, then run in and catch the gun;
//  right:  blue "+N" gates — every hit raises N, run through to add N soldiers to your squad.
// Killed zombies sometimes drop short buffs (rapid fire, double damage, freeze, bomb, +heart). A boss every 45 s.
import './defense.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, pill, toast, modal } from '../core/ui';
import { adOrGems, spendGems, shopSheet } from '../core/wallet';
import { Ads } from '../core/ads';
import { Score, scoreSheet } from '../core/score';
import { sfx } from '../core/sfx';
import { t } from '../core/i18n';
import { Stage, THREE, RoundedBoxGeometry, mat, mesh } from '../core/three';
import { person, animate, setGun, gunMesh, labelTexture, numberSprite, setSpriteText, poof, CrowdMesh, type Person } from '../art/people3d';
import type { Game } from './registry';

const WEAPONS = [
  { n: 'Пістолет', rate: 3, dmg: 1, shots: 1, spread: 0, col: 0xffe27a },
  { n: 'Пістолет-кулемет', rate: 8, dmg: 1, shots: 1, spread: .04, col: 0xffe27a },
  { n: 'Автомат', rate: 8, dmg: 2, shots: 1, spread: .02, col: 0xffc04a },
  { n: 'Дробовик', rate: 3, dmg: 2, shots: 5, spread: .06, col: 0xffa04a },
  { n: 'Мініган', rate: 20, dmg: 2, shots: 1, spread: .05, col: 0xff8a3a },
  { n: 'Лазер', rate: 10, dmg: 6, shots: 1, spread: 0, col: 0x6af0ff },
];
const dpsOf = (i: number) => { const w = WEAPONS[i]; return w.rate * w.dmg * w.shots; };
const BUFFS: Record<string, { n: string; ic: string; col: number; d: number }> = {
  rapid: { n: 'Швидкострільність', ic: '⚡', col: 0xffd23f, d: 8 }, power: { n: 'Подвійна шкода', ic: '💥', col: 0xff5a5a, d: 8 },
  freeze: { n: 'Сповільнення', ic: '❄', col: 0x7fd8ff, d: 6 }, bomb: { n: 'Бомба', ic: '💣', col: 0xff9a3c, d: 0 }, heart: { n: '+3 бійці', ic: '👥', col: 0x5fb8ff, d: 0 },
};
const LANE = 2.4, XMIN = -3.4, XMAX = 3.4, FAR = -34, WORLD = 2.2, MAXE = 220, MAXA = 40, MAXB = 700;
interface En { x: number; z: number; hp: number; max: number; sp: number; ph: number; hit: number; big: boolean }
interface Box { o: THREE.Group; hp: number; tier: number; tag: THREE.Sprite }
interface Plus { o: THREE.Group; v: number; acc: number; panel: THREE.Mesh; dirty: boolean; last: number }
interface Drop { o: THREE.Group; x: number; tier?: number; buff?: string }

const gold = new THREE.MeshStandardMaterial({ color: 0xffc533, metalness: .9, roughness: .2, emissive: 0xffa000, emissiveIntensity: .7 });
const holo = new THREE.MeshStandardMaterial({ color: 0x7fe6ff, metalness: .6, roughness: .2, emissive: 0x3fb8ff, emissiveIntensity: .9, transparent: true, opacity: .9 });

function waterTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d')!;
  x.fillStyle = '#1c7f97'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(255,255,255,${.05 + Math.random() * .12})`; x.lineWidth = 1 + Math.random() * 2; const y = Math.random() * 256, x0 = Math.random() * 256, l = 20 + Math.random() * 60; x.beginPath(); x.moveTo(x0, y); x.quadraticCurveTo(x0 + l / 2, y - 4, x0 + l, y); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 30); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const Defense: Game & Record<string, any> = {
  title: 'Оборона', theme: 'th-defense',
  start(el: HTMLElement) {
    this.el = el; el.innerHTML = '<div class="buffs"></div><div class="bossbar" hidden><b></b><i></i></div>'; this.best = store.get('df_best', 0);
    const st: Stage = this.st = new Stage(el, { fov: 46, shadows: true, clear: 0x8fd0ff });
    st.scene.fog = new THREE.Fog(0x8fd0ff, 34, 62);
    st.lights(new THREE.Vector3(-5, 16, 6), 14);
    this.build();
    this.bulletGeo = new THREE.CapsuleGeometry(.05, .36, 2, 6).rotateX(Math.PI / 2);
    this.bullets = new THREE.InstancedMesh(this.bulletGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAXB); this.bullets.frustumCulled = false; this.bullets.count = 0; st.scene.add(this.bullets);
    this.horde = new CrowdMesh(MAXE, st.scene, 'zombie');
    this.squad = new CrowdMesh(MAXA, st.scene, 'soldier'); for (let i = 0; i < MAXA; i++) this.squad.color(i, 0x3d8bff);
    st.onResize = () => { const c = st.camera, k = Math.max(1, 4.2 / (8.6 * Math.tan(c.fov * Math.PI / 360) * c.aspect)); c.position.set(0, 7.2 * k, 7 * k); c.lookAt(0, 0, -7); };
    st.resize();
    st.onFrame = (dt: number) => this.frame(dt);
    this.bind(); this.reset(); this.state = 'ready';
    this.tools();
  },
  stop() { this.st?.dispose(); },
  /** buffs for an ad (then crystals for a while) */
  tools() {
    const buy = (k: string, name: string, desc: string) => () => adOrGems('df_' + k, name, desc, 10, 3, () => { this.buffs[k] = this.t + 15; toast(`${BUFFS[k].ic} ${t(BUFFS[k].n)}`); this.buffHud(); });
    setTools([['i:bolt', buy('rapid', 'Швидкострільність', '×2 швидкість стрільби на 15 с.')], ['i:boom', buy('power', 'Подвійна шкода', '×2 шкоди на 15 с.')], ['i:snow', buy('freeze', 'Сповільнення', 'Зомбі йдуть удвічі повільніше 15 с.')],
      ['i:restart', () => { Score.lose(); this.reset(); this.state = 'ready'; }]]);
  },
  build() {
    const sc = this.st.scene;
    this.water = waterTex();
    const sea = mesh(new THREE.PlaneGeometry(220, 220).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: this.water, roughness: .25, metalness: .15 }), false); sea.position.set(0, -3, -60); sea.receiveShadow = false; sc.add(sea);
    const deck = mesh(new THREE.BoxGeometry(8.6, .6, 160), mat(0xb4b8bf, { roughness: .9 }), false); deck.position.set(0, -.3, -60); sc.add(deck);
    const under = mesh(new THREE.BoxGeometry(8.2, .5, 160), mat(0x8c9099, { roughness: .9 }), false); under.position.set(0, -.85, -60); sc.add(under);
    const lane = (x: number, c: number) => { const p = mesh(new THREE.PlaneGeometry(LANE - .25, 160).rotateX(-Math.PI / 2), mat(c, { transparent: true, opacity: .12, roughness: 1 }), false); p.position.set(x, .004, -60); sc.add(p); };
    lane(-LANE, 0xffc533); lane(LANE, 0x3d8bff);
    // scrolling lane dashes give the feeling of moving forward
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .01, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff }), 120); this.dash = dash; this.dashZ = [];
    for (let i = 0; i < 120; i++) this.dashZ.push([i % 2 ? -LANE / 2 : LANE / 2, 4 - Math.floor(i / 2) * 3]); sc.add(dash);
    // concrete curbs, railings (instanced posts), lamp posts, pillars
    for (const s of [-1, 1]) {
      const curb = mesh(new RoundedBoxGeometry(.5, .55, 160, 2, .08), mat(0xc9ccd2, { roughness: .8 }), false); curb.position.set(s * 4.35, .27, -60); sc.add(curb); curb.castShadow = true;
      for (const y of [.95, 1.25]) { const rail = mesh(new THREE.CylinderGeometry(.045, .045, 160, 8).rotateX(Math.PI / 2), mat(0x9aa3ad, { metalness: .7, roughness: .3 }), false); rail.position.set(s * 4.4, y, -60); sc.add(rail); }
      const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .75, .08), mat(0x8a929c, { metalness: .6, roughness: .35 }), 90), d = new THREE.Object3D();
      for (let i = 0; i < 90; i++) { d.position.set(s * 4.4, .9, 6 - i * 1.6); d.updateMatrix(); posts.setMatrixAt(i, d.matrix); } sc.add(posts);
      for (let z = 2; z > -130; z -= 26) {
        const pil = mesh(new RoundedBoxGeometry(1.6, 6, 2.2, 2, .2), mat(0xa9adb5, { roughness: .9 }), false); pil.position.set(s * 3.2, -4, z); sc.add(pil);
        const pole = mesh(new THREE.CylinderGeometry(.07, .09, 3.6, 8), mat(0x5c6470, { metalness: .5 })); pole.position.set(s * 4.6, 1.8, z - 13); sc.add(pole);
        const arm = mesh(new THREE.BoxGeometry(.9, .08, .14), mat(0x5c6470)); arm.position.set(s * 4.25, 3.55, z - 13); sc.add(arm);
        const lamp = mesh(new THREE.BoxGeometry(.4, .12, .24), mat(0xfff4c0, { emissive: 0xffe680, emissiveIntensity: .6 }), false); lamp.position.set(s * 3.85, 3.5, z - 13); sc.add(lamp);
      }
    }
    const line = mesh(new THREE.BoxGeometry(8.2, .03, .14), mat(0xff3d3d, { emissive: 0xff2020, emissiveIntensity: .6 }), false); line.position.set(0, .02, .6); sc.add(line);
  },
  reset() {
    const sc = this.st.scene;
    for (const a of [this.boxes, this.pluses, this.drops]) for (const e of a || []) sc.remove(e.o);
    if (this.player) sc.remove(this.player); if (this.boss) sc.remove(this.boss.o);
    this.ens = [] as En[]; this.boxes = [] as Box[]; this.pluses = [] as Plus[]; this.drops = [] as Drop[]; this.boss = null;
    this.bx = []; this.bz = []; this.bvx = []; this.bdm = [];
    this.x = 0; this.tx = 0; this.wpn = 0; this.allies = 0; this.cool = 0; this.scool = 0; this.t = 0; this.kills = 0; this.adRev = false; this.gemRev = false; this.bosses = 0;
    this.spawnT = 1; this.boxT = 4; this.plusT = 2; this.bossT = 45; this.buffT = 18; this.buffs = {} as Record<string, number>; this.offered = 0;
    this.player = person('soldier', 0x3d8bff, { helmet: 0x2f7bff }) as Person; this.player.scale.setScalar(1.25); this.player.rotation.y = Math.PI; setGun(this.player, 0); sc.add(this.player);
    (this.el.querySelector('.bossbar') as HTMLElement).hidden = true;
    this.tip(); this.hud();
  },
  tip() { this.el.querySelector('.rtip')?.remove(); const e = document.createElement('div'); e.className = 'rtip'; e.innerHTML = `<b>${t('Торкнись, щоб почати')}</b><br>${t('веди пальцем вліво/вправо')}<br>${t('ліворуч зброя, посередині зомбі, праворуч підкріплення')}`; this.el.appendChild(e); },
  hud() { setStats(`${pill('☠ ' + this.kills)}${pill('👥 ' + (this.allies + 1))}`); },
  bind() {
    const el = this.el; let down = false;
    const toX = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return XMIN + (e.clientX - r.left) / r.width * (XMAX - XMIN); };
    el.onpointerdown = (e: PointerEvent) => { down = true; if (this.state === 'ready') { this.state = 'run'; el.querySelector('.rtip')?.remove(); } this.tx = toX(e); };
    el.onpointermove = (e: PointerEvent) => { if (down) this.tx = toX(e); };
    el.onpointerup = () => { down = false; };
  },
  // ---------- difficulty: zombies get tougher with time and with the squad's firepower ----------
  power() { return dpsOf(this.wpn) * (1 + this.allies * .5) * (this.buffs.power > this.t ? 2 : 1) * (this.buffs.rapid > this.t ? 2 : 1); },
  zhp() { const base = dpsOf(this.wpn) * (1 + this.allies * .5); return Math.max(1, (1 + this.t / 30) * Math.pow(base / 3, .78)); },
  // ---------- spawns ----------
  spawnPack() {
    const n = Math.min(12, 2 + R(2 + Math.floor(this.t / 18))), hp = this.zhp();
    for (let i = 0; i < n && this.ens.length < MAXE; i++) {
      const big = Math.random() < .12, h = Math.max(1, Math.round(hp * (big ? 3 : .7 + Math.random() * .6)));
      this.ens.push({ x: (Math.random() - .5) * (LANE - .5), z: FAR - Math.random() * 3, hp: h, max: h, sp: (big ? .9 : 1.5) + Math.random() * .5 + Math.min(1, this.t * .006), ph: Math.random() * 6, hit: 0, big });
    }
  },
  spawnBoss() {
    const o = person('boss', 0x8a2a4a) as Person; o.position.set(0, 0, FAR); this.st.scene.add(o);
    const hp = Math.round(70 * (1 + this.bosses * .6) * Math.pow(dpsOf(this.wpn) * (1 + this.allies * .5) / 3, .85));
    this.boss = { o, hp, max: hp }; toast(t('Бос!')); haptic('err');
    const bar = this.el.querySelector('.bossbar') as HTMLElement; bar.hidden = false; this.bossBar();
  },
  bossBar() { const b = this.boss, bar = this.el.querySelector('.bossbar') as HTMLElement; if (!b) return; bar.querySelector('b')!.textContent = String(Math.max(0, Math.ceil(b.hp))); (bar.querySelector('i') as HTMLElement).style.width = Math.max(0, b.hp / b.max * 100) + '%'; },
  spawnBox() {
    const tier = Math.max(this.wpn, this.offered, ...this.boxes.map((b: Box) => b.tier), ...this.drops.filter((d: Drop) => d.tier != null).map((d: Drop) => d.tier!)) + 1;
    if (tier >= WEAPONS.length) return; this.offered = tier;
    const g = new THREE.Group(), hp = Math.round(30 * Math.pow(2.5, tier - 1) * (1 + this.t / 150) * (1 + this.allies * .25));
    const body = mesh(new RoundedBoxGeometry(1.9, 1.5, 3, 2, .06), mat(0xd9962b, { roughness: .55, metalness: .3 })); body.position.y = .75; g.add(body);
    for (let i = 0; i < 9; i++) { const r = mesh(new THREE.BoxGeometry(1.94, 1.36, .08), mat(0xb8781c, { roughness: .5, metalness: .3 })); r.position.set(0, .75, -1.35 + i * .34); g.add(r); }
    const top = mesh(new THREE.BoxGeometry(1.7, .05, 2.8), mat(0xe8a93a, { metalness: .3 })); top.position.y = 1.52; g.add(top);
    const pad = new THREE.Mesh(new THREE.RingGeometry(.55, .75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: .8 })); pad.position.y = 1.56; g.add(pad);
    const gun = gunMesh(tier, holo); gun.scale.setScalar(2); gun.position.y = 2.1; gun.name = 'holo'; g.add(gun);
    const tag = numberSprite(String(hp), '#1b1b1f', 1.4); tag.position.set(0, 1, 1.7); g.add(tag);
    g.position.set(-LANE, 0, FAR); this.st.scene.add(g); this.boxes.push({ o: g, hp, tier, tag });
  },
  spawnPlus() {
    const v = -(1 + R(3 + Math.floor(this.t / 25))), g = new THREE.Group(), frame = mat(0x2f6fe0, { roughness: .35, metalness: .3 });
    for (const x of [-1.05, 1.05]) { const p = mesh(new RoundedBoxGeometry(.16, 1.9, .16, 2, .05), frame); p.position.set(x, .95, 0); g.add(p); }
    const top = mesh(new RoundedBoxGeometry(2.26, .14, .16, 2, .05), frame); top.position.y = 1.9; g.add(top);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: .88, side: THREE.DoubleSide })); panel.position.y = 1.05; g.add(panel);
    g.position.set(LANE, 0, FAR); this.st.scene.add(g); const p: Plus = { o: g, v, acc: 0, panel, dirty: true, last: 0 }; this.plusTex(p); this.pluses.push(p);
  },
  plusTex(p: Plus) { const m = p.panel.material as THREE.MeshBasicMaterial; m.map?.dispose(); m.map = labelTexture((p.v >= 0 ? '+' : '−') + Math.abs(p.v), p.v >= 0 ? '#2f7bff' : '#e8324a'); m.needsUpdate = true; p.dirty = false; },
  dropItem(x: number, z: number, tier?: number, buff?: string) {
    const g = new THREE.Group();
    if (tier != null) {
      const gun = gunMesh(tier, gold); gun.scale.setScalar(2.2); gun.position.y = 1.1; g.add(gun);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.55, .75, 5, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 2.5; g.add(beam);
      toast(t('Лови зброю: {0}!', t(WEAPONS[tier].n)));
    } else {
      const b = BUFFS[buff!], orb = new THREE.Mesh(new THREE.SphereGeometry(.42, 20, 14), new THREE.MeshStandardMaterial({ color: b.col, emissive: b.col, emissiveIntensity: .7, roughness: .2, transparent: true, opacity: .92 })); orb.position.y = .9; g.add(orb);
      const ic = numberSprite(b.ic, '#1b1b1f', .9); ic.position.y = 1.75; g.add(ic);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(.6, .8, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: tier != null ? 0xffd23f : BUFFS[buff!].col, transparent: true, opacity: .75 })); ring.position.y = .03; g.add(ring);
    g.position.set(x, 0, z); this.st.scene.add(g); this.drops.push({ o: g, x, tier, buff });
  },
  // ---------- shooting ----------
  shoot(x: number, z: number, n = 1) {
    const w = WEAPONS[this.wpn], dmg = w.dmg * (this.buffs.power > this.t ? 2 : 1);
    for (let k = 0; k < w.shots * n; k++) {
      if (this.bx.length >= MAXB) return;
      const aim = this.aim(x, z), sp = (Math.random() - .5) * 2 * w.spread + (w.shots > 1 ? (k % w.shots - (w.shots - 1) / 2) * w.spread : 0);
      this.bx.push(x); this.bz.push(z - .6); this.bvx.push((aim + sp) * 34); this.bdm.push(dmg);
    }
  },
  /** aim assist towards the nearest target in the lane you stand in */
  aim(x: number, z: number) {
    const lane = Math.round(x / LANE); let tx: number | null = null, tz = -99;
    if (lane === 0) { for (const e of this.ens) if (e.z < z && e.z > tz && Math.abs(e.x - x) < 1.4) { tz = e.z; tx = e.x; } if (this.boss && this.boss.o.position.z > tz) { tz = this.boss.o.position.z; tx = 0; } }
    else for (const b of lane < 0 ? this.boxes : this.pluses) if (b.o.position.z < z && b.o.position.z > tz && (b.hp ?? 1) > 0) { tz = b.o.position.z; tx = b.o.position.x; }
    return tx == null ? 0 : Math.max(-.12, Math.min(.12, (tx - x) / Math.max(1, z - tz)));
  },
  flash(s: Person) {
    if (!this.mf) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!, g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(.35, 'rgba(255,200,80,.8)'); g.addColorStop(1, 'rgba(255,140,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); this.mf = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); this.st.scene.add(this.mf); }
    if (WEAPONS[this.wpn].rate > 8 && Math.random() < .5) return;
    this.mf.scale.setScalar(.35 + Math.random() * .25);
    const p = new THREE.Vector3(); (s.getObjectByName('gun') || s).getWorldPosition(p); this.mf.position.set(p.x, p.y + .05, p.z - .9); this.mf.visible = true; clearTimeout(this.mft); this.mft = setTimeout(() => { if (this.mf) this.mf.visible = false; }, 30);
  },
  allyPos(i: number): [number, number] { const row = Math.floor(i / 5) + 1, col = i % 5 - 2; return [Math.max(XMIN + .2, Math.min(XMAX - .2, this.x + col * .55 + (row % 2) * .27)), .2 + row * .55]; },
  // ---------- frame ----------
  frame(dt: number) {
    const run = this.state === 'run', sc = this.st.scene;
    this.water.offset.y -= dt * .02; this.water.offset.x = Math.sin(this.t * .3) * .02;
    this.x += (this.tx - this.x) * Math.min(1, dt * 12); this.x = Math.max(XMIN, Math.min(XMAX, this.x));
    const moving = Math.abs(this.tx - this.x) > .06; this.player.position.x = this.x;
    if (moving) animate(this.player, dt, 1); else { this.player.userData.legs.forEach((l: any) => l.rotation.x *= .8); this.player.position.y = 0; }
    // dashes
    const d = new THREE.Object3D(); for (let i = 0; i < this.dashZ.length; i++) { const q = this.dashZ[i]; if (run) { q[1] += WORLD * dt; if (q[1] > 6) q[1] -= 180; } d.position.set(q[0], .006, q[1]); d.updateMatrix(); this.dash.setMatrixAt(i, d.matrix); } this.dash.instanceMatrix.needsUpdate = true;
    // squad
    const sq: CrowdMesh = this.squad; sq.count = this.allies;
    for (let i = 0; i < this.allies; i++) { const [ax, az] = this.allyPos(i); sq.pose(i, ax, run ? Math.abs(Math.sin(this.t * 10 + i)) * .05 : 0, az, Math.PI, .9); } sq.commit();
    for (const dr of this.drops) dr.o.children[0].rotation.y += dt * 2.5;
    if (!run) { this.drawHorde(); return; }
    this.t += dt; const T = this.t, frozen = this.buffs.freeze > T;
    if ((this.spawnT -= dt) <= 0) { this.spawnPack(); this.spawnT = Math.max(.9, 3 - T * .02) * (.7 + Math.random() * .6); }
    if ((this.boxT -= dt) <= 0) { this.spawnBox(); this.boxT = 14; }
    if ((this.plusT -= dt) <= 0) { this.spawnPlus(); this.plusT = 8 + Math.random() * 3; }
    if ((this.bossT -= dt) <= 0 && !this.boss) { this.spawnBoss(); this.bossT = 45; }
    if ((this.buffT -= dt) <= 0) { this.dropItem(0, FAR + 4, undefined, pick(['rapid', 'power', 'freeze', 'bomb', 'heart'])); this.buffT = 16 + Math.random() * 8; }
    // fire: the leader + the squad (each soldier at half rate)
    const rate = WEAPONS[this.wpn].rate * (this.buffs.rapid > T ? 2 : 1);
    if ((this.cool -= dt) <= 0) { this.shoot(this.x, 0); this.flash(this.player); sfx('shoot'); this.cool = 1 / rate; }
    if (this.allies) { this.scool += dt * rate * .5 * this.allies; while (this.scool >= 1) { this.scool--; const [ax, az] = this.allyPos(R(this.allies)); this.shoot(ax, az); } }
    // move world objects
    for (const e of this.ens) { e.z += e.sp * dt * (frozen ? .5 : 1); if (e.hit > 0) e.hit -= dt; }
    if (this.boss) { const o = this.boss.o; o.position.z += .8 * dt * (frozen ? .5 : 1); animate(o, dt * (frozen ? .5 : 1), .5); }
    for (const b of this.boxes) { b.o.position.z += WORLD * dt; if ((b as any).dirty) { (b as any).dirty = false; setSpriteText(b.tag, String(Math.ceil(b.hp)), '#1b1b1f'); } } for (const p of this.pluses) p.o.position.z += WORLD * dt;
    for (const dr of this.drops) dr.o.position.z += 2.8 * dt;
    this.bullets_(dt);
    this.drawHorde();
    // zombies reaching the line kill soldiers; when nobody is left but you, the defence falls
    for (const e of this.ens) if (e.z > -.2 && e.hp > 0) {
      e.hp = 0; e.max = -1; haptic('err'); Score.bad(); this.flashRed();
      if (this.allies > 0) this.allies = Math.max(0, this.allies - (e.big ? 3 : 1)); else return this.over();
    }
    if (this.boss && this.boss.o.position.z > -.6) return this.over();
    this.ens = this.ens.filter((e: En) => e.hp > 0);
    // boxes / plus gates / drops reaching the squad
    for (const b of [...this.boxes]) if (b.o.position.z > 2) { sc.remove(b.o); this.boxes.splice(this.boxes.indexOf(b), 1); this.offered = this.maxOffered(); }
    for (const p of [...this.pluses]) {
      if (p.dirty) { p.last = T; this.plusTex(p); }
      if (p.o.position.z > -.3) {
        sc.remove(p.o); this.pluses.splice(this.pluses.indexOf(p), 1);
        if (Math.abs(this.x - LANE) < 1.3) {
          const before = this.allies; this.allies = Math.max(0, Math.min(MAXA, this.allies + p.v));
          if (p.v > 0) { haptic('ok'); Score.good(5 + p.v * 2); toast(t('+{0} бійців', this.allies - before)); } else if (p.v < 0) { haptic('err'); Score.bad(); toast(t('−{0} бійців', before - this.allies)); }
        }
      }
    }
    for (const dr of [...this.drops]) {
      const near = Math.abs(this.x - dr.x) < 1.3;
      if (dr.o.position.z > -.5 && near) this.pickup(dr);
      else if (dr.o.position.z > 1.8) { sc.remove(dr.o); this.drops.splice(this.drops.indexOf(dr), 1); if (dr.tier != null) { toast(t('Зброю пропущено')); Score.bad(); this.offered = this.maxOffered(); } }
    }
    if ((this.hudT = (this.hudT || 0) + dt) > .25) { this.hudT = 0; this.hud(); this.buffHud(); }
  },
  bullets_(dt: number) {
    const bx = this.bx, bz = this.bz, n = bx.length, sc = this.st.scene;
    // bucket zombies by z so each bullet only checks its neighbours
    const bk = new Map<number, En[]>(); for (const e of this.ens) { const k = Math.floor(e.z); (bk.get(k) || bk.set(k, []).get(k)!).push(e); }
    const m = new THREE.Matrix4(), keep: number[] = [];
    for (let i = 0; i < n; i++) {
      bz[i] -= 34 * dt; bx[i] += this.bvx[i] * dt; let hit = false; const x = bx[i], z = bz[i], dm = this.bdm[i];
      for (let k = Math.floor(z - .5); k <= Math.floor(z + .5) && !hit; k++) for (const e of bk.get(k) || []) if (e.hp > 0 && Math.abs(e.x - x) < (e.big ? .5 : .36) && Math.abs(e.z - z) < .45) { e.hp -= dm; e.hit = .06; hit = true; if (e.hp <= 0) this.kill(e); break; }
      if (!hit && this.boss && Math.abs(x) < 1.1 && Math.abs(this.boss.o.position.z - z) < .8) { this.boss.hp -= dm; hit = true; this.bossHitT = .06; if (this.boss.hp <= 0) this.killBoss(); else if (Math.random() < .3) this.bossBar(); }
      if (!hit) for (const b of this.boxes) if (b.hp > 0 && Math.abs(b.o.position.x - x) < 1 && Math.abs(b.o.position.z - z) < 1.5) { b.hp = Math.max(0, b.hp - dm); hit = true; (b as any).dirty = true; if (!b.hp) this.openBox(b); break; }
      if (!hit) for (const p of this.pluses) if (Math.abs(p.o.position.x - x) < 1.05 && Math.abs(p.o.position.z - z) < .3) { p.acc += dm; const step = Math.max(1, WEAPONS[this.wpn].dmg * 2); while (p.acc >= step && p.v < 30) { p.acc -= step; p.v++; p.dirty = true; } hit = true; break; }
      if (!hit && z > FAR - 2) keep.push(i);
    }
    this.bx = keep.map(i => bx[i]); this.bz = keep.map(i => bz[i]); this.bvx = keep.map(i => this.bvx[i]); this.bdm = keep.map(i => this.bdm[i]);
    const im: THREE.InstancedMesh = this.bullets; im.count = this.bx.length; (im.material as THREE.MeshBasicMaterial).color.setHex(this.buffs.power > this.t ? 0xff6a4a : WEAPONS[this.wpn].col);
    for (let i = 0; i < this.bx.length; i++) { m.makeTranslation(this.bx[i], .95, this.bz[i]); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true;
    if (this.boss) { const b = this.boss.o.userData.body; if (b) b.material.emissive?.setRGB((this.bossHitT = Math.max(0, (this.bossHitT || 0) - dt)) > 0 ? .6 : 0, 0, 0); }
    void sc;
  },
  drawHorde() {
    const h: CrowdMesh = this.horde, T = this.t; h.count = this.ens.length;
    this.ens.forEach((e: En, i: number) => { h.pose(i, e.x, Math.abs(Math.sin(T * 7 + e.ph)) * .06, e.z, (this.state === 'push' ? Math.PI : 0) + Math.sin(T * 2 + e.ph) * .2, e.big ? 1.35 : .95, .12); h.color(i, e.hit > 0 ? 0xffffff : e.big ? 0x7a1f2f : 0xc83a3a); });
    h.commit();
  },
  kill(e: En) {
    this.kills++; Score.good(e.big ? 6 : 2);
    if (Math.random() < .3) poof(this.st.scene, this.st, e.x, .7, e.z, 0x8fbf6a, 4, .1);
    if (Math.random() < .025) this.dropItem(e.x, e.z, undefined, pick(['rapid', 'power', 'freeze', 'bomb', 'heart']));
  },
  killBoss() {
    const b = this.boss; this.boss = null; this.bosses++; this.kills += 25; Score.good(100); haptic('ok'); toast(t('Боса знищено!'));
    (this.el.querySelector('.bossbar') as HTMLElement).hidden = true; poof(this.st.scene, this.st, 0, 1.5, b.o.position.z, 0x8fbf6a, 16, .2);
    this.st.tween(500, k => { b.o.rotation.x = -k * 1.5; b.o.position.y = -k; }).then(() => this.st.scene.remove(b.o));
    this.dropItem(0, b.o.position.z, undefined, pick(['rapid', 'power']));
  },
  openBox(b: Box) {
    const sc = this.st.scene; haptic('ok'); Score.good(20); poof(sc, this.st, b.o.position.x, 1.2, b.o.position.z, 0xffc533, 14, .16);
    sc.remove(b.o); this.boxes.splice(this.boxes.indexOf(b), 1); this.dropItem(-LANE, b.o.position.z, b.tier);
  },
  /** highest weapon tier already given or on its way — missed lower tiers are not offered again */
  maxOffered() { return Math.max(this.wpn, ...this.boxes.map((b: Box) => b.tier), ...this.drops.filter((d: Drop) => d.tier != null).map((d: Drop) => d.tier!)); },
  pickup(dr: Drop) {
    this.st.scene.remove(dr.o); this.drops.splice(this.drops.indexOf(dr), 1); haptic('ok');
    if (dr.tier != null) {
      if (dr.tier > this.wpn) { this.wpn = dr.tier; setGun(this.player, this.wpn); this.offered = Math.max(this.offered, this.wpn); }
      // older, weaker guns still on the road are no longer useful
      for (const o of [...this.boxes]) if (o.tier <= this.wpn) { this.st.scene.remove(o.o); this.boxes.splice(this.boxes.indexOf(o), 1); }
      for (const o of [...this.drops]) if (o.tier != null && o.tier <= this.wpn) { this.st.scene.remove(o.o); this.drops.splice(this.drops.indexOf(o), 1); }
      Score.good(30); toast(t('Нова зброя: {0}', t(WEAPONS[this.wpn].n)));
    } else {
      const b = BUFFS[dr.buff!]; Score.good(10); toast(`${b.ic} ${t(b.n)}`);
      if (dr.buff === 'heart') this.allies = Math.min(MAXA, this.allies + 3);
      else if (dr.buff === 'bomb') { for (const e of this.ens) if (e.z > -20) { e.hp = 0; this.kill(e); poof(this.st.scene, this.st, e.x, .6, e.z, 0xff9a3c, 3, .14); } this.ens = this.ens.filter((e: En) => e.hp > 0); this.flashRed(true); }
      else this.buffs[dr.buff!] = this.t + b.d;
    }
    this.hud();
  },
  buffHud() {
    const box = this.el.querySelector('.buffs'); if (!box) return;
    box.innerHTML = Object.entries(this.buffs as Record<string, number>).filter(([, u]) => u > this.t).map(([k, u]) => `<span style="--c:#${new THREE.Color(BUFFS[k].col).getHexString()}">${BUFFS[k].ic} ${Math.ceil(u - this.t)}</span>`).join('');
  },
  flashRed(boom = false) { this.el.classList.remove('hurt', 'boom'); void this.el.offsetWidth; this.el.classList.add(boom ? 'boom' : 'hurt'); },
  over() {
    this.state = 'over'; haptic('err');
    if (this.kills > this.best) { this.best = this.kills; store.set('df_best', this.best); }
    const info = `<p>${t('Вбито:')} <b>${this.kills}</b> ${t('· рекорд {0}', this.best)}</p>`;
    const finish = () => scoreSheet(t('Оборону прорвано'), '', () => { Score.lose(); this.reset(); this.state = 'ready'; });
    // 1st time: push the horde back for an ad; 2nd time: revive for crystals; then the run ends
    if (!this.adRev) return modal(`<h2>${t('Оборону прорвано')}</h2>${info}`, [[t('Реклама: відкинути зомбі'), () => Ads.rewarded(() => { this.adRev = true; this.pushBack(); })], [t('Ні'), finish]]);
    if (!this.gemRev) return modal(`<h2>${t('Оборону прорвано')}</h2>${info}`, [[t('Відродитись за {0} 💎', 30), () => { if (!spendGems(30)) return shopSheet(); this.gemRev = true; this.pushBack(); }], [t('Ні'), finish]]);
    modal(`<h2>${t('Оборону прорвано')}</h2>${info}`, [[t('Далі'), finish]]);
  },
  /** the zombies turn around and run back to the far end */
  pushBack() {
    this.state = 'push'; const from = this.ens.map((e: En) => e.z), to = this.ens.map(() => FAR - 2 - Math.random() * 3), bz = this.boss?.o.position.z;
    this.st.tween(1300, k => {
      const q = 1 - (1 - k) ** 2; this.ens.forEach((e: En, i: number) => { e.z = from[i] + (to[i] - from[i]) * q; });
      if (this.boss) this.boss.o.position.z = bz + (FAR - bz) * q; this.t += .016; this.drawHorde();
    }).then(() => { this.state = 'run'; this.allies = Math.max(this.allies, 2); this.hud(); });
  },
};
export default Defense;
