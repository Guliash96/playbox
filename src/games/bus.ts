// Bus station: groups of 5 passengers stand in a queue yard. Tap a group with a free path to the
// platform: it walks out. Same colour as the bus at the stop → boards, otherwise waits on the platform.
// A bus holds 2–4 groups (10–20 people); when full it leaves and the next one pulls in.
import './bus.css';
import { R, pick, shuffle, sleep } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { busSVG, crowd } from '../art/bus';
import type { Game } from './registry';

const BUSC = ['#ff3d7f', '#2f9bff', '#ffb020', '#7b5cff', '#e8443a', '#18b5c4'];
const HOLD = 5;

function nbrs(i: number, W: number, H: number) { const r = Math.floor(i / W), c = i % W; return [[i - W, r > 0], [i + W, r < H - 1], [i - 1, c > 0], [i + 1, c < W - 1]].filter(x => x[1]).map(x => x[0] as number); }
/** BFS from a group through empty cells to the top row; returns path of cells (group first) or null */
function pathOut(g: number[], W: number, H: number, s: number): number[] | null {
  if (s < W) return [s];
  const prev = new Map<number, number>([[s, -1]]), q = [s];
  while (q.length) {
    const i = q.shift()!;
    for (const j of nbrs(i, W, H)) {
      if (prev.has(j) || g[j] !== 0) continue; prev.set(j, i);
      if (j < W) { const p = [j]; let k = i; while (k !== -1) { p.unshift(k); k = prev.get(k)!; } return p; }
      q.push(j);
    }
  }
  return null;
}
function generate(W: number, H: number, nc: number, k: number) {
  // random legal removal order, coloured in chunks of k → bus sequence; solvable with an empty platform
  for (let t = 0; t < 300; t++) {
    const N = W * H, g = Array(N).fill(1);
    let walls = R(4); for (const i of shuffle([...Array(N).keys()])) if (walls && i >= W * 2) { g[i] = -1; walls--; }
    let em = g.filter(x => x > 0).length % k + 2; for (const i of shuffle([...Array(N).keys()])) if (em && g[i] > 0) { g[i] = 0; em--; }
    const sim = g.slice(), order: number[] = [];
    for (; ;) { const acc = sim.map((v, i) => i).filter(i => sim[i] > 0 && pathOut(sim, W, H, i)); if (!acc.length) break; const i = pick(acc); order.push(i); sim[i] = 0; }
    if (sim.some(x => x > 0)) continue;
    const buses: number[] = []; let prev = -1;
    for (let b = 0; b < order.length / k; b++) { let c; do c = R(nc); while (c === prev && nc > 1); prev = c; buses.push(c); for (let j = 0; j < k; j++) g[order[b * k + j]] = c + 1; }
    return { g, buses };
  }
  throw new Error('bus gen');
}

