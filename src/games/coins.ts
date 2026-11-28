// Coins: tap a compartment, then another — the top run of equal coins flies over.
// 10 equal coins in one compartment squash into one coin of the next value.
import './coins.css';
import { R, pick, sleep } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { coinStack, ensureCoinDefs, COIN_T, COIN_RY } from '../art/coin';
import { Score } from '../core/score';
import { sfx } from '../core/sfx';
import type { Game } from './registry';

const CAP = 10, VH = 112;

const Coins: Game & Record<string, any> = {
  title: 'Монети', theme: 'th-coins',
  start(el: HTMLElement) { ensureCoinDefs(); this.el = el; this.load(); },
  stop() { this.dead = true; document.querySelectorAll('.cflier').forEach(e => e.remove()); },
  load() {
    const L = this.lvl = store.get('co_lvl', 1);
    this.ns = L < 3 ? 6 : L < 6 ? 8 : L < 8 ? 9 : 12;                     // more compartments, added as new rows
    this.cols = this.ns === 8 || this.ns === 12 ? 4 : 3;
    this.goal = 3 + L * 2; this.kinds = Math.min(8, 3 + Math.floor(L / 2)); this.dn = 5 + Math.min(5, Math.floor(L / 2));
    this.merges = 0; this.sel = -1; this.cont = false; this.busy = false; this.dead = false;
    this.st = Array.from({ length: this.ns }, () => []);
    this.deal(); this.deal(); this.draw();
    setTools([['Роздати', () => this.dealBtn(), true], ['i:restart', () => { Score.lose(); this.load(); }]]);
  },
  free() { return this.st.reduce((s: number, x: number[]) => s + CAP - x.length, 0); },
  deal() {
    let left = this.dn; this.fresh = new Map<number, number>();
    const mark = (i: number) => { if (!this.fresh.has(i)) this.fresh.set(i, this.st[i].length); };
    while (left > 0) {
      const v = 1 + R(this.kinds), k = Math.min(left, 1 + R(3)), opts = this.st.map((_: any, i: number) => i).filter((i: number) => CAP - this.st[i].length >= k);
      if (!opts.length) { const any = this.st.findIndex((s: number[]) => s.length < CAP); if (any < 0) return; mark(any); this.st[any].push(v); left--; continue; }
      const i = pick(opts) as number; mark(i); for (let j = 0; j < k; j++) this.st[i].push(v); left -= k;
    }
  },
  async dealBtn() {
    if (this.busy) return;
    if (this.free() < this.dn) return this.over();
    this.sel = -1; this.deal(); haptic(); this.draw();
    await sleep(500); await this.mergeAll();
    if (this.free() < this.dn && !this.anyMove()) this.over();
  },
  run(i: number) { const s = this.st[i]; if (!s.length) return 0; let k = 1; while (k < s.length && s[s.length - 1 - k] === s[s.length - 1]) k++; return k; },
  canTo(a: number, b: number) { const s = this.st[a], t = this.st[b]; return s.length && t.length < CAP && (!t.length || t[t.length - 1] === s[s.length - 1]); },
  anyMove() { for (let a = 0; a < this.ns; a++) for (let b = 0; b < this.ns; b++) if (a !== b && this.canTo(a, b)) return true; return false; },
  full(i: number) { const s = this.st[i]; return s.length === CAP && s.every((x: number) => x === s[0]); },
  /** squash animation, then the 10 coins become one */
  async mergeAll() {
    const idx = this.st.map((_: any, i: number) => i).filter((i: number) => this.full(i));
    if (!idx.length) return;
    this.busy = true;
    idx.forEach((i: number) => this.cell(i)?.classList.add('collapse'));
    sfx('merge'); await sleep(620); if (this.dead) return;
    idx.forEach((i: number) => { this.st[i] = [this.st[i][0] + 1]; this.merges++; Score.good(40); });
    this.fresh = new Map(idx.map((i: number) => [i, 0])); this.draw();
    idx.forEach((i: number) => { const c = this.cell(i); flash(c, 'merge', 800); const t = document.createElement('b'); t.className = 'plus'; t.textContent = 'Злиття!'; c.appendChild(t); });
    this.busy = false; this.hud();
    if (this.merges >= this.goal) { this.merges = -99; done('co_lvl', this.lvl, () => this.load()); }
  },
  cell(i: number) { return this.el.querySelectorAll('.cell')[i] as HTMLElement; },
  /** page position of coin #k in compartment i */
  coinPt(i: number, k: number, lift = 0) {
    const r = this.cell(i).querySelector('svg')!.getBoundingClientRect(), sc = Math.min(r.width / 60, r.height / VH);
    const ox = r.left + (r.width - 60 * sc) / 2, oy = r.top + (r.height - VH * sc) / 2, base = VH - COIN_RY - 4;
    return { x: ox + 30 * sc, y: oy + (base - k * COIN_T + lift) * sc, sc };
  },
  async tap(i: number) {
    if (this.busy) return;
    if (this.sel < 0) { if (this.st[i].length) { this.sel = i; haptic(); this.draw(); } return; }
    if (this.sel === i) { this.sel = -1; this.draw(); return; }
    if (!this.canTo(this.sel, i)) { haptic('err'); Score.bad(); this.bad = i; this.sel = this.st[i].length ? i : -1; return this.draw(); }
    const a = this.sel, A = this.st[a], Bst = this.st[i], m = Math.min(this.run(a), CAP - Bst.length), b0 = Bst.length;
    const from = Array.from({ length: m }, (_, k) => this.coinPt(a, A.length - 1 - k, -12));
    Score.good(5);
    const vals: number[] = []; for (let j = 0; j < m; j++) { const v = A.pop(); vals.push(v); Bst.push(v); }
    this.sel = -1; this.busy = true; haptic();
    this.draw(new Map([[i, b0]]));
    const to = vals.map((_, k) => this.coinPt(i, b0 + k));
    await Promise.all(vals.map((v, k) => this.fly(v, from[k], to[k], k * 55)));
    if (this.dead) return;
    this.busy = false; this.draw();
    await this.mergeAll();
  },
  fly(v: number, p0: any, p1: any, delay: number) {
    const sc = p0.sc, w = 60 * sc, h = 24 * sc, e = document.createElement('div'); e.className = 'cflier';
    e.style.cssText = `width:${w}px;height:${h}px;left:${p0.x - w / 2}px;top:${p0.y - 12 * sc}px`;
    e.innerHTML = `<svg viewBox="0 0 60 24">${coinStack([v], 24)}</svg>`; document.body.appendChild(e);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, up = Math.min(dy, 0) - 46 * sc;
    const an = e.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx * .5}px,${up}px) scale(1.08)`, offset: .45 }, { transform: `translate(${dx}px,${dy}px)` }],
      { duration: 430, delay, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both' });
    return an.finished.catch(() => { }).then(() => e.remove());
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(`Злиття ${Math.max(0, this.merges)}/${this.goal}`)}`); },
  draw(hide?: Map<number, number>) {
    const sel = this.sel, k = sel >= 0 ? this.run(sel) : 0;
    this.el.innerHTML = `<div class="drawer" style="grid-template-columns:repeat(${this.cols},minmax(0,1fr));width:min(100%,${this.cols * 92}px)">${this.st.map((s: number[], i: number) =>
      `<button class="cell${i === sel ? ' sel' : ''}" data-i="${i}" aria-label="відсік ${i + 1}: ${s.length} монет"><svg viewBox="0 0 60 ${VH}">${coinStack(s, VH, i === sel ? s.length - k : Infinity, hide?.get(i) ?? Infinity, this.fresh?.get(i) ?? Infinity)}</svg><span class="cnt">${s.length}/${CAP}</span></button>`).join('')}</div>`;
    this.el.querySelectorAll('.cell').forEach((b: HTMLElement) => b.onclick = () => this.tap(+b.dataset.i));
    this.fresh = null;
    if (this.bad != null) { flash(this.cell(this.bad), 'shake', 350); this.bad = null; }
    this.hud();
  },
  over() {
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: звільнити відсік', () => Ads.rewarded(() => { this.cont = true; let w = 0; this.st.forEach((s: number[], i: number) => { if (new Set(s).size > new Set(this.st[w]).size) w = i; }); this.st[w] = []; this.draw(); })]);
    b.push(['Почати заново', () => { Score.lose(); this.load(); }]);
    modal('<h2>Каса переповнена</h2><p class="muted">Для нової роздачі не вистачає місця.</p>', b);
  },
};
export default Coins;
