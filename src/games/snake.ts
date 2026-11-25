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
import { sfx } from '../core/sfx';
import type { Game } from './registry';

const PAL: Record<string, string> = { R: '#e8443a', W: '#f5efe2', Y: '#ffc533', K: '#3a3340', P: '#ff7ab2', O: '#ff9a3c', B: '#3d8bff', G: '#3fbf5f', N: '#8a5a2b', C: '#18b5c4', V: '#7b5cff', L: '#9be37a' };
/** symmetric blob sprite with a dark outline; grows and gets more colours with the level */
function genPic(L: number): string[] {
  const W = Math.min(16, 10 + Math.floor((L - 6) / 2)), H = W, k = Math.min(6, 2 + Math.floor((L - 6) / 2));
  const cols = shuffle(['R', 'Y', 'P', 'O', 'B', 'G', 'C', 'V', 'L']).slice(0, k);
  for (let t = 0; t < 60; t++) {
    let m = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => { const dx = Math.abs(x - (W - 1) / 2) / (W / 2), dy = Math.abs(y - (H - 1) / 2) / (H / 2); return Math.random() < .9 - (dx * dx + dy * dy) * .75; }));
    for (let it = 0; it < 3; it++) m = m.map((row, y) => row.map((v, x) => { let n = 0; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if ((a || b) && m[y + a]?.[x + b]) n++; return n >= 5 || (v && n >= 4); }));
    m = m.map(row => row.map((v, x) => x < W / 2 ? v : row[W - 1 - x]));              // mirror
    const n = m.flat().filter(Boolean).length; if (n < W * H * .45) continue;
    const edge = (x: number, y: number) => !m[y - 1]?.[x] || !m[y + 1]?.[x] || !m[y]?.[x - 1] || !m[y]?.[x + 1];
    const cx = (W - 1) / 2, cy = (H - 1) / 2, band = (x: number, y: number) => cols[Math.floor((Math.hypot((x - cx) * 1.2, y - cy) / (W / 2)) * k * .999 + (y > cy ? 1 : 0)) % k];
    return m.map((row, y) => row.map((v, x) => !v ? '.' : edge(x, y) ? 'K' : band(x, y)).join(''));
  }
  return PICS[0];
}
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

/** speckled egg the snake hatches from */
const eggSVG = (col: string) => { const d = shade(col, -.3), l = shade(col, .45); return `<svg viewBox="0 0 48 56"><ellipse cx="24" cy="52" rx="15" ry="3.5" fill="#000" opacity=".2"/>
  <path d="M24 4C13 4 6 22 6 34c0 11 8 18 18 18s18-7 18-18C42 22 35 4 24 4z" fill="${col}" stroke="${d}" stroke-width="2"/>
  <circle cx="16" cy="28" r="3" fill="${d}" opacity=".45"/><circle cx="31" cy="20" r="2.5" fill="${d}" opacity=".45"/><circle cx="29" cy="40" r="3.5" fill="${d}" opacity=".45"/><circle cx="18" cy="43" r="2" fill="${d}" opacity=".45"/>
  <path d="M14 18c2-6 5-9 9-10" stroke="${l}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".9"/></svg>`; };
/** cartoon boa head, facing right */
const headSVG = (col: string) => { const d = shade(col, -.35), l = shade(col, .4); return `<svg viewBox="0 0 60 50" class="boa"><path class="tongue" d="M50 27h9l3-3M59 27l3 3" stroke="#e8324a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M6 25C6 10 20 4 34 6c12 2 19 9 19 19s-7 17-19 19C20 46 6 40 6 25z" fill="${col}" stroke="${d}" stroke-width="2.5"/>
  <path d="M14 30c8 6 22 7 34 1" stroke="${d}" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="28" cy="38" rx="12" ry="4" fill="${l}" opacity=".7"/>
  <ellipse cx="24" cy="14" rx="7.5" ry="8.5" fill="#fff" stroke="${d}" stroke-width="1.6"/><ellipse cx="39" cy="15" rx="6.5" ry="7.5" fill="#fff" stroke="${d}" stroke-width="1.6"/>
  <circle cx="26" cy="15" r="4.2" fill="#1b1b1f"/><circle cx="40.5" cy="16" r="3.7" fill="#1b1b1f"/><circle cx="27.5" cy="13" r="1.5" fill="#fff"/><circle cx="41.8" cy="14" r="1.3" fill="#fff"/>
  <circle cx="49" cy="22" r="1.3" fill="${d}"/><circle cx="17" cy="27" r="3" fill="#ff8fab" opacity=".55"/></svg>`; };

