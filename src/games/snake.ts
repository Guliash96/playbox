// Pixel snakes: a pixel picture made of bricks. Launch a numbered snake: it crawls one lap around the
// picture and on every step bites the first brick it faces if the colour matches (number = bites left).
// Leftover snakes wait in the nest; nest full → fail. Clear the picture to win.
import './snake.css';
import { R, shuffle, shade } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, toast, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { Score } from '../core/score';
import type { Game } from './registry';

const PAL: Record<string, string> = { R: '#e8443a', W: '#f5efe2', Y: '#ffc533', K: '#3a3340', P: '#ff7ab2', O: '#ff9a3c', B: '#3d8bff', G: '#3fbf5f', N: '#8a5a2b' };
const PICS = [
  ['..........', '.RR....RR.', 'RRRR..RRRR', 'RPRRRRRRRR', 'RRRRRRRRRR', '.RRRRRRRR.', '..RRRRRR..', '...RRRR...', '....RR....', '..........'],
  ['...RRRR...', '..RRWWRR..', '.RWWRRRRR.', 'RRRRRRWWRR', 'RWWRRRWWRR', 'RRRRRRRRRR', '..YYYYYY..', '..YKYYKY..', '..YYYYYY..', '...YYYY...'],
  ['O........O', 'OO......OO', 'OOOOOOOOOO', 'OOKOOOOKOO', 'OOKOOOOKOO', 'OOOOPPOOOO', 'WWOOOOOOWW', 'OWWWWWWWWO', '.OOOOOOOO.', '..OOOOOO..'],
  ['..........', '...BBBB...', '..BBBBBB.Y', '.BKBBBBBYY', 'BBBBYBBBYY', 'BBBBYBBBYY', '.BBBBBBBYY', '..BBBBBB.Y', '...BBBB...', '..........'],
  ['...PPPP...', '..PPPPPP..', '.PPPYYPPP.', '.PPYYYYPP.', '.PPPYYPPP.', '..PPPPPP..', '...PGGP...', '....GG.GG.', '.GG.GG.G..', '..GGGG....'],
  ['....RR....', '...RRRR...', '..RRRRRR..', '.RRRRRRRR.', 'RRRRRRRRRR', '.WWWWWWWW.', '.WBBWWBBW.', '.WBBWWBBW.', '.WWWNNWWW.', '.WWWNNWWW.'],
];
interface Sn { c: string; n: number }
interface Run { sn: Sn; s: number; segs: HTMLElement[]; head: HTMLElement; next: number }
const SPEED = 11, GAP = .62, MAXRUN = 4;

const coilSVG = (col: string) => {
  const d = shade(col, -.3), l = shade(col, .35);
  return `<svg viewBox="0 0 48 48"><ellipse cx="24" cy="40" rx="17" ry="5" fill="#000" opacity=".2"/>
  <path d="M24 38c-9 0-15-5-15-12s6-12 14-12 12 4 12 9-4 8-9 8-7-3-7-6 2-4 5-4" fill="none" stroke="${d}" stroke-width="9" stroke-linecap="round"/>
  <path d="M24 38c-9 0-15-5-15-12s6-12 14-12 12 4 12 9-4 8-9 8-7-3-7-6 2-4 5-4" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round"/>
  <path d="M15 22c2-4 6-6 10-6" fill="none" stroke="${l}" stroke-width="2" stroke-linecap="round" opacity=".8"/>
  <circle cx="35" cy="34" r="7.5" fill="${col}" stroke="${d}" stroke-width="1.5"/><circle cx="33" cy="32" r="2.4" fill="#fff"/><circle cx="37.5" cy="32" r="2.4" fill="#fff"/><circle cx="33.4" cy="32.3" r="1.2" fill="#1b1b1f"/><circle cx="37.9" cy="32.3" r="1.2" fill="#1b1b1f"/></svg>`;
};

