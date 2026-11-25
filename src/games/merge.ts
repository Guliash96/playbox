// Harbour (merge-2 with a story): tap the crate to get items (costs energy), drag equal items together
// to merge them up, fill townsfolk orders to earn stars. Stars complete chapters that restore the harbour.
import './merge.css';
import { R, pick } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, modal, toast, pill, flash } from '../core/ui';
import { Ads } from '../core/ads';
import { CHAINS, CRATE, harborScene } from '../art/harbor';
import type { Game } from './registry';

const COLS = 7, ROWS = 8, GEN = 3 * COLS + 3, EMAX = 40, EREGEN = 20_000;
type Item = { c: number; t: number } | null;
interface Order { who: number; need: { c: number; t: number }[]; stars: number }
const FOLK = [{ n: 'Капітан Остап', hat: '#1f3a8a', skin: '#f2c9a0' }, { n: 'Бабця Ліна', hat: '#ff7ab2', skin: '#f5d4b3' }, { n: 'Юнга Тарас', hat: '#e8443a', skin: '#e9b98f' }, { n: 'Рибачка Мар\'яна', hat: '#3fbf5f', skin: '#f2c9a0' }];
const STORY = [
  'Стара гавань занепала: причал розвалився, човни пішли. Мешканці просять допомогти, почнемо з причалу!',
  'Причал знову міцний! Капітан Остап каже: без човна риби не наловиш.',
  'Човен на воді! Тепер потрібен маяк, щоб рибалки поверталися додому вночі.',
  'Маяк світить! Бабця Ліна мріє про ринок свіжої риби.',
  'Ринок відкрито! Залишилось влаштувати свято на честь відродження гавані.',
  'Гавань ожила! Свято триває, а замовлення продовжують надходити.',
];
const face = (k: number) => { const f = FOLK[k]; return `<svg viewBox="0 0 40 40"><circle cx="20" cy="22" r="13" fill="${f.skin}" stroke="#1b1b1f" stroke-width="1.5"/><path d="M6 17q14-14 28 0z" fill="${f.hat}" stroke="#1b1b1f" stroke-width="1.5"/><circle cx="15" cy="22" r="1.8" fill="#1b1b1f"/><circle cx="25" cy="22" r="1.8" fill="#1b1b1f"/><path d="M15 28q5 4 10 0" stroke="#1b1b1f" stroke-width="1.5" fill="none"/></svg>`; };
const itemSVG = (it: Item) => it ? `<svg viewBox="0 0 40 40">${CHAINS[it.c].art[it.t]}</svg>` : '';