const Snake: Game & Record<string, any> = {
  title: 'Пікс-змійки', theme: 'th-snake',
  start(el: HTMLElement) { this.el = el; this.load(); },
  stop() { this.dead = true; cancelAnimationFrame(this.raf); },
  load() {
    cancelAnimationFrame(this.raf);
    const L = this.lvl = store.get('sn_lvl', 1); this.dead = false; this.over = false;
    const pic = L <= PICS.length ? PICS[L - 1] : genPic(L); this.H = pic.length; this.W = pic[0].length;
    this.g = pic.flatMap(row => [...row].map(ch => ch === '.' ? null : ch));
    const count: Record<string, number> = {}; this.g.forEach((c: string) => c && (count[c] = (count[c] || 0) + 1));
    const lo = L < 3 ? 6 : 4, hi = L < 3 ? 14 : 10, all: Sn[] = [];
    for (const c in count) { let left = count[c]; while (left > 0) { const n = Math.min(left, lo + R(hi - lo + 1)); all.push({ c, n }); left -= n; } }
    this.lanes = Array.from({ length: L < 4 ? 3 : L < 10 ? 4 : 5 }, () => [] as Sn[]);
    shuffle(all).forEach((s, i) => this.lanes[i % this.lanes.length].push(s));
    this.cap = L < 6 ? 5 : 4; this.nest = [] as Sn[]; this.cont = false; this.runs = [] as Run[]; this.queue = [] as Sn[];
    this.el.innerHTML = `<div class="sx"><div class="px"><svg class="belt"></svg><div class="bricks"></div><div class="track"></div></div><div class="nest"></div><div class="lanes"></div></div>`;
    this.layout(); this.renderQ(); this.last = 0; this.loop(0);
    setTools([['Заново', () => this.load()]]);
  },
  layout() {
    const W = this.W, H = this.H, cs = this.cs = Math.floor(Math.min(this.el.clientWidth - 20, (this.el.clientHeight - 200)) / (W + 2));
    const px = this.el.querySelector('.px'); px.style.cssText = `width:${(W + 2) * cs}px;height:${(H + 2) * cs}px;--cs:${cs}px`;
    this.el.querySelector('.belt').innerHTML = `<rect x="${cs / 2}" y="${cs / 2}" width="${(W + 1) * cs}" height="${(H + 1) * cs}" rx="${cs * .6}" fill="none" stroke="#5a4c9c" stroke-width="${cs * .86}"/><rect x="${cs / 2}" y="${cs / 2}" width="${(W + 1) * cs}" height="${(H + 1) * cs}" rx="${cs * .6}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2" stroke-dasharray="${cs * .3} ${cs * .4}" class="beltdash"/><g transform="translate(${cs / 2} ${(H + 1.5) * cs})"><circle r="${cs * .55}" fill="#ffd23f" stroke="#1b1b1f" stroke-width="2"/><path d="M${-cs * .22} ${cs * .1}a${cs * .25} ${cs * .25} 0 1 1 ${cs * .1} ${cs * .18}" fill="none" stroke="#1b1b1f" stroke-width="2.4" stroke-linecap="round"/><path d="M${-cs * .3} ${cs * .02}l${cs * .08} ${cs * .14} ${cs * .12} -${cs * .08}" fill="none" stroke="#1b1b1f" stroke-width="2.4" stroke-linecap="round"/></g>`;
    this.el.querySelector('.bricks').innerHTML = this.g.map((c: string, i: number) => c ? `<i data-i="${i}" style="left:${(i % W + 1) * cs}px;top:${(Math.floor(i / W) + 1) * cs}px;--c:${PAL[c]}"></i>` : '').join('');
    this.P = this.path();
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(this.g.filter(Boolean).length + ' цеглин')}`); },
  coil(s: Sn, attrs: string, small = false) { return `<button class="coil${small ? ' sm' : ''}" ${attrs}>${eggSVG(PAL[s.c])}<b>${s.n}</b></button>`; },
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
    this.crack(PAL[sn.c]);
    haptic(); this.queue.push(sn); this.renderQ();
  },
  crack(col: string) {
    const nest = this.el.querySelector('.px') as HTMLElement, e = document.createElement('div'); e.className = 'shell';
    e.innerHTML = `<i style="--c:${col}"></i><i style="--c:${col}"></i>`; nest.appendChild(e); setTimeout(() => e.remove(), 600);
  },
  spawn(sn: Sn) {
    const track = this.el.querySelector('.track'), segs: HTMLElement[] = [];
    const head = document.createElement('i'); head.className = 'head'; head.style.setProperty('--c', PAL[sn.c]); head.style.setProperty('--d', shade(PAL[sn.c], -.3));
    head.innerHTML = `${headSVG(PAL[sn.c])}<b>${sn.n}</b>`; track.appendChild(head);
    const body = Math.min(12, sn.n + 3);
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
      r.head.style.transform = `translate(${x}px,${y}px)`; r.head.style.setProperty('--rot', Math.atan2(dy, dx) + 'rad');
      r.segs.forEach((e, k) => { const ss = r.s - (k + 1) * GAP; if (ss < 0) { e.style.opacity = '0'; return; } const [sx, sy, ddx, ddy] = this.at(ss), w = Math.sin(this.last / 110 - k * .9) * this.cs * .14; e.style.opacity = '1'; e.style.transform = `translate(${sx - ddy * w}px,${sy + ddx * w}px)`; });
      if (r.s - (r.segs.length + 1) * GAP >= end) this.finish(r);
    }
  },
  bite(r: Run, p: any) {
    const t = this.facing(p.side, p.i);
    if (t < 0 || r.sn.n <= 0 || this.g[t] !== r.sn.c) return;
    this.g[t] = null; r.sn.n--; Score.good(3); r.head.querySelector('b')!.textContent = String(r.sn.n);
    if (r.segs.length > 3) r.segs.pop()?.remove();
    flash(r.head, 'chomp', 180); sfx('pop');
    const b = this.el.querySelector(`.bricks [data-i="${t}"]`) as HTMLElement;
    if (b) { const dx = p.x * this.cs - parseFloat(b.style.left), dy = p.y * this.cs - parseFloat(b.style.top); b.animate([{ transform: 'none' }, { transform: `translate(${dx}px,${dy}px) scale(.25)`, opacity: .2 }], { duration: 200, easing: 'ease-in' }).onfinish = () => b.remove(); }
    this.hud();
    if (r.sn.n <= 0) this.popRun(r);
    if (!this.g.some(Boolean) && !this.over) { this.over = true; done('sn_lvl', this.lvl, () => this.load()); }
  },
  /** a snake that has eaten everything pops right away and frees the belt */
  popRun(r: Run) {
    const i = this.runs.indexOf(r); if (i < 0) return; this.runs.splice(i, 1);
    [r.head, ...r.segs].forEach((e, k) => { e.style.transition = 'none'; e.classList.add('popped'); e.style.animationDelay = k * 25 + 'ms'; setTimeout(() => e.remove(), 380 + k * 25); });
    haptic('ok');
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
