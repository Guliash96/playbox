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
import { Score } from '../core/score';
import type { Game } from './registry';

const BUSC = ['#ff3d7f', '#2f9bff', '#ffb020', '#7b5cff', '#e8443a', '#18b5c4'];
const HOLD = 5;

function nbrs(i: number, W: number, H: number) { const r = Math.floor(i / W), c = i % W; return [[i - W, r > 0], [i + W, r < H - 1], [i - 1, c > 0], [i + 1, c < W - 1]].filter(x => x[1]).map(x => x[0] as number); }
/** a group can leave only if every cell above it in its column is empty (queues are columns) */
function pathOut(g: number[], W: number, _H: number, s: number): number[] | null {
  const c = s % W, p = [s];
  for (let y = Math.floor(s / W) - 1; y >= 0; y--) { const j = y * W + c; if (g[j] !== 0) return null; p.push(j); }
  return p;
}
function generate(W: number, H: number, nc: number, k: number) {
  // random legal removal order, coloured in chunks of k → bus sequence; solvable with an empty platform
  for (let t = 0; t < 300; t++) {
    const N = W * H, g = Array(N).fill(1);
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
  start(el: HTMLElement) { this.el = el; this.load(); this.ro = new ResizeObserver(() => this.layout()); this.ro.observe(el); },
  stop() { this.ro?.disconnect(); this.dead = true; document.querySelectorAll('.walker').forEach(g => g.remove()); },
  load() {
    document.querySelectorAll('.walker').forEach(g => g.remove());
    const L = this.lvl = store.get('bj_lvl', 1);
    this.W = Math.min(7, 5 + Math.floor(L / 4)); this.H = Math.min(8, 5 + Math.floor(L / 2));
    this.k = L < 4 ? 2 : L < 8 ? 3 : 4;
    const r = generate(this.W, this.H, Math.min(6, 3 + Math.floor(L / 3)), this.k);
    this.g = r.g; this.buses = r.buses; this.bi = 0; this.seats = 0; this.seated = 0; this.ready = false;
    this.hold = [] as { c: number; here: boolean }[]; this.cap = HOLD; this.cont = false; this.dead = false; this.over = false;
    this.el.innerHTML = `<div class="station"><div class="road"><div class="nextq"></div><div class="stop"></div></div><div class="plat"></div><div class="yard"></div></div>`;
    this.layout(); this.renderBus(true); setTimeout(() => { this.ready = true; }, 450);
    setTools([['Заново', () => this.load()]]);
  },
  layout() {
    const st = this.el.querySelector('.station'); if (!st) return;
    const sw = this.el.clientWidth - 24, sh = this.el.clientHeight - 104 - 84 - 44;
    const cs = this.cs = Math.floor(Math.min(58, sw / this.W, sh / this.H));
    st.style.setProperty('--cs', cs + 'px'); st.style.width = Math.max(cs * this.W + 16, Math.min(sw, 360)) + 'px';
    this.renderHold(); this.renderYard(); this.hud();
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(`Бус ${Math.min(this.bi + 1, this.buses.length)}/${this.buses.length}`)}`); },
  renderBus(enter = false) {
    const stop = this.el.querySelector('.stop'), c = this.buses[this.bi];
    this.el.querySelector('.nextq').innerHTML = `<span class="lbl">Далі:</span>` + this.buses.slice(this.bi + 1, this.bi + 5).map((b: number) => `<span class="mini">${busSVG(BUSC[b], this.k, [])}</span>`).join('');
    if (c == null) { stop.innerHTML = ''; return; }
    const filled = Array.from({ length: this.k }, (_, i) => i < this.seated ? BUSC[c] : null);
    const html = busSVG(BUSC[c], this.k, filled, `${this.seated * 5}/${this.k * 5}`);
    const cur = stop.querySelector('.busEl');
    if (cur && !enter) { cur.innerHTML = html; return; }
    stop.innerHTML = `<div class="busEl${enter ? ' enter' : ''}">${html}</div>`;
  },
  renderHold() {
    this.el.querySelector('.plat').innerHTML = Array.from({ length: this.cap }, (_, i) =>
      `<i class="slot">${this.hold[i]?.here ? crowd(BUSC[this.hold[i].c]) : ''}</i>`).join('');
  },
  renderYard() {
    const y = this.el.querySelector('.yard');
    y.style.gridTemplateColumns = `repeat(${this.W},var(--cs))`;
    y.innerHTML = this.g.map((v: number, i: number) => v < 0 ? '<i class="w"></i>' : v === 0 ? '<i class="e"></i>' :
      `<button data-i="${i}" class="${pathOut(this.g, this.W, this.H, i) ? '' : 'lock'}" aria-label="група з 5 пасажирів">${crowd(BUSC[v - 1])}</button>`).join('');
    y.querySelectorAll('button').forEach((b: HTMLElement) => b.onpointerdown = (e: Event) => { e.preventDefault(); this.tap(+b.dataset.i!); });
  },
  center(el: Element) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; },
  walk(pts: number[][], color: string, ms: number[]) {
    const cs = this.cs, gh = document.createElement('div'); gh.className = 'walker';
    gh.style.cssText = `width:${cs}px;height:${cs}px;left:${pts[0][0] - cs / 2}px;top:${pts[0][1] - cs / 2}px`;
    gh.innerHTML = crowd(color); document.body.appendChild(gh);
    const total = ms.reduce((a, b) => a + b, 0); let acc = 0;
    const kf = pts.map(([x, y], i) => { const o: Keyframe = { transform: `translate(${x - pts[0][0]}px,${y - pts[0][1]}px)`, offset: total ? acc / total : 0 }; acc += ms[i] || 0; return o; });
    kf[kf.length - 1].offset = 1;
    return gh.animate(kf, { duration: total, easing: 'linear', fill: 'forwards' }).finished.catch(() => { }).then(() => gh.remove());
  },
  doorPt() { const b = this.el.querySelector('.busEl')?.getBoundingClientRect(); return b ? [b.left + b.width * .78, b.top + b.height * .55] : [innerWidth / 2, 120]; },
  /** several groups can walk at once; seats/hold places are reserved at tap time */
  tap(i: number) {
    if (this.dead || this.over) return;
    const path = pathOut(this.g, this.W, this.H, i), btn = this.el.querySelector(`[data-i="${i}"]`);
    if (!path) { haptic('err'); return flash(btn, 'shake'); }
    const col = this.g[i] - 1, toBus = this.ready && col === this.buses[this.bi] && this.seats < this.k;
    if (!toBus && this.hold.length >= this.cap) { haptic('err'); return flash(this.el.querySelector('.plat'), 'shake'); }
    haptic();
    const cells = this.el.querySelector('.yard').children;
    const pts = path.map(j => this.center(cells[j])), top = pts[pts.length - 1]; pts.push([top[0], top[1] - this.cs * .9]);
    let slot: { c: number; here: boolean } | null = null;
    if (toBus) { this.seats++; pts.push(this.doorPt()); Score.good(10); }
    else { Score.bad(); slot = { c: col, here: false }; this.hold.push(slot); pts.push(this.center(this.el.querySelectorAll('.plat .slot')[this.hold.length - 1])); }
    this.g[i] = 0; this.renderYard();
    this.walk(pts, BUSC[col], [...path.map(() => 70), 140, 230]).then(() => {
      if (this.dead) return;
      if (toBus) { this.seated++; this.renderBus(); this.maybeDepart(); }
      else { slot!.here = true; this.renderHold(); this.checkFail(); }
    });
  },
  async maybeDepart() {
    if (!this.ready || this.seats < this.k || this.seated < this.k) return;
    this.ready = false; haptic('ok');
    const b = this.el.querySelector('.busEl');
    await b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(120vw)' }], { duration: 1000, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards' }).finished.catch(() => { });
    if (this.dead) return;
    this.bi++; this.seats = 0; this.seated = 0; this.hud();
    if (this.bi >= this.buses.length) { this.renderBus(); this.over = true; return done('bj_lvl', this.lvl, () => this.load()); }
    this.renderBus(true); await sleep(820); if (this.dead) return;
    this.ready = true;
    // groups waiting on the platform board the new bus automatically
    const c = this.buses[this.bi];
    for (const h of this.hold.filter((h: any) => h.here && h.c === c)) {
      if (this.seats >= this.k) break;
      const from = this.center(this.el.querySelectorAll('.plat .slot')[this.hold.indexOf(h)]);
      this.hold.splice(this.hold.indexOf(h), 1); this.seats++; this.renderHold();
      this.walk([from, this.doorPt()], BUSC[c], [0, 260]).then(() => { if (this.dead) return; this.seated++; this.renderBus(); this.maybeDepart(); });
      await sleep(90);
    }
    this.checkFail();
  },
  checkFail() {
    if (!this.ready || this.over || this.hold.length < this.cap || this.hold.some((h: any) => !h.here || h.c === this.buses[this.bi])) return;
    this.over = true; setTimeout(() => this.fail(), 250);
  },
  fail() {
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: +1 місце на платформі', () => Ads.rewarded(() => { this.cont = true; this.over = false; this.cap++; this.renderHold(); })]);
    b.push(['Почати заново', () => this.load()]);
    modal('<h2>Платформа переповнена</h2><p class="muted">Усі місця очікування зайняті.</p>', b);
  },
};
export default Bus;
