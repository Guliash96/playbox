// Pixel snakes: a pixel picture made of bricks. Launch a numbered snake: it crawls one lap around the
// picture and on every step bites the first brick it faces if the colour matches (number = bites left).
// Leftover snakes wait in the nest; nest full → fail. Clear the picture to win.
import './snake.css';
import { R, shuffle, sleep } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, toast, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
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

const Snake: Game & Record<string, any> = {
  title: 'Пікс-змійки', theme: 'th-snake',
  start(el: HTMLElement) { this.el = el; this.load(); },
  stop() { this.dead = true; },
  load() {
    const L = this.lvl = store.get('sn_lvl', 1); this.dead = false; this.busy = false;
    const pic = PICS[(L - 1) % PICS.length]; this.H = pic.length; this.W = pic[0].length;
    this.g = pic.flatMap(row => [...row].map(ch => ch === '.' ? null : ch));
    // snakes: split each colour's brick count into chunks
    const count: Record<string, number> = {}; this.g.forEach((c: string) => c && (count[c] = (count[c] || 0) + 1));
    const lo = L < 3 ? 6 : 4, hi = L < 3 ? 14 : 10, all: Sn[] = [];
    for (const c in count) { let left = count[c]; while (left > 0) { const n = Math.min(left, lo + R(hi - lo + 1)); all.push({ c, n }); left -= n; } }
    this.lanes = Array.from({ length: L < 4 ? 3 : 4 }, () => [] as Sn[]);
    shuffle(all).forEach((s, i) => this.lanes[i % this.lanes.length].push(s));
    this.cap = L < 6 ? 5 : 4; this.nest = [] as Sn[]; this.cont = false;
    this.el.innerHTML = `<div class="sx"><div class="px"><div class="bricks"></div><div class="track"></div></div><div class="nest"></div><div class="lanes"></div></div>`;
    this.layout(); this.renderQ();
    setTools([['Заново', () => this.load()]]);
  },
  layout() {
    const W = this.W, H = this.H, cs = this.cs = Math.floor(Math.min(this.el.clientWidth - 20, (this.el.clientHeight - 190)) / (W + 2));
    const px = this.el.querySelector('.px'); px.style.cssText = `width:${(W + 2) * cs}px;height:${(H + 2) * cs}px;--cs:${cs}px`;
    this.el.querySelector('.bricks').innerHTML = this.g.map((c: string, i: number) => c ? `<i data-i="${i}" style="left:${(i % W + 1) * cs}px;top:${(Math.floor(i / W) + 1) * cs}px;--c:${PAL[c]}"></i>` : '').join('');
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(this.g.filter(Boolean).length + ' цеглин')}`); },
  coil(s: Sn, attrs: string) { return `<button class="coil" ${attrs} style="--c:${PAL[s.c]}"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke="var(--c)" stroke-width="8" stroke-dasharray="70 8"/><circle cx="31" cy="12" r="6" fill="var(--c)"/><circle cx="33" cy="10.5" r="1.6" fill="#fff"/></svg><b>${s.n}</b></button>`; },
  renderQ() {
    this.el.querySelector('.nest').innerHTML = Array.from({ length: this.cap }, (_, i) => `<span class="nslot">${this.nest[i] ? this.coil(this.nest[i], `data-n="${i}"`) : ''}</span>`).join('');
    this.el.querySelector('.lanes').innerHTML = this.lanes.map((ln: Sn[], li: number) => `<div class="lane">${ln.slice(0, 3).map((s, k) => this.coil(s, k ? 'disabled' : `data-l="${li}"`)).join('')}</div>`).join('');
    this.el.querySelectorAll('[data-l]').forEach((b: HTMLElement) => b.onclick = () => this.launch(this.lanes[+b.dataset.l].shift(), () => { }));
    this.el.querySelectorAll('[data-n]').forEach((b: HTMLElement) => b.onclick = () => { const s = this.nest.splice(+b.dataset.n, 1)[0]; this.launch(s, () => { }); });
    this.hud();
  },
  path() {
    const W = this.W, H = this.H, p: { x: number; y: number; side: number; i: number }[] = [];
    for (let i = -1; i <= W; i++) p.push({ x: i + 1, y: H + 1, side: 0, i });          // bottom, looking up
    for (let i = H - 1; i >= -1; i--) p.push({ x: W + 1, y: i + 1, side: 1, i });      // right, looking left
    for (let i = W - 1; i >= -1; i--) p.push({ x: i + 1, y: 0, side: 2, i });          // top, looking down
    for (let i = 0; i < H; i++) p.push({ x: 0, y: i + 1, side: 3, i });                // left, looking right
    return p;
  },
  facing(side: number, i: number) {
    const W = this.W, H = this.H;
    if (i < 0 || (side % 2 === 0 ? i >= W : i >= H)) return -1;
    const seq = side === 0 ? [...Array(H).keys()].reverse().map(r => r * W + i) : side === 2 ? [...Array(H).keys()].map(r => r * W + i)
      : side === 1 ? [...Array(W).keys()].reverse().map(c => i * W + c) : [...Array(W).keys()].map(c => i * W + c);
    return seq.find(k => this.g[k]) ?? -1;
  },
  async launch(s: Sn, _cb: () => void) {
    if (this.busy || !s) return; this.busy = true; haptic(); this.renderQ();
    const cs = this.cs, track = this.el.querySelector('.track'), segs: HTMLElement[] = [];
    for (let k = 0; k < 5; k++) { const e = document.createElement('i'); e.className = k ? 'seg' : 'seg head'; e.style.cssText = `--c:${PAL[s.c]};opacity:0`; if (!k) e.innerHTML = `<b>${s.n}</b>`; track.appendChild(e); segs.push(e); }
    const P = this.path(), hist: number[][] = [];
    for (const p of P) {
      if (this.dead) return;
      hist.unshift([p.x * cs, p.y * cs]);
      segs.forEach((e, k) => { const h = hist[k]; if (h) { e.style.left = h[0] + 'px'; e.style.top = h[1] + 'px'; e.style.opacity = '1'; } });
      const t = this.facing(p.side, p.i);
      if (t >= 0 && s.n > 0 && this.g[t] === s.c) {
        this.g[t] = null; s.n--; segs[0].querySelector('b')!.textContent = String(s.n);
        const b = this.el.querySelector(`.bricks [data-i="${t}"]`); if (b) { b.classList.add('eat'); setTimeout(() => b.remove(), 250); }
        flash(segs[0], 'chomp', 200); haptic(); this.hud();
      }
      await sleep(42);
    }
    segs.forEach(e => e.remove());
    if (this.dead) return;
    this.busy = false;
    if (!this.g.some(Boolean)) return done('sn_lvl', this.lvl, () => this.load());
    if (s.n > 0) {
      if (this.nest.length < this.cap) { this.nest.push(s); this.renderQ(); }
      else return this.fail(s);
    } else this.renderQ();
    if (!this.lanes.some((l: Sn[]) => l.length) && !this.nest.length) toast('Змійки скінчились');
  },
  fail(s: Sn) {
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +1 місце в гнізді', () => Ads.rewarded(() => { this.cont = true; this.cap++; this.nest.push(s); this.renderQ(); })]);
    b.push(['Почати заново', () => this.load()]);
    modal('<h2>Гніздо переповнене</h2><p class="muted">Змійці нікуди повернутися.</p>', b);
  },
};
export default Snake;