const Bus: Game & Record<string, any> = {
  title: 'Автобуси', theme: 'th-bus',
  start(el: HTMLElement) { this.el = el; this.load(); this.ro = new ResizeObserver(() => !this.busy && this.layout()); this.ro.observe(el); },
  stop() { this.ro?.disconnect(); this.dead = true; document.querySelectorAll('.walker').forEach(g => g.remove()); },
  load() {
    const L = this.lvl = store.get('bj_lvl', 1);
    this.W = Math.min(7, 5 + Math.floor(L / 4)); this.H = Math.min(8, 5 + Math.floor(L / 2));
    this.k = L < 4 ? 2 : L < 8 ? 3 : 4;
    const r = generate(this.W, this.H, Math.min(6, 3 + Math.floor(L / 3)), this.k);
    this.g = r.g; this.buses = r.buses; this.bi = 0; this.seats = 0; this.hold = []; this.cap = HOLD; this.cont = false; this.busy = false; this.dead = false;
    this.el.innerHTML = `<div class="station"><div class="road"><div class="nextq"></div><div class="stop"></div></div><div class="plat"></div><div class="yard"></div></div>`;
    this.layout(); this.renderBus(true);
    setTools([['Заново', () => this.load()]]);
  },
  layout() {
    const st = this.el.querySelector('.station'), sw = this.el.clientWidth - 24, sh = this.el.clientHeight - 96 - 84 - 44;
    const cs = this.cs = Math.floor(Math.min(58, sw / this.W, sh / this.H));
    st.style.setProperty('--cs', cs + 'px'); st.style.width = Math.max(cs * this.W + 16, Math.min(sw, 360)) + 'px';
    this.renderHold(); this.renderYard(); this.hud();
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(`Бус ${Math.min(this.bi + 1, this.buses.length)}/${this.buses.length}`)}`); },
  renderBus(enter = false) {
    const stop = this.el.querySelector('.stop'), c = this.buses[this.bi];
    this.el.querySelector('.nextq').innerHTML = this.buses.slice(this.bi + 1, this.bi + 4).map((b: number) => `<span class="mini">${busSVG(BUSC[b], this.k, [])}</span>`).join('');
    if (c == null) { stop.innerHTML = ''; return; }
    const filled = Array.from({ length: this.k }, (_, i) => i < this.seats - (this.pend?.bus ? 1 : 0) ? BUSC[c] : null);
    stop.innerHTML = `<div class="busEl${enter ? ' enter' : ''}">${busSVG(BUSC[c], this.k, filled, `${(this.seats - (this.pend?.bus ? 1 : 0)) * 5}/${this.k * 5}`)}</div>`;
  },
  renderHold() {
    this.el.querySelector('.plat').innerHTML = Array.from({ length: this.cap }, (_, i) =>
      `<i class="slot">${this.hold[i] != null && !(this.pend?.hold === i) ? crowd(BUSC[this.hold[i]]) : ''}</i>`).join('');
  },
  renderYard() {
    const y = this.el.querySelector('.yard');
    y.style.gridTemplateColumns = `repeat(${this.W},var(--cs))`;
    y.innerHTML = this.g.map((v: number, i: number) => v < 0 ? '<i class="w"></i>' : v === 0 ? '<i class="e"></i>' :
      `<button data-i="${i}" class="${pathOut(this.g, this.W, this.H, i) ? '' : 'lock'}" aria-label="група з 5 пасажирів">${crowd(BUSC[v - 1])}</button>`).join('');
    y.querySelectorAll('button').forEach((b: HTMLElement) => b.onclick = () => this.tap(+b.dataset.i));
  },
  center(el: Element) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  async walk(from: Element, pts: number[][], color: string, ms: number[]) {
    const cs = this.cs, gh = document.createElement('div'); gh.className = 'walker';
    gh.style.cssText = `width:${cs}px;height:${cs}px;left:${pts[0][0] - cs / 2}px;top:${pts[0][1] - cs / 2}px`;
    gh.innerHTML = crowd(color); document.body.appendChild(gh);
    const frames = pts.map(([x, y]) => ({ transform: `translate(${x - pts[0][0]}px,${y - pts[0][1]}px)` }));
    const total = ms.reduce((a, b) => a + b, 0); let acc = 0;
    const kf = frames.map((f, i) => { const o = { ...f, offset: total ? acc / total : 0 }; acc += ms[i] || 0; return o; });
    kf[kf.length - 1].offset = 1;
    await gh.animate(kf, { duration: total, easing: 'linear', fill: 'forwards' }).finished.catch(() => { });
    gh.remove();
  },
  async tap(i: number) {
    if (this.busy || this.dead) return;
    const path = pathOut(this.g, this.W, this.H, i), btn = this.el.querySelector(`[data-i="${i}"]`);
    if (!path) { haptic('err'); return flash(btn, 'shake'); }
    this.busy = true; haptic();
    const col = this.g[i] - 1, yard = this.el.querySelector('.yard'), cells = yard.children;
    const pts = path.map(j => this.center(cells[j])); const top = pts[pts.length - 1]; pts.push([top[0], top[1] - this.cs * .9]);
    const toBus = col === this.buses[this.bi] && this.seats < this.k;
    if (toBus) { this.seats++; this.pend = { bus: true }; } else { this.hold.push(col); this.pend = { hold: this.hold.length - 1 }; }
    this.g[i] = 0; this.renderYard(); this.renderBus(); this.renderHold();
    const dest = toBus ? this.doorPt() : this.center(this.el.querySelectorAll('.plat .slot')[this.pend.hold]);
    pts.push(dest);
    await this.walk(btn, pts, BUSC[col], [...path.map(() => 85), 160, 260]);
    if (this.dead) return;
    this.pend = null; this.renderBus(); this.renderHold();
    if (toBus && this.seats >= this.k) await this.depart();
    this.busy = false; this.hud();
    if (this.bi >= this.buses.length) return done('bj_lvl', this.lvl, () => this.load());
    if (this.hold.length >= this.cap) setTimeout(() => this.fail(), 250);
  },
  doorPt() { const b = this.el.querySelector('.busEl').getBoundingClientRect(); return [b.left + b.width * .78, b.top + b.height * .55]; },
  async depart() {
    while (this.seats >= this.k) {
      haptic('ok');
      const b = this.el.querySelector('.busEl');
      await b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(120vw)' }], { duration: 650, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' }).finished.catch(() => { });
      if (this.dead) return;
      this.bi++; this.seats = 0; this.hud();
      if (this.bi >= this.buses.length) { this.renderBus(); return; }
      this.renderBus(true); await sleep(520);
      // waiting groups of the new colour board automatically
      const c = this.buses[this.bi];
      for (let h = 0; h < this.hold.length && this.seats < this.k; h++) {
        if (this.hold[h] !== c) continue;
        const from = this.center(this.el.querySelectorAll('.plat .slot')[h]);
        this.hold.splice(h, 1); h--; this.seats++; this.pend = { bus: true }; this.renderHold(); this.renderBus();
        await this.walk(null, [from, this.doorPt()], BUSC[c], [0, 280]);
        if (this.dead) return;
        this.pend = null; this.renderBus();
      }
    }
  },
  fail() {
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +1 місце на платформі', () => Ads.rewarded(() => { this.cont = true; this.cap++; this.renderHold(); })]);
    b.push(['Почати заново', () => this.load()]);
    modal('<h2>Платформа переповнена</h2><p class="muted">Усі місця очікування зайняті.</p>', b);
  },
};
export default Bus;
