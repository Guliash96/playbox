// Mahjong pairs: layered layout, tap two free identical tiles.
import './mahjong.css';
import { shuffle, range } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, toast, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { mjFace, MJ_FACES } from '../art/mahjong';
import type { Game } from './registry';

const K = (r: number, c: number, z: number) => `${r},${c},${z}`, P = (k: string) => k.split(',').map(Number);
function isFree(k: string, alive: Set<string>) {
  const [r, c, z] = P(k);
  if (alive.has(K(r, c, z + 1))) return false;
  return !alive.has(K(r, c - 1, z)) || !alive.has(K(r, c + 1, z));
}
// play the layout forward with random legal pairs and stamp a face on each pair → always solvable
function assign(pos: string[], faces: number[]): Record<string, number> {
  for (let t = 0; t < 300; t++) {
    const alive = new Set(pos), res: Record<string, number> = {}, s = shuffle(faces.slice()); let ok = true;
    while (alive.size) {
      const fr = shuffle([...alive].filter(k => isFree(k, alive)));
      if (fr.length < 2) { ok = false; break; }
      const v = s.pop()!; res[fr[0]] = v; res[fr[1]] = v; alive.delete(fr[0]); alive.delete(fr[1]);
    }
    if (ok) return res;
  }
  return Object.fromEntries(pos.map((k, i) => [k, faces[i >> 1]]));
}

const Mahjong: Game & Record<string, any> = {
  title: 'Маджонг', theme: 'th-mahjong',
  start(el: HTMLElement) { this.el = el; this.load(); this.ro = new ResizeObserver(() => this.draw()); this.ro.observe(el); },
  stop() { this.ro?.disconnect(); },
  load() {
    const L = this.lvl = store.get('mj_lvl', 1), W = this.W = L < 2 ? 6 : 8, H = this.H = L < 2 ? 4 : L < 4 ? 5 : 6;
    const pos: string[] = [];
    for (let z = 0; ; z++) { const w = W - 2 * z, h = H - 2 * z; if (w <= 0 || h <= 0) break; for (let r = z; r < z + h; r++) for (let c = z; c < z + w; c++) pos.push(K(r, c, z)); }
    const kinds = Math.min(MJ_FACES.length, 8 + L * 2), order = shuffle(range(MJ_FACES.length)).slice(0, kinds);
    this.t = assign(pos, range(pos.length / 2).map(i => order[i % kinds]));
    this.sel = null; this.draw();
    setTools([['Підказка за рекламу', () => Ads.rewarded(() => this.hint())], ['Перемішати', () => this.reshuffle()], ['Заново', () => this.load()]]);
  },
  alive() { return new Set(Object.keys(this.t)); },
  pairs() { const a = this.alive(), by: Record<number, string[]> = {}; for (const k of a) if (isFree(k, a)) (by[this.t[k]] ||= []).push(k); return Object.values(by).filter(x => x.length > 1); },
  draw() {
    const a = this.alive(), sw = this.el.clientWidth - 30, sh = this.el.clientHeight - 24;
    const tw = Math.max(26, Math.min(66, Math.floor(sw / (this.W + .25)), Math.floor(sh / ((this.H + .25) * 1.28)))), th = Math.round(tw * 1.28);
    const tiles = [...a].map(k => {
      const [r, c, z] = P(k);
      return `<div class="tile${isFree(k, a) ? '' : ' lock'}${this.sel === k ? ' sel' : ''}" data-k="${k}" style="width:${tw - 4}px;height:${th - 4}px;left:${c * tw - z * 5 + 4}px;top:${r * th - z * 6 + 10}px;z-index:${z * 100 + r * 10 + c}">${mjFace(this.t[k])}</div>`;
    }).join('');
    this.el.innerHTML = `<div class="mj" style="width:${this.W * tw + 10}px;height:${this.H * th + 12}px">${tiles}</div>`;
    this.el.querySelectorAll('.tile').forEach((d: HTMLElement) => d.onclick = () => this.tap(d.dataset.k));
    setStats(`${pill('Рів. ' + this.lvl)}${pill(a.size / 2 + ' пар')}`);
  },
  tile(k: string) { return this.el.querySelector(`[data-k="${k}"]`); },
  tap(k: string) {
    const a = this.alive();
    if (!isFree(k, a)) { haptic('err'); return flash(this.tile(k), 'shake'); }
    if (this.sel && this.sel !== k && this.t[this.sel] === this.t[k]) {
      const s = this.sel; this.sel = null; this.tile(s).classList.add('out'); this.tile(k).classList.add('out'); haptic('ok');
      setTimeout(() => {
        delete this.t[s]; delete this.t[k]; this.draw();
        if (!Object.keys(this.t).length) return done('mj_lvl', this.lvl, () => this.load());
        if (!this.pairs().length) modal('<h2>Ходів немає</h2><p class="muted">Плитки можна перемішати, рішення гарантоване.</p>', [['Перемішати', () => this.reshuffle()]]);
      }, 320);
      return;
    }
    this.sel = this.sel === k ? null : k; haptic(); this.draw();
  },
  hint() { const p = this.pairs()[0]; if (!p) return toast('Пар немає, перемішай'); flash(this.tile(p[0]), 'hint', 1600); flash(this.tile(p[1]), 'hint', 1600); },
  reshuffle() {
    const keys = Object.keys(this.t), cnt: Record<number, number> = {}; keys.forEach(k => cnt[this.t[k]] = (cnt[this.t[k]] || 0) + 1);
    const faces: number[] = []; for (const s in cnt) for (let i = 0; i < cnt[s] / 2; i++) faces.push(+s);
    this.t = assign(keys, faces); this.sel = null; this.draw(); toast('Перемішано');
  },
};
export default Mahjong;
