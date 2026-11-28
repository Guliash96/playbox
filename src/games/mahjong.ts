// Mahjong Match: tiles start face-down. Tap a free tile to flip it; tap an open tile to put it in the 4-slot tray.
// A flipped tile that matches one in the tray jumps there by itself and the pair vanishes. Flipping another
// tile turns the previous one back down; a tile flipped 3 times stays open. 4 different tiles in the tray = lose.
import './mahjong.css';
import { shuffle, range, sleep } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, toast, pill, flash } from '../core/ui';
import { Settings, menuExtra } from '../core/settings';
import { useBooster, inv } from '../core/wallet';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { Score } from '../core/score';
import { mjFace, MJ_BACK, MJ_FACES } from '../art/mahjong';
import { t } from '../core/i18n';
import type { Game } from './registry';

const SLOTS = 4;
const B = { hint: ['mj_hint', 'Підказка', 15, 3], shuffle: ['mj_shuffle', 'Перемішати', 20, 2], undo: ['mj_undo', 'Повернути', 10, 3] } as const;
const K = (r: number, c: number, z: number) => `${r},${c},${z}`, P = (k: string) => k.split(',').map(Number);
interface Tile { k: string; f: number; open: boolean; perm: boolean; seen: number }

/** free = nothing on top (upper layers sit half a tile offset) and the left or the right side is open */
const isFree = (k: string, alive: Set<string>) => {
  const [r, c, z] = P(k); for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (alive.has(K(r + dr, c + dc, z + 1))) return false;
  return !alive.has(K(r, c - 2, z)) || !alive.has(K(r, c + 2, z));
};
/** remove random free pairs until empty and stamp faces on them → the board is always solvable */
function assign(pos: string[], faces: number[]): Record<string, number> {
  for (let t = 0; t < 300; t++) {
    const alive = new Set(pos), res: Record<string, number> = {}, s = shuffle(faces.slice()); let ok = true;
    while (alive.size) {
      const fr = shuffle([...alive].filter(k => isFree(k, alive))); if (fr.length < 2) { ok = false; break; }
      const v = s.pop()!; res[fr[0]] = v; res[fr[1]] = v; alive.delete(fr[0]); alive.delete(fr[1]);
    }
    if (ok) return res;
  }
  return Object.fromEntries(pos.map((k, i) => [k, faces[i >> 1]]));
}
function layout(L: number) {
  const W = L < 2 ? 5 : L < 4 ? 6 : 7, H = L < 2 ? 4 : L < 5 ? 5 : 6, pos: string[] = [];
  for (let z = 0; z < 4; z++) {
    const w = W - 2 * z + (z ? 1 : 0), h = H - 2 * z + (z ? 1 : 0); if (w <= 0 || h <= 0) break;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) pos.push(K(r * 2 + z * 2 - (z ? 1 : 0), c * 2 + z * 2 - (z ? 1 : 0), z));
  }
  if (pos.length % 2) pos.pop();
  return { W, H, pos };
}