const Snake: Game & Record<string, any> = {
  title: 'Пікс-змійки', theme: 'th-snake',
  start(el: HTMLElement) { this.el = el; this.load(); },
  stop() { this.dead = true; cancelAnimationFrame(this.raf); },
  load() {
    cancelAnimationFrame(this.raf);
    const L = this.lvl = store.get('sn_lvl', 1); this.dead = false; this.over = false;
    const pic = PICS[(L - 1) % PICS.length]; this.H = pic.length; this.W = pic[0].length;
    this.g = pic.flatMap(row => [...row].map(ch => ch === '.' ? null : ch));
    const count: Record<string, number> = {}; this.g.forEach((c: string) => c && (count[c] = (count[c] || 0) + 1));
    const lo = L < 3 ? 6 : 4, hi = L < 3 ? 14 : 10, all: Sn[] = [];
    for (const c in count) { let left = count[c]; while (left > 0) { const n = Math.min(left, lo + R(hi - lo + 1)); all.push({ c, n }); left -= n; } }
    this.lanes = Array.from({ length: L < 4 ? 3 : 4 }, () => [] as Sn[]);
    shuffle(all).forEach((s, i) => this.lanes[i % this.lanes.length].push(s));
    this.cap = L < 6 ? 5 : 4; this.nest = [] as Sn[]; this.cont = false; this.runs = [] as Run[]; this.queue = [] as Sn[];
    this.el.innerHTML = `<div class="sx"><div class="px"><svg class="belt"></svg><div class="bricks"></div><div class="track"></div></div><div class="nest"></div><div class="lanes"></div></div>`;
    this.layout(); this.renderQ(); this.last = 0; this.loop(0);
    setTools([['Заново', () => this.load()]]);
  },
  layout() {
    const W = this.W, H = this.H, cs = this.cs = Math.floor(Math.min(this.el.clientWidth - 20, (this.el.clientHeight - 200)) / (W + 2));
    const px = this.el.querySelector('.px'); px.style.cssText = `width:${(W + 2) * cs}px;height:${(H + 2) * cs}px;--cs:${cs}px`;
    this.el.querySelector('.belt').innerHTML = `<rect x="${cs / 2}" y="${cs / 2}" width="${(W + 1) * cs}" height="${(H + 1) * cs}" rx="${cs * .6}" fill="none" stroke="#5a4c9c" stroke-width="${cs * .86}"/><rect x="${cs / 2}" y="${cs / 2}" width="${(W + 1) * cs}" height="${(H + 1) * cs}" rx="${cs * .6}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2" stroke-dasharray="${cs * .3} ${cs * .4}" class="beltdash"/>`;
    this.el.querySelector('.bricks').innerHTML = this.g.map((c: string, i: number) => c ? `<i data-i="${i}" style="left:${(i % W + 1) * cs}px;top:${(Math.floor(i / W) + 1) * cs}px;--c:${PAL[c]}"></i>` : '').join('');
    this.P = this.path();
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(this.g.filter(Boolean).length + ' цеглин')}`); },
  coil(s: Sn, attrs: string, small = false) { return `<button class="coil${small ? ' sm' : ''}" ${attrs}>${coilSVG(PAL[s.c])}<b>${s.n}</b></button>`; },
  renderQ() {
    this.el.querySelector('.nest').innerHTML = Array.from({ length: this.cap }, (_, i) => `<span class="nslot">${this.nest[i] ? this.coil(this.nest[i], `data-n="${i}"`) : ''}</span>`).join('');
    this.el.querySelector('.lanes').innerHTML = this.lanes.map((ln: Sn[], li: number) => ln.length ? `<div class="lane">${ln.slice(0, 3).map((s, k) => this.coil(s, k ? 'disabled' : `data-l="${li}"`, k > 0)).join('')}</div>` : '').join('');
    this.el.querySelectorAll('[data-l]').forEach((b: HTMLElement) => b.onpointerdown = (e: Event) => { e.preventDefault(); this.launch(() => this.lanes[+b.dataset.l!].shift()); });
    this.el.querySelectorAll('[data-n]').forEach((b: HTMLElement) => b.onpointerdown = (e: Event) => { e.preventDefault(); this.launch(() => this.nest.splice(+b.dataset.n!, 1)[0]); });
    this.hud();
  },
  path() {
    const W = this.W, H = this.H, p: { x: number; y: number; side: number; i: number }[] = [];
    for (let i = -1; i <= W; i++) p.push({ x: i + 1, y: H + 1, side: 0, i });
    for (let i = H - 1; i >= -1; i--) p.push({ x: W + 1, y: i + 1, side: 1, i });
    for (let i = W - 1; i >= -1; i--) p.push({ x: i + 1, y: 0, side: 2, i });
    for (let i = 0; i <= H; i++) p.push({ x: 0, y: i + 1, side: 3, i });
    return p;
  },
  facing(side: number, i: number) {
    const W = this.W, H = this.H;
    if (i < 0 || (side % 2 === 0 ? i >= W : i >= H)) return -1;
    const seq = side === 0 ? [...Array(H).keys()].reverse().map(r => r * W + i) : side === 2 ? [...Array(H).keys()].map(r => r * W + i)
      : side === 1 ? [...Array(W).keys()].reverse().map(c => i * W + c) : [...Array(W).keys()].map(c => i * W + c);
    return seq.find(k => this.g[k]) ?? -1;
  },
  /** queue a snake; it enters the belt as soon as the entry is clear (taps are never lost) */
  launch(take: () => Sn) {
    if (this.over) return;
    if (this.runs.length + this.queue.length >= MAXRUN) { haptic('err'); return flash(this.el.querySelector('.px'), 'shake'); }
    const sn = take(); if (!sn) return;
    haptic(); this.queue.push(sn); this.renderQ();
  },
  spawn(sn: Sn) {
    const track = this.el.querySelector('.track'), segs: HTMLElement[] = [];
    const head = document.createElement('i'); head.className = 'head'; head.style.setProperty('--c', PAL[sn.c]); head.style.setProperty('--d', shade(PAL[sn.c], -.3));
    head.innerHTML = `<span class="eyes"><u></u><u></u></span><b>${sn.n}</b>`; track.appendChild(head);
    const body = Math.min(10, sn.n);
    for (let k = 0; k < body; k++) { const e = document.createElement('i'); e.className = 'seg'; e.style.setProperty('--c', PAL[sn.c]); e.style.setProperty('--d', shade(PAL[sn.c], -.3)); e.style.setProperty('--k', String(1 - k / (body + 4))); track.insertBefore(e, track.firstChild); segs.push(e); }
    this.runs.push({ sn, s: 0, segs, head, next: 0 });
  },
  at(s: number) { const P = this.P, i = Math.max(0, Math.min(P.length - 2, Math.floor(s))), f = Math.max(0, Math.min(1, s - i)); return [(P[i].x + (P[i + 1].x - P[i].x) * f) * this.cs, (P[i].y + (P[i + 1].y - P[i].y) * f) * this.cs, P[i + 1].x - P[i].x, P[i + 1].y - P[i].y]; },
  loop(ts: number) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(t => this.loop(t));
    const dt = Math.min(.05, (ts - (this.last || ts)) / 1000); this.last = ts;
    if (this.queue.length && (!this.runs.length || this.runs[this.runs.length - 1].s > 2.2)) this.spawn(this.queue.shift());
    const end = this.P.length - 1;
    for (const r of [...this.runs]) {
      r.s += SPEED * dt;
      while (r.next <= Math.min(r.s, end)) { this.bite(r, this.P[r.next]); r.next++; }
      const [x, y, dx, dy] = this.at(r.s);
      r.head.style.transform = `translate(${x}px,${y}px)`; r.head.style.setProperty('--ex', dx * 2 + 'px'); r.head.style.setProperty('--ey', dy * 2 + 'px');
      r.segs.forEach((e, k) => { const ss = r.s - (k + 1) * GAP; if (ss < 0) { e.style.opacity = '0'; return; } const [sx, sy] = this.at(ss); e.style.opacity = '1'; e.style.transform = `translate(${sx}px,${sy}px)`; });
      if (r.s - (r.segs.length + 1) * GAP >= end) this.finish(r);
    }
  },
  bite(r: Run, p: any) {
    const t = this.facing(p.side, p.i);
    if (t < 0 || r.sn.n <= 0 || this.g[t] !== r.sn.c) return;
    this.g[t] = null; r.sn.n--; Score.good(3); r.head.querySelector('b')!.textContent = String(r.sn.n);
    const seg = r.segs.pop(); seg?.remove();
    flash(r.head, 'chomp', 180); haptic();
    const b = this.el.querySelector(`.bricks [data-i="${t}"]`) as HTMLElement;
    if (b) { const dx = p.x * this.cs - parseFloat(b.style.left), dy = p.y * this.cs - parseFloat(b.style.top); b.animate([{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(.25)`, opacity: .2 }], { duration: 200, easing: 'ease-in' }).onfinish = () => b.remove(); }
    this.hud();
    if (!this.g.some(Boolean) && !this.over) { this.over = true; done('sn_lvl', this.lvl, () => this.load()); }
  },
  finish(r: Run) {
    this.runs.splice(this.runs.indexOf(r), 1); r.head.remove(); r.segs.forEach(e => e.remove());
    if (this.over) return;
    if (r.sn.n > 0) {
      if (this.nest.length < this.cap) { this.nest.push(r.sn); this.renderQ(); }
      else { this.over = true; this.fail(r.sn); }
    }
  },
  fail(s: Sn) {
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +1 місце в гнізді', () => Ads.rewarded(() => { this.cont = true; this.over = false; this.cap++; this.nest.push(s); this.renderQ(); })]);
    b.push(['Почати заново', () => this.load()]);
    modal('<h2>Гніздо переповнене</h2><p class="muted">Змійці нікуди повернутися.</p>', b);
  },
};
export default Snake;
