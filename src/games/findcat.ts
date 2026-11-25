// Find the cat: a procedurally drawn bookcase; cats peek from behind books, boxes and plants.
import './findcat.css';
import { R, pick, shuffle, shade } from '../core/util';
import { store } from '../core/store';
import { haptic } from '../core/platform';
import { setStats, setTools, pill } from '../core/ui';
import { Ads } from '../core/ads';
import { done } from '../core/flow';
import { catHead } from '../art/cat';
import type { Game } from './registry';

const BOOK = ['#7b2d26', '#2f4b7c', '#3f6b4a', '#a8742a', '#5b3a6e', '#8c8c8c', '#c2553b', '#d9c7a0', '#24435a', '#6e4b2a'];
const FUR = ['#e08a3c', '#8c8c8c', '#3b3434', '#efe4d2', '#c9a27a', '#6b4a33'];
const f = (n: number) => n.toFixed(1);
const SHELF0 = 82, STEP = 72, NSH = 7, VW = 360, VH = 540;

interface It { x: number; y: number; w: number; h: number; t: string }

function book(x: number, y: number, w: number, h: number, lean = 0) {
  const c = pick(BOOK), d = shade(c, -0.3), band = Math.random() < .5 ? '#d9b54a' : shade(c, 0.35);
  const g = `<rect x="${x}" y="${f(y - h)}" width="${w}" height="${f(h)}" rx="1.5" fill="${c}"/><rect x="${x}" y="${f(y - h + 4)}" width="${w}" height="2" fill="${band}"/><rect x="${x}" y="${f(y - 8)}" width="${w}" height="2" fill="${band}"/><rect x="${x + 1}" y="${f(y - h + 1)}" width="1.4" height="${f(h - 2)}" fill="#fff" opacity=".22"/><rect x="${x + w - 1.5}" y="${f(y - h)}" width="1.5" height="${f(h)}" fill="${d}"/>`;
  return lean ? `<g transform="rotate(${lean} ${lean < 0 ? x : x + w} ${y})">${g}</g>` : g;
}
function drawItem(it: It) {
  const { x, y, w, h, t } = it, top = y - h;
  if (t === 'books') { let s = '', bx = x; while (bx < x + w - 3) { const bw = Math.min(5 + R(6), x + w - bx); s += book(bx, y, bw, h * (.72 + Math.random() * .28)); bx += bw + .5; } if (Math.random() < .4) s += book(x + w + 1, y, 6, h * .9, 14); return s; }
  if (t === 'stack') { let s = ''; for (let k = 0, yy = y; k < 3; k++) { const bh = 6 + R(3), c = pick(BOOK); s += `<rect x="${x + R(4)}" y="${yy - bh}" width="${w - 4}" height="${bh}" rx="1.5" fill="${c}"/><rect x="${x + w - 6}" y="${yy - bh + 1}" width="3" height="${bh - 2}" fill="#f3ead8"/>`; yy -= bh; } return s; }
  if (t === 'box') return `<rect x="${x}" y="${f(top)}" width="${w}" height="${f(h)}" fill="#c99a63" stroke="#8a6238" stroke-width="1"/><path d="M${x} ${f(top)}l${f(w * .5)} ${f(Math.min(8, h * .3))}l${f(w * .5)} ${f(-Math.min(8, h * .3))}" fill="#d8ae78" stroke="#8a6238" stroke-width=".8"/><rect x="${f(x + w * .42)}" y="${f(top)}" width="${f(w * .16)}" height="${f(h)}" fill="#e7c48f" opacity=".7"/><rect x="${f(x + 4)}" y="${f(y - h * .45)}" width="${f(w * .3)}" height="${f(h * .2)}" fill="#f6efe2"/>`;
  if (t === 'jar') { const cc = pick(['#ff7a9c', '#ffd23f', '#7fd1ff', '#9be37a']); return `<rect x="${x}" y="${f(top + 5)}" width="${w}" height="${f(h - 5)}" rx="6" fill="#d7eef5" opacity=".55" stroke="#9cc3cf"/>${Array.from({ length: 6 }, () => `<circle cx="${f(x + 4 + Math.random() * (w - 8))}" cy="${f(y - 4 - Math.random() * (h * .45))}" r="3" fill="${cc}"/>`).join('')}<rect x="${x + 2}" y="${f(top)}" width="${w - 4}" height="6" rx="2" fill="#7a5038"/><rect x="${x + 3}" y="${f(top + 8)}" width="2.5" height="${f(h - 14)}" fill="#fff" opacity=".6"/>`; }
  if (t === 'plant') {
    const cx = x + w / 2, py = y - h * .42, leaves = Array.from({ length: 6 }, (_, k) => { const a = -70 + k * 28 + R(10); return `<ellipse cx="${f(cx)}" cy="${f(py - h * .3)}" rx="${f(w * .14)}" ry="${f(h * .32)}" fill="${k % 2 ? '#4d8a3f' : '#6aab57'}" transform="rotate(${a} ${f(cx)} ${f(py)})"/>`; }).join('');
    return `<g class="sway" style="animation-delay:-${R(30) / 10}s">${leaves}</g><path d="M${f(x + w * .15)} ${f(py)}h${f(w * .7)}l${f(-w * .1)} ${f(y - py)}h${f(-w * .5)}z" fill="#c2553b"/><rect x="${f(x + w * .1)}" y="${f(py - 3)}" width="${f(w * .8)}" height="5" rx="2" fill="#a8432d"/>`;
  }
  if (t === 'vase') { const c = pick(['#2f6f8f', '#c2553b', '#e9e2d3', '#3f6b4a']); return `<path d="M${f(x + w * .3)} ${f(top)}h${f(w * .4)}c0 ${f(h * .2)} ${f(w * .3)} ${f(h * .3)} ${f(w * .3)} ${f(h * .6)}s${f(-w * .2)} ${f(h * .4)} ${f(-w * .5)} ${f(h * .4)}s${f(-w * .5)} 0 ${f(-w * .5)} ${f(-h * .4)}s${f(w * .3)} ${f(-h * .4)} ${f(w * .3)} ${f(-h * .6)}z" fill="${c}"/><path d="M${f(x + w * .08)} ${f(y - h * .4)}h${f(w * .84)}" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`; }
  if (t === 'yarn') { const c = pick(FUR), r = Math.min(w, h) / 2; return `<circle cx="${f(x + w / 2)}" cy="${f(y - r)}" r="${f(r)}" fill="${c}"/><path d="M${f(x + w / 2 - r * .8)} ${f(y - r * 1.4)}q${f(r)} ${f(r * .6)} ${f(r * 1.6)} ${f(r * .2)}M${f(x + w / 2 - r * .9)} ${f(y - r * .8)}q${f(r)} ${f(r * .5)} ${f(r * 1.7)} ${f(-r * .1)}" stroke="${shade(c, -.3)}" fill="none" stroke-width="1.2"/>`; }
  // picture frame
  return `<rect x="${x}" y="${f(top)}" width="${w}" height="${f(h)}" fill="#5a3a22"/><rect x="${x + 3}" y="${f(top + 3)}" width="${w - 6}" height="${f(h - 6)}" fill="#9fd4f0"/><path d="M${x + 3} ${f(y - 3)}l${f((w - 6) * .4)} ${f(-(h - 6) * .5)}l${f((w - 6) * .3)} ${f((h - 6) * .3)}l${f((w - 6) * .3)} ${f(-(h - 6) * .2)}v${f((h - 6) * .4)}z" fill="#5c9a4b"/>`;
}