const Merge: Game & Record<string, any> = {
  title: 'Гавань', theme: 'th-merge',
  start(el: HTMLElement) {
    this.el = el;
    const s = store.get<any>('mg_state', null);
    if (s) Object.assign(this, s); else this.fresh();
    this.regen(); this.timer = setInterval(() => { this.regen(); this.hud(); }, 1000);
    this.render();
    setTools([['Енергія за рекламу', () => Ads.rewarded(() => { this.energy = Math.min(EMAX + 20, this.energy + 20); this.save(); this.hud(); })], ['Історія', () => this.story(false)]]);
    if (!s) this.story(false);
  },
  stop() { clearInterval(this.timer); this.unbind?.(); },
  fresh() {
    this.board = Array(COLS * ROWS).fill(null) as Item[]; this.energy = EMAX; this.etime = Date.now(); this.ch = 0; this.stars = 0; this.orders = [] as Order[];
    for (let k = 0; k < 6; k++) this.board[[0, 6, 49, 55, 8, 47][k]] = { c: k % 2, t: k < 4 ? 0 : 1 };
    this.fillOrders();
  },
  save() { const { board, energy, etime, ch, stars, orders } = this; store.set('mg_state', { board, energy, etime, ch, stars, orders }); },
  regen() { const n = Math.floor((Date.now() - this.etime) / EREGEN); if (n > 0) { if (this.energy < EMAX) this.energy = Math.min(EMAX, this.energy + n); this.etime += n * EREGEN; this.save(); } if (this.energy >= EMAX) this.etime = Date.now(); },
  goal() { return 8 + this.ch * 4; },
  chains() { return CHAINS.map((c, i) => i).filter(i => CHAINS[i].unlock <= this.ch); },
  fillOrders() {
    while (this.orders.length < 3) {
      const n = Math.random() < .35 + this.ch * .08 ? 2 : 1, need = Array.from({ length: n }, () => { const c = pick(this.chains()) as number; return { c, t: Math.min(CHAINS[c].tiers.length - 1, 1 + R(Math.min(4, 2 + this.ch))) }; });
      this.orders.push({ who: R(FOLK.length), need, stars: need.reduce((s, x) => s + x.t, 0) });
    }
  },
  hud() { setStats(`${pill('Енергія ' + this.energy + '/' + EMAX)}${pill('Зірки ' + this.stars + '/' + this.goal())}`); },
  render() {
    const cs = this.cs = Math.floor(Math.min((this.el.clientWidth - 24) / COLS, (this.el.clientHeight - 230) / ROWS, 58));
    this.el.innerHTML = `<div class="mg" style="--cs:${cs}px">
      <div class="scene">${harborScene(this.ch)}<div class="chbar"><span style="width:${Math.min(100, this.stars / this.goal() * 100)}%"></span><b>Розділ ${this.ch + 1}</b></div></div>
      <div class="orders">${this.orders.map((o: Order, i: number) => `<div class="order${this.canFill(o) ? ' ready' : ''}" data-o="${i}"><span class="who">${face(o.who)}</span><span class="need">${o.need.map(n => `<span class="ni${this.has(n) ? ' ok' : ''}">${itemSVG(n)}</span>`).join('')}</span><button class="give" data-o="${i}" ${this.canFill(o) ? '' : 'disabled'}>★${o.stars}</button></div>`).join('')}</div>
      <div class="mboard" style="grid-template-columns:repeat(${COLS},var(--cs))">${this.board.map((it: Item, i: number) => i === GEN ? `<button class="cell gen" data-i="${i}" aria-label="ящик"><svg viewBox="0 0 40 40">${CRATE}</svg><small>−1</small></button>` : `<button class="cell" data-i="${i}">${itemSVG(it)}</button>`).join('')}</div>
      <div class="info" id="minfo">Тапни ящик, щоб отримати предмет. Перетягни два однакові, щоб злити.</div></div>`;
    this.el.querySelectorAll('.give').forEach((b: HTMLElement) => b.onclick = () => this.give(+b.dataset.o));
    this.bindDrag(); this.hud();
  },
  has(n: { c: number; t: number }) { return this.board.some((it: Item) => it && it.c === n.c && it.t === n.t); },
  canFill(o: Order) {
    const used = new Set<number>();
    return o.need.every(n => { const i = this.board.findIndex((it: Item, k: number) => !used.has(k) && it && it.c === n.c && it.t === n.t); if (i < 0) return false; used.add(i); return true; });
  },
  give(i: number) {
    const o: Order = this.orders[i]; if (!this.canFill(o)) return;
    o.need.forEach(n => { const k = this.board.findIndex((it: Item) => it && it.c === n.c && it.t === n.t); this.board[k] = null; });
    this.orders.splice(i, 1); this.stars += o.stars; haptic('ok'); toast(`${FOLK[o.who].n}: дякую! +${o.stars}★`);
    if (this.stars >= this.goal()) { this.stars -= this.goal(); this.ch = Math.min(this.ch + 1, STORY.length - 1); this.save(); this.render(); return this.story(true); }
    this.fillOrders(); this.save(); this.render();
  },
  story(up: boolean) {
    const unlocked = CHAINS.find(c => c.unlock === this.ch && this.ch > 0);
    modal(`<div class="storypic">${harborScene(this.ch)}</div><h2>${up ? 'Новий розділ!' : 'Розділ ' + (this.ch + 1)}</h2><p>${STORY[this.ch]}</p>${up && unlocked ? `<p class="muted">Новий ланцюжок: ${unlocked.name}</p>` : ''}`, [['Далі', () => { this.fillOrders(); this.save(); this.render(); }]]);
  },
  spawn() {
    if (this.energy <= 0) return modal('<h2>Енергія скінчилась</h2><p class="muted">Вона відновлюється сама (1 за 20 секунд) або одразу за рекламу.</p>', [['Реклама: +20 енергії', () => Ads.rewarded(() => { this.energy += 20; this.save(); this.hud(); })], ['Почекаю']]);
    const gr = Math.floor(GEN / COLS), gc = GEN % COLS;
    const empty = this.board.map((it: Item, i: number) => i).filter((i: number) => i !== GEN && !this.board[i]).sort((a: number, b: number) => Math.hypot(Math.floor(a / COLS) - gr, a % COLS - gc) - Math.hypot(Math.floor(b / COLS) - gr, b % COLS - gc));
    if (!empty.length) { haptic('err'); return toast('Немає місця: злий щось'); }
    const k = empty[0]; this.board[k] = { c: pick(this.chains()) as number, t: 0 }; this.energy--; if (this.energy === EMAX - 1) this.etime = Date.now();
    haptic(); this.save(); this.render(); const cell = this.el.querySelector(`[data-i="${k}"]`); cell?.classList.add('spawned');
    flash(this.el.querySelector('.gen'), 'pump', 300);
  },
  info(i: number) { const it = this.board[i]; if (!it) return; const ch = CHAINS[it.c]; this.el.querySelector('#minfo').textContent = `${ch.tiers[it.t]} · ${ch.name}, рівень ${it.t + 1} з ${ch.tiers.length}${it.t + 1 < ch.tiers.length ? ' → ' + ch.tiers[it.t + 1] : ' (максимум)'}`; },
  bindDrag() {
    const board = this.el.querySelector('.mboard');
    board.onpointerdown = (e: PointerEvent) => {
      const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement; if (!cell) return;
      const i = +cell.dataset.i!; e.preventDefault();
      if (i === GEN) return this.spawn();
      const it = this.board[i]; if (!it) return;
      this.info(i); this.el.querySelectorAll('.cell.sel').forEach((c: Element) => c.classList.remove('sel')); cell.classList.add('sel');
      const g = document.createElement('div'); g.className = 'mdrag'; g.style.cssText = `width:${this.cs}px;height:${this.cs}px`; g.innerHTML = itemSVG(it);
      let moved = false, sx = e.clientX, sy = e.clientY;
      const mv = (ev: PointerEvent) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!moved) { moved = true; document.body.appendChild(g); cell.classList.add('lift'); }
        g.style.left = ev.clientX - this.cs / 2 + 'px'; g.style.top = ev.clientY - this.cs / 2 - (ev.pointerType === 'mouse' ? 0 : 24) + 'px';
      };
      const up = (ev: PointerEvent) => {
        removeEventListener('pointermove', mv); removeEventListener('pointerup', up); g.remove(); cell.classList.remove('lift');
        if (!moved) return;
        const over = document.elementFromPoint(ev.clientX, ev.clientY - (ev.pointerType === 'mouse' ? 0 : 24))?.closest('.mboard .cell') as HTMLElement;
        if (!over) return; const j = +over.dataset.i!; if (j === i || j === GEN) return;
        this.drop(i, j);
      };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
  },
  drop(i: number, j: number) {
    const a: Item = this.board[i], b: Item = this.board[j];
    if (b && a && a.c === b.c && a.t === b.t && a.t + 1 < CHAINS[a.c].tiers.length) {
      this.board[j] = { c: a.c, t: a.t + 1 }; this.board[i] = null; haptic('ok');
      this.save(); this.render(); this.el.querySelector(`[data-i="${j}"]`)?.classList.add('merged'); this.info(j); return;
    }
    this.board[j] = a; this.board[i] = b; haptic(); this.save(); this.render();
  },
};
export default Merge;
