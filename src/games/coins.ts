// Coins: tap a compartment, then another — top run of equal coins moves over.
// 10 equal coins in one compartment merge into one coin of the next value.
import './coins.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { coinStack, ensureCoinDefs } from '../art/coin';
import type { Game } from './registry';

const CAP = 10, VH = 112;

const Coins: Game & Record<string, any> = {
  title: 'Монети', theme: 'th-coins',
  start(el: HTMLElement) { ensureCoinDefs(); this.el = el; this.load(); },
  load() {
    const L = this.lvl = store.get('co_lvl', 1);
    this.ns = L < 3 ? 6 : L < 6 ? 8 : L < 8 ? 9 : 12;                     // more compartments, added as new rows
    this.cols = this.ns === 8 || this.ns === 12 ? 4 : 3;
    this.goal = 3 + L * 2; this.kinds = Math.min(8, 3 + Math.floor(L / 2)); this.dn = 5 + Math.min(5, Math.floor(L / 2));
    this.merges = 0; this.sel = -1; this.cont = false; this.st = Array.from({ length: this.ns }, () => []);
    this.deal(); this.deal(); this.draw();
    setTools([['Роздати', () => this.dealBtn(), true], ['Заново', () => this.load()]]);
  },
  free() { return this.st.reduce((s: number, x: number[]) => s + CAP - x.length, 0); },
  deal() {
    let left = this.dn; this.fresh = new Set<number>();
    while (left > 0) {
      const v = 1 + R(this.kinds), k = Math.min(left, 1 + R(3)), opts = this.st.map((_: any, i: number) => i).filter((i: number) => CAP - this.st[i].length >= k);
      if (!opts.length) { const any = this.st.findIndex((s: number[]) => s.length < CAP); if (any < 0) return; this.st[any].push(v); this.fresh.add(any); left--; continue; }
      const i = pick(opts) as number; for (let j = 0; j < k; j++) this.st[i].push(v); this.fresh.add(i); left -= k;
    }
    this.st.forEach((_: any, i: number) => this.merge(i));
  },
  dealBtn() { if (this.free() < this.dn) return this.over(); this.sel = -1; this.deal(); haptic(); this.draw(); if (this.free() < this.dn && !this.anyMove()) this.over(); },
  run(i: number) { const s = this.st[i]; if (!s.length) return 0; let k = 1; while (k < s.length && s[s.length - 1 - k] === s[s.length - 1]) k++; return k; },
  canTo(a: number, b: number) { const s = this.st[a], t = this.st[b]; return s.length && t.length < CAP && (!t.length || t[t.length - 1] === s[s.length - 1]); },
  anyMove() { for (let a = 0; a < this.ns; a++) for (let b = 0; b < this.ns; b++) if (a !== b && this.canTo(a, b)) return true; return false; },
  merge(i: number) {
    const s = this.st[i];
    if (s.length === CAP && s.every((x: number) => x === s[0])) { this.st[i] = [s[0] + 1]; this.merges++; (this.merged ||= []).push(i); haptic('ok'); return true; }
    return false;
  },
  tap(i: number) {
    if (this.sel < 0) { if (this.st[i].length) { this.sel = i; haptic(); } }
    else if (this.sel === i) this.sel = -1;
    else if (this.canTo(this.sel, i)) {
      const a = this.st[this.sel], b = this.st[i], m = Math.min(this.run(this.sel), CAP - b.length);
      for (let j = 0; j < m; j++) b.push(a.pop()); this.sel = -1; this.fresh = new Set([i]); haptic(); this.merge(i);
    } else { haptic('err'); this.bad = i; this.sel = this.st[i].length ? i : -1; }
    this.draw();
    if (this.merges >= this.goal) { this.merges = -99; done('co_lvl', this.lvl, () => this.load()); }
  },
  draw() {
    const sel = this.sel, k = sel >= 0 ? this.run(sel) : 0;
    this.el.innerHTML = `<div class="drawer" style="grid-template-columns:repeat(${this.cols},minmax(0,1fr));width:min(100%,${this.cols * 92}px)">${this.st.map((s: number[], i: number) =>
      `<button class="cell${i === sel ? ' sel' : ''}${this.fresh?.has(i) ? ' fresh' : ''}" data-i="${i}" aria-label="відсік ${i + 1}: ${s.length} монет"><svg viewBox="0 0 60 ${VH}">${coinStack(s, VH, i === sel ? s.length - k : Infinity)}</svg><span class="cnt">${s.length}/${CAP}</span></button>`).join('')}</div>`;
    this.el.querySelectorAll('.cell').forEach((b: HTMLElement) => b.onclick = () => this.tap(+b.dataset.i));
    (this.merged || []).forEach((i: number) => { const c = this.el.querySelectorAll('.cell')[i]; flash(c, 'merge', 700); const t = document.createElement('b'); t.className = 'plus'; t.textContent = 'Злиття!'; c.appendChild(t); });
    this.merged = []; this.fresh = null;
    if (this.bad != null) { flash(this.el.querySelectorAll('.cell')[this.bad], 'shake', 350); this.bad = null; }
    setStats(`${pill('Рів. ' + this.lvl)}${pill(`Злиття ${Math.max(0, this.merges)}/${this.goal}`)}`);
  },
  over() {
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: звільнити відсік', () => Ads.rewarded(() => { this.cont = true; let w = 0; this.st.forEach((s: number[], i: number) => { if (new Set(s).size > new Set(this.st[w]).size) w = i; }); this.st[w] = []; this.draw(); })]);
    b.push(['Почати заново', () => this.load()]);
    modal('<h2>Каса переповнена</h2><p class="muted">Для нової роздачі не вистачає місця.</p>', b);
  },
};
export default Coins;