const FindCat: Game & Record<string, any> = {
  title: 'Знайди кота', theme: 'th-findcat',
  start(el: HTMLElement) { this.el = el; this.load(); },
  load() {
    const L = this.lvl = store.get('fc_lvl', 1);
    this.k = Math.min(12, 3 + L); this.cr = Math.max(7.5, 12.5 - L * .5); this.found = 0;
    this.build(); this.draw();
    setTools([['Підказка за рекламу', () => Ads.rewarded(() => this.hint())], ['Нова сцена', () => this.load()]]);
  },
  build() {
    const cr = this.cr, items: It[] = [], shelves = Array.from({ length: NSH }, (_, i) => SHELF0 + i * STEP);
    const types = ['books', 'books', 'books', 'box', 'jar', 'plant', 'vase', 'yarn', 'stack', 'frame'];
    for (const y of shelves) { let x = 16; for (; ;) { const t = pick(types), w = t === 'books' ? 22 + R(30) : 16 + R(22); if (x + w > 344) break; items.push({ x, y, w, h: t === 'stack' ? 24 : 22 + R(32), t }); x += w + 2 + R(7); } }
    const catIt = new Set(shuffle(items.filter(it => it.w >= cr * 1.8 && it.t !== 'yarn')).slice(0, this.k));
    this.cats = [];
    let s = `<defs><pattern id="wp" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#5e4130"/><path d="M0 0v24M12 0v24" stroke="#4e3526" stroke-width="1"/></pattern></defs>
      <rect width="${VW}" height="${VH}" fill="#e9dcc0"/><rect x="6" y="10" width="${VW - 12}" height="${VH - 10}" fill="url(#wp)"/>
      <rect x="0" y="0" width="${VW}" height="16" fill="#7a5038"/><rect x="0" y="14" width="${VW}" height="4" fill="#5a3a22"/>
      <rect x="0" y="0" width="12" height="${VH}" fill="#7a5038"/><rect x="${VW - 12}" y="0" width="12" height="${VH}" fill="#7a5038"/>
      <rect x="12" y="18" width="${VW - 24}" height="40" fill="#000" opacity=".15"/>`;
    s += shelves.map(y => `<rect x="10" y="${y}" width="${VW - 20}" height="10" fill="#8b5a2b"/><rect x="10" y="${y}" width="${VW - 20}" height="3" fill="#a8743f"/><rect x="10" y="${y + 10}" width="${VW - 20}" height="8" fill="#000" opacity=".22"/>`).join('');
    let tails = '';
    for (const it of items) {
      if (catIt.has(it)) {
        it.h = Math.min(it.h, 30);
        const side = Math.random() < .35, left = Math.random() < .5;
        const x = side ? it.x + (left ? 1 : it.w - 1) : it.x + it.w / 2 + (Math.random() - .5) * it.w * .4;
        const y = side ? it.y - cr * .95 : it.y - it.h - cr * .2, fur = pick(FUR), id = this.cats.length;
        this.cats.push({ x, y, r: cr, f: false });
        s += `<g class="cwrap" id="cat${id}">${catHead(x, y, cr, fur, Math.random() * 5)}</g>`;
        if (Math.random() < .45) { const tx = x + (Math.random() < .5 ? -cr * .6 : cr * .6); tails += `<path class="tail" style="animation-delay:-${R(20) / 10}s" d="M${f(tx)} ${it.y + 6}c0 10 ${f(cr * .2)} 18 ${f(cr * .7)} 20" fill="none" stroke="${fur}" stroke-width="${f(cr * .32)}" stroke-linecap="round"/>`; }
      }
      s += drawItem(it);
    }
    s += tails + `<rect x="0" y="${VH - 18}" width="${VW}" height="18" fill="#5a3a22"/>`;
    this.scene = s;
  },
  draw() {
    const W = Math.floor(Math.min(this.el.clientWidth - 16, (this.el.clientHeight - 16) / 1.5));
    this.el.innerHTML = `<div class="fc"><svg viewBox="0 0 ${VW} ${VH}" width="${W}" height="${Math.round(W * 1.5)}">${this.scene}<g id="mk"></g></svg></div>`;
    const svg = this.svg = this.el.querySelector('svg'); svg.onclick = (e: MouseEvent) => this.tap(e); this.hud();
  },
  hud() { setStats(`${pill('Рів. ' + this.lvl)}${pill(`Коти ${this.found}/${this.cats.length}`)}`); },
  add(tag: string, attrs: Record<string, any>, text = '') {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text; this.svg.querySelector('#mk').appendChild(e); return e;
  },
  tap(e: MouseEvent) {
    const pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
    const i = this.cats.findIndex((c: any) => !c.f && Math.hypot(c.x - p.x, c.y - p.y) < c.r * 1.8);
    if (i < 0) { haptic('err'); const m = this.add('circle', { cx: p.x, cy: p.y, r: 4, class: 'miss' }); setTimeout(() => m.remove(), 600); return; }
    const c = this.cats[i]; c.f = true; this.found++; haptic('ok');
    this.svg.querySelector('#cat' + i).classList.add('found');
    this.add('circle', { cx: c.x, cy: c.y - c.r * .3, r: c.r * 1.75, class: 'ring' });
    for (let k = 0; k < 3; k++) { const h = this.add('text', { x: c.x - 8 + k * 8, y: c.y - c.r * 1.6, class: 'heart', style: `animation-delay:${k * 90}ms`, 'font-size': 10 }, '♥'); setTimeout(() => h.remove(), 1200); }
    this.hud();
    if (this.found === this.cats.length) done('fc_lvl', this.lvl, () => this.load());
  },
  hint() {
    const c = this.cats.find((c: any) => !c.f); if (!c) return;
    const m = this.add('circle', { cx: c.x, cy: c.y, r: c.r * 2.6, class: 'hintc' });
    setTimeout(() => m.remove(), 2200);
  },
};
export default FindCat;
