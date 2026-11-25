// Sled run: endless downhill in 3 lanes. Swipe left/right to change lane, swipe up (or tap the middle) to jump.
// Trees must be dodged, rocks and logs can be jumped, coins add score.
import './runner.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill } from '../core/ui';
import { Ads } from '../core/ads';
import type { Game } from './registry';

type Ob = { z: number; lane: number; t: 'tree' | 'rock' | 'log' | 'coin' | 'deco'; side?: number; got?: boolean };

const Runner: Game & Record<string, any> = {
  title: 'Сани', theme: 'th-runner',
  start(el: HTMLElement) {
    this.el = el; this.best = store.get('rn_best', 0);
    el.innerHTML = `<canvas class="rc"></canvas><div class="rtip">Свайп ← → щоб змінити смугу, ↑ щоб стрибнути</div>`;
    this.cv = el.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.ro = new ResizeObserver(() => this.size()); this.ro.observe(el); this.size();
    this.bind(); this.reset(); this.state = 'ready'; this.loop(0);
    setTools([['Нова гра', () => { this.reset(); this.state = 'ready'; }]]);
  },
  stop() { cancelAnimationFrame(this.raf); this.ro?.disconnect(); this.unbind?.(); },
  size() { const d = devicePixelRatio || 1, w = this.el.clientWidth, h = this.el.clientHeight; this.w = w; this.h = h; this.cv.width = w * d; this.cv.height = h * d; this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px'; this.ctx.setTransform(d, 0, 0, d, 0, 0); },
  reset() { this.obs = [] as Ob[]; this.lane = 0; this.px = 0; this.jump = 0; this.vy = 0; this.speed = 13; this.dist = 0; this.coins = 0; this.nextRow = 18; this.cont = false; this.t = 0; for (let z = 4; z < 70; z += 5) this.deco(z); this.hud(); },
  deco(z: number) { this.obs.push({ z, lane: 0, t: 'deco', side: Math.random() < .5 ? -1 : 1 }); },
  hud() { setStats(`${pill(Math.floor(this.score()))}${pill('Монети ' + this.coins)}`); },
  score() { return this.dist + this.coins * 10; },
  bind() {
    let sx = 0, sy = 0, st = 0;
    const pd = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; st = performance.now(); };
    const pu = (e: PointerEvent) => {
      if (this.state === 'ready') { this.state = 'run'; this.el.querySelector('.rtip')?.remove(); return; }
      if (this.state !== 'run') return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1);
      else if (dy < -28) this.hop();
      else if (performance.now() - st < 300) { const r = this.cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width; x < .33 ? this.move(-1) : x > .67 ? this.move(1) : this.hop(); }
    };
    const kd = (e: KeyboardEvent) => { if (this.state === 'ready') this.state = 'run'; if (e.key === 'ArrowLeft') this.move(-1); if (e.key === 'ArrowRight') this.move(1); if (e.key === 'ArrowUp' || e.key === ' ') this.hop(); };
    this.cv.addEventListener('pointerdown', pd); this.cv.addEventListener('pointerup', pu); addEventListener('keydown', kd);
    this.unbind = () => removeEventListener('keydown', kd);
  },
  move(d: number) { const n = Math.max(-1, Math.min(1, this.lane + d)); if (n !== this.lane) { this.lane = n; haptic(); } },
  hop() { if (this.jump <= 0.01) { this.vy = 9.5; haptic(); } },
  spawnRow(z: number) {
    const lanes = [-1, 0, 1], free = pick(lanes), lvl = Math.min(1, this.dist / 2500);
    for (const l of lanes) {
      if (l === free) { if (Math.random() < .6) for (let k = 0; k < 4; k++) this.obs.push({ z: z + k * 1.6, lane: l, t: 'coin' }); continue; }
      const r = Math.random();
      if (r < .35 + lvl * .3) this.obs.push({ z, lane: l, t: Math.random() < .55 ? 'tree' : 'rock' });
      else if (r < .55 + lvl * .25) this.obs.push({ z, lane: l, t: 'log' });
    }
    this.deco(z + R(3));
  },
  loop(ts: number) {
    this.raf = requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(.05, (ts - (this.last || ts)) / 1000); this.last = ts;
    if (this.state === 'run') this.update(dt);
    this.draw(dt);
  },
  update(dt: number) {
    this.t += dt; this.speed = Math.min(32, 13 + this.t * .22); const dz = this.speed * dt; this.dist += dz;
    this.px += (this.lane - this.px) * Math.min(1, dt * 14);
    this.vy -= 30 * dt; this.jump = Math.max(0, this.jump + this.vy * dt); if (this.jump === 0) this.vy = Math.max(this.vy, 0);
    for (const o of this.obs) o.z -= dz;
    this.obs = this.obs.filter((o: Ob) => o.z > -3);
    this.nextRow -= dz; if (this.nextRow <= 0) { this.spawnRow(62); this.nextRow = Math.max(6, 11 - this.t * .05) + Math.random() * 4; }
    for (const o of this.obs) {
      if (o.t === 'deco' || o.got || o.z > .7 || o.z < -.4 || Math.abs(o.lane - this.px) > .45) continue;
      if (o.t === 'coin') { o.got = true; this.coins++; haptic(); continue; }
      if ((o.t === 'rock' || o.t === 'log') && this.jump > .35) continue;
      return this.crash();
    }
    if (Math.floor(this.dist) % 5 === 0) this.hud();
  },
  crash() {
    this.state = 'crash'; haptic('err'); this.hud();
    const sc = Math.floor(this.score()); if (sc > this.best) { this.best = sc; store.set('rn_best', sc); }
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: продовжити', () => Ads.rewarded(() => { this.cont = true; this.obs = this.obs.filter((o: Ob) => o.z > 14 || o.t === 'deco'); this.state = 'run'; })]);
    b.push(['Ще раз', () => { this.reset(); this.state = 'ready'; }]);
    setTimeout(() => modal(`<h2>Бум!</h2><p>Рахунок: <b>${sc}</b> · рекорд ${this.best}</p>`, b), 500);
  },
  // ---------- drawing ----------
  P(z: number, lx: number) { const s = 3 / (Math.max(z, -2.4) + 3), hor = this.h * .3; return { x: this.w / 2 + lx * this.w * .27 * s, y: hor + this.h * .62 * s, s }; },
  draw(dt: number) {
    const c = this.ctx, w = this.w, h = this.h, hor = h * .3;
    const sky = c.createLinearGradient(0, 0, 0, hor); sky.addColorStop(0, '#5b8fe0'); sky.addColorStop(1, '#cfe4ff'); c.fillStyle = sky; c.fillRect(0, 0, w, hor + 2);
    c.fillStyle = '#9db7dc'; c.beginPath(); c.moveTo(0, hor); [[.1, .55], [.25, .75], [.42, .5], [.6, .8], [.78, .45], [.92, .7], [1, .6]].forEach(([x, k]) => c.lineTo(x * w, hor - hor * .45 * k)); c.lineTo(w, hor); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(.42 * w - 18, hor - hor * .225 + 10); c.lineTo(.42 * w, hor - hor * .225); c.lineTo(.42 * w + 18, hor - hor * .225 + 10); c.fill();
    const snow = c.createLinearGradient(0, hor, 0, h); snow.addColorStop(0, '#e8f2ff'); snow.addColorStop(1, '#ffffff'); c.fillStyle = snow; c.fillRect(0, hor, w, h - hor);
    // lane grooves + speed stripes
    c.strokeStyle = 'rgba(120,160,210,.35)'; c.lineWidth = 2;
    for (const lx of [-1.5, -.5, .5, 1.5]) { const a = this.P(60, lx), b = this.P(-2, lx); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    const off = (this.dist % 4);
    c.fillStyle = 'rgba(150,185,230,.25)';
    for (let z = 60 - off; z > -2; z -= 4) { const a = this.P(z, -1.5), b = this.P(z, 1.5); c.fillRect(a.x, a.y, b.x - a.x, Math.max(1, 3 * a.s)); }
    // objects far → near
    const list = [...this.obs].sort((a: Ob, b: Ob) => b.z - a.z);
    let playerDrawn = false;
    for (const o of list) {
      if (!playerDrawn && o.z < .2) { this.drawPlayer(); playerDrawn = true; }
      if (o.got) continue;
      const p = this.P(o.z, o.t === 'deco' ? o.side! * 2.4 : o.lane), s = p.s * w / 380;
      if (o.t === 'tree' || o.t === 'deco') this.tree(p.x, p.y, s * (o.t === 'deco' ? 1.3 : 1));
      else if (o.t === 'rock') this.rock(p.x, p.y, s);
      else if (o.t === 'log') this.log(p.x, p.y, s);
      else this.coin(p.x, p.y, s);
    }
    if (!playerDrawn) this.drawPlayer();
    if (this.state === 'ready') { c.fillStyle = 'rgba(20,30,60,.35)'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '600 28px Fredoka'; c.textAlign = 'center'; c.fillText('Торкнись, щоб почати', w / 2, h * .5); }
  },
  tree(x: number, y: number, s: number) {
    const c = this.ctx; c.fillStyle = 'rgba(60,90,140,.18)'; c.beginPath(); c.ellipse(x, y, 26 * s, 7 * s, 0, 0, 7); c.fill();
    c.fillStyle = '#7a5038'; c.fillRect(x - 5 * s, y - 16 * s, 10 * s, 16 * s);
    for (let k = 0; k < 3; k++) { const yy = y - 12 * s - k * 22 * s, ww = (32 - k * 8) * s; c.fillStyle = k % 2 ? '#2f7d4f' : '#3a9460'; c.beginPath(); c.moveTo(x - ww, yy); c.lineTo(x, yy - 34 * s); c.lineTo(x + ww, yy); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - ww * .5, yy - 17 * s); c.lineTo(x, yy - 34 * s); c.lineTo(x + ww * .5, yy - 17 * s); c.quadraticCurveTo(x, yy - 22 * s, x - ww * .5, yy - 17 * s); c.fill(); }
  },
  rock(x: number, y: number, s: number) { const c = this.ctx; c.fillStyle = '#7d8696'; c.beginPath(); c.ellipse(x, y - 10 * s, 26 * s, 16 * s, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - 4 * s, y - 22 * s, 16 * s, 6 * s, 0, Math.PI, 0); c.fill(); c.fillStyle = '#5c6474'; c.fillRect(x - 26 * s, y - 10 * s, 52 * s, 10 * s); },
  log(x: number, y: number, s: number) { const c = this.ctx; c.fillStyle = '#8a5a2b'; c.fillRect(x - 34 * s, y - 14 * s, 68 * s, 14 * s); c.fillStyle = '#c99a63'; c.beginPath(); c.ellipse(x + 34 * s, y - 7 * s, 5 * s, 7 * s, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.fillRect(x - 30 * s, y - 16 * s, 50 * s, 4 * s); },
  coin(x: number, y: number, s: number) { const c = this.ctx, sp = Math.abs(Math.sin(this.t * 6 + x)); c.fillStyle = '#e6a91f'; c.beginPath(); c.ellipse(x, y - 22 * s, 11 * s * (.3 + .7 * sp), 11 * s, 0, 0, 7); c.fill(); c.fillStyle = '#ffd84a'; c.beginPath(); c.ellipse(x, y - 22 * s, 7 * s * (.3 + .7 * sp), 7 * s, 0, 0, 7); c.fill(); },
  drawPlayer() {
    const c = this.ctx, p = this.P(0, this.px), s = p.s * this.w / 380, x = p.x, y = p.y - this.jump * 26 * s, tilt = (this.lane - this.px) * .5;
    c.fillStyle = 'rgba(60,90,140,.25)'; c.beginPath(); c.ellipse(x, p.y, 30 * s * (1 - this.jump * .08), 8 * s, 0, 0, 7); c.fill();
    if (this.state === 'run' && this.jump === 0) { c.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (Math.random() - .5) * 50 * s, p.y + Math.random() * 6 * s, (2 + Math.random() * 3) * s, 0, 7); c.fill(); } }
    c.save(); c.translate(x, y); c.rotate(tilt);
    c.strokeStyle = '#3a3340'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(-28 * s, -2 * s); c.lineTo(24 * s, -2 * s); c.quadraticCurveTo(34 * s, -2 * s, 32 * s, -12 * s); c.stroke();
    c.fillStyle = '#e8443a'; c.beginPath(); c.roundRect(-26 * s, -16 * s, 50 * s, 11 * s, 4 * s); c.fill();
    c.fillStyle = '#2f6fd6'; c.beginPath(); c.roundRect(-12 * s, -44 * s, 24 * s, 30 * s, 9 * s); c.fill();
    c.fillStyle = '#ffd23f'; c.fillRect(-12 * s, -30 * s, 24 * s, 5 * s);
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(0, -52 * s, 10 * s, 0, 7); c.fill();
    c.fillStyle = '#ff3d7f'; c.beginPath(); c.arc(0, -55 * s, 10.5 * s, Math.PI, 0); c.fill(); c.beginPath(); c.arc(0, -67 * s, 4 * s, 0, 7); c.fillStyle = '#fff'; c.fill();
    c.restore();
  },
};
export default Runner;