const Mahjong: Game & Record<string, any> = {
  title: 'Маджонг', theme: 'th-mahjong',
  start(el: HTMLElement) {
    this.el = el; this.load(); this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(el);
    menuExtra.highlight = true; menuExtra.items = [['Почати заново', () => { Score.lose(); this.load(); }]];
    this.onSet = () => this.draw(); document.addEventListener('settings', this.onSet);
  },
  stop() { this.ro?.disconnect(); this.dead = true; document.removeEventListener('settings', this.onSet); document.querySelectorAll('.mjfly').forEach(e => e.remove()); },
  load() {
    this.dead = false; const L = this.lvl = store.get('mj_lvl', 1), { W, H, pos } = layout(L); this.W = W; this.H = H;
    const kinds = Math.min(MJ_FACES.length, 6 + L * 2), order = shuffle(range(MJ_FACES.length)).slice(0, kinds);
    const faces = assign(pos, range(pos.length / 2).map(i => order[i % kinds]));
    this.tiles = new Map<string, Tile>(pos.map(k => [k, { k, f: faces[k], open: false, perm: false, seen: 0 }]));
    // a few tiles start open so the first moves are not blind
    shuffle([...this.tiles.values()]).slice(0, Math.max(2, Math.round(pos.length * .12))).forEach((x: Tile) => { x.open = x.perm = true; });
    this.tray = [] as Tile[]; this.peek = null; this.busy = false; this.cont = false; this.auto = false; this.total = pos.length;
    this.el.innerHTML = `<div class="mjwrap"><div class="tray">${range(SLOTS).map(() => '<i class="tslot"></i>').join('')}<div class="titems"></div></div><div class="mj"></div></div>`;
    this.draw(); this.tools();
  },
  tools() {
    const use = (b: readonly [string, string, number, number], fn: () => void, ok = true) => () => { if (this.busy || this.dead) return; if (!ok) { haptic('err'); return; } useBooster(b[0], b[1], b[2], b[3], fn, () => this.tools()); };
    setTools([['i:undo', use(B.undo, () => this.undo(), this.tray.length > 0), false, inv(B.undo[0], B.undo[3]) || '+'],
      ['i:hint', use(B.hint, () => this.hint()), false, inv(B.hint[0], B.hint[3]) || '+'],
      ['i:shuffle', use(B.shuffle, () => this.reshuffle()), false, inv(B.shuffle[0], B.shuffle[3]) || '+']]);
  },
  /** the right-most tile in the tray goes back to its place, face up */
  undo() {
    const x: Tile = this.tray.pop(); if (!x) return;
    x.open = x.perm = true; this.tiles.set(x.k, x); this.draw(); haptic(); this.tools();
  },
  alive() { return new Set(this.tiles.keys()); },
  draw() {
    if (!this.tiles) return;
    const a = this.alive(), sw = this.el.clientWidth - 24, sh = this.el.clientHeight - 120;
    const unit = Math.max(13, Math.min(40, Math.floor(sw / (this.W * 2 + .6)), Math.floor(sh / ((this.H * 2 + .6) * 1.3))));
    this.el.querySelector('.mjwrap').classList.toggle('nohl', !Settings.hl());
    const tw = unit * 2, th = Math.round(unit * 2.6); this.tw = tw; this.th = th;
    const mj = this.el.querySelector('.mj');
    mj.style.cssText = `width:${this.W * tw + 14}px;height:${this.H * th + 16}px`;
    mj.innerHTML = [...this.tiles.values()].map((x: Tile) => {
      const [r, c, z] = P(x.k), free = isFree(x.k, a);
      return `<div class="tile${free ? '' : ' lock'}${x.open ? ' up' : ''}${x === this.peek ? ' peek' : ''}" data-k="${x.k}" style="width:${tw - 3}px;height:${th - 3}px;left:${c * unit - z * 4 + 6}px;top:${r * th / 2 - z * 5 + 10}px;z-index:${z * 100 + r * 2 + c}">
        <div class="card"><div class="fc front">${mjFace(x.f)}</div><div class="fc back">${MJ_BACK}</div></div></div>`;
    }).join('');
    mj.querySelectorAll('.tile').forEach((d: HTMLElement) => d.onclick = () => this.tap(d.dataset.k!));
    const tr = this.el.querySelector('.tray'); tr.style.setProperty('--tw', Math.min(tw * 1.05, 54) + 'px'); tr.style.setProperty('--th', Math.min(th * 1.05, 70) + 'px');
    this.drawTray(); this.hud();
  },
  drawTray() {
    const box = this.el.querySelector('.titems'); if (!box) return;
    box.innerHTML = this.tray.map((x: Tile, i: number) => `<div class="titem" data-i="${i}" style="--i:${i}">${mjFace(x.f)}</div>`).join('');
  },
  hud() {
    const left = this.tiles.size + this.tray.length, pct = Math.round((1 - left / this.total) * 100);
    setStats(`${pill('Рів. ' + this.lvl)}<span class="prog" title="${pct}%"><i style="width:${pct}%"></i></span>`);
  },
  el$(k: string) { return this.el.querySelector(`.tile[data-k="${k}"]`) as HTMLElement; },
  async tap(k: string) {
    if (this.busy || this.dead) return;
    const x: Tile = this.tiles.get(k); if (!x) return;
    if (!isFree(k, this.alive())) { haptic('err'); return flash(this.el$(k), 'shake'); }
    if (!x.open) {
      // flip: the previous peeked tile closes again (unless it is permanently open)
      if (this.peek && this.peek !== x && !this.peek.perm) { this.peek.open = false; this.el$(this.peek.k)?.classList.remove('up', 'peek'); }
      x.open = true; x.seen++; if (x.seen >= 3) x.perm = true;
      this.peek = x; const e = this.el$(k); e.classList.add('up', 'peek'); haptic();
      if (this.tray.some((y: Tile) => y.f === x.f)) { this.busy = true; await sleep(800); this.busy = false; if (this.tiles.get(k) === x) await this.toTray(x); }
      return;
    }
    await this.toTray(x);
  },
  async toTray(x: Tile) {
    if (this.tray.length >= SLOTS) return;
    this.busy = true;
    const e = this.el$(x.k), r0 = e.getBoundingClientRect(), slots = this.el.querySelectorAll('.tslot'), s = slots[this.tray.length].getBoundingClientRect();
    this.tiles.delete(x.k); if (this.peek === x) this.peek = null;
    const fly = document.createElement('div'); fly.className = 'mjfly'; fly.innerHTML = mjFace(x.f);
    fly.style.cssText = `left:${r0.left}px;top:${r0.top}px;width:${r0.width}px;height:${r0.height}px`; document.body.appendChild(fly);
    this.draw(); haptic();
    await fly.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${(s.left - r0.left) * .5}px,${(s.top - r0.top) * .5 - 40}px) scale(1.15)`, offset: .5 }, { transform: `translate(${s.left - r0.left + (s.width - r0.width) / 2}px,${s.top - r0.top + (s.height - r0.height) / 2}px) scale(${s.width / r0.width})` }],
      { duration: 360, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => { });
    fly.remove(); if (this.dead) return;
    this.tray.push(x); this.drawTray(); this.tools();
    const twin = this.tray.findIndex((y: Tile) => y !== x && y.f === x.f);
    if (twin >= 0) {
      const items = this.el.querySelectorAll('.titem'); items[twin].classList.add('pop'); items[this.tray.length - 1].classList.add('pop');
      Score.good(20); haptic('ok'); await sleep(430); if (this.dead) return;
      this.tray = this.tray.filter((y: Tile, i: number) => i !== twin && y !== x); this.drawTray(); this.hud(); this.tools();
    }
    this.busy = false;
    // last few tiles: collect the remaining pairs automatically
    if (!this.auto && this.tiles.size && !this.tray.length && this.tiles.size <= Math.max(4, Math.ceil(this.total * .05))) { this.auto = true; setTimeout(() => this.autoFinish(), 300); return; }
    if (!this.tiles.size && !this.tray.length) return done('mj_lvl', this.lvl, () => this.load());
    if (this.tray.length >= SLOTS) this.fail();
  },
  async autoFinish() {
    while (this.tiles.size && !this.dead) {
      const x: Tile = [...this.tiles.values()][0], y: Tile = [...this.tiles.values()].find((z: Tile) => z !== x && z.f === x.f)!;
      for (const z of [x, y]) { z.open = true; this.el$(z.k)?.classList.add('up'); }
      await sleep(250); this.busy = false; await this.toTray(x); this.busy = false; await this.toTray(y); await sleep(120);
    }
  },
  fail() {
    Score.bad(); haptic('err');
    const b: any[] = [];
    if (!this.cont) b.push(['Реклама: повернути 2 плитки', () => Ads.rewarded(() => { this.cont = true; this.tray.splice(-2).forEach((x: Tile) => { x.open = x.perm = true; this.tiles.set(x.k, x); }); this.draw(); })]);
    b.push(['Почати заново', () => { Score.lose(); this.load(); }]);
    setTimeout(() => modal(`<h2>${t('Сховок заповнений')}</h2><p class="muted">${t('4 різні плитки без пари. Відкривай плитки й запам\'ятовуй малюнки.')}</p>`, b), 300);
  },
  hint() {
    const a = this.alive(), free = [...this.tiles.values()].filter((x: Tile) => isFree(x.k, a));
    let pick: Tile[] = [];
    for (const y of this.tray) { const m = free.find((x: Tile) => x.f === y.f); if (m) { pick = [m]; break; } }
    if (!pick.length) { const by: Record<number, Tile[]> = {}; free.forEach((x: Tile) => (by[x.f] ||= []).push(x)); pick = Object.values(by).find(v => v.length > 1)?.slice(0, 2) || []; }
    if (!pick.length) return toast(t('Пар немає, перемішай'));
    pick.forEach(x => { const e = this.el$(x.k); e.classList.add('up', 'hint'); setTimeout(() => { if (!x.open) e?.classList.remove('up'); e?.classList.remove('hint'); }, 1600); });
  },
  reshuffle() {
    const keys = [...this.tiles.keys()], cnt: Record<number, number> = {};
    keys.forEach(k => cnt[this.tiles.get(k).f] = (cnt[this.tiles.get(k).f] || 0) + 1);
    // faces whose twin sits in the tray stay single; the rest are re-dealt in solvable pairs
    const singles: number[] = [], pairs: number[] = [];
    for (const f in cnt) { let n = cnt[f]; if (n % 2) { singles.push(+f); n--; } for (let i = 0; i < n / 2; i++) pairs.push(+f); }
    const pk = shuffle(keys.slice()), sk = pk.splice(0, singles.length), fa = assign(pk, pairs);
    sk.forEach((k, i) => this.tiles.get(k).f = singles[i]); pk.forEach(k => this.tiles.get(k).f = fa[k]);
    this.tiles.forEach((x: Tile) => { if (!x.perm) x.open = false; }); this.peek = null; this.draw(); toast(t('Перемішано'));
  },
};
export default Mahjong;
