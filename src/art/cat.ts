import { shade } from '../core/util';
let uid = 0;

/** sitting cat, front view, soft shaded, viewBox 0 0 48 48 */
export function sittingCat(fur = '#3a3340', eye = '#ffd84a') {
  const id = 'c' + (uid++), d = shade(fur, -.3), l = shade(fur, .35), belly = shade(fur, .55);
  return `<svg viewBox="0 0 48 48"><defs>
    <radialGradient id="${id}b" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="${l}"/><stop offset=".6" stop-color="${fur}"/><stop offset="1" stop-color="${d}"/></radialGradient>
    <radialGradient id="${id}h" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${fur}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs>
  <ellipse cx="24" cy="45" rx="15" ry="2.6" fill="#000" opacity=".2"/>
  <path d="M34 42c9 1 11-6 7-11c-2-3-5-1-3 1c2 3 0 6-4 6" fill="none" stroke="${d}" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M34 42c9 1 11-6 7-11c-2-3-5-1-3 1c2 3 0 6-4 6" fill="none" stroke="${fur}" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M11 44c0-11 5-18 13-18s13 7 13 18z" fill="url(#${id}b)" stroke="${d}" stroke-width="1.2"/>
  <ellipse cx="24" cy="37" rx="6" ry="7" fill="${belly}" opacity=".85"/>
  <ellipse cx="18.5" cy="43.5" rx="3.6" ry="2.2" fill="${l}" stroke="${d}" stroke-width=".9"/><ellipse cx="29.5" cy="43.5" rx="3.6" ry="2.2" fill="${l}" stroke="${d}" stroke-width=".9"/>
  <path d="M10.5 9.5l3.5 12h20l3.5-12-8.5 6.5h-10z" fill="url(#${id}h)" stroke="${d}" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M13 12.5l2.2 6.5 3.4-2.8zM35 12.5l-2.2 6.5-3.4-2.8z" fill="#ff9fb4"/>
  <ellipse cx="24" cy="21" rx="12.5" ry="10.5" fill="url(#${id}h)" stroke="${d}" stroke-width="1.2"/>
  <ellipse cx="18.8" cy="20" rx="3.3" ry="3.8" fill="${eye}" stroke="${d}" stroke-width=".7"/><ellipse cx="29.2" cy="20" rx="3.3" ry="3.8" fill="${eye}" stroke="${d}" stroke-width=".7"/>
  <ellipse cx="19.2" cy="20.4" rx="1.2" ry="3" fill="#111"/><ellipse cx="29.6" cy="20.4" rx="1.2" ry="3" fill="#111"/>
  <circle cx="18" cy="18.6" r=".9" fill="#fff"/><circle cx="28.4" cy="18.6" r=".9" fill="#fff"/>
  <path d="M22.6 24.5h2.8L24 26.2z" fill="#ff7f9a"/><path d="M24 26.2q-1.6 2-3.2.8M24 26.2q1.6 2 3.2.8" stroke="${d}" stroke-width=".8" fill="none"/>
  <ellipse cx="15.5" cy="25" rx="2.4" ry="1.5" fill="#ff9fb4" opacity=".5"/><ellipse cx="32.5" cy="25" rx="2.4" ry="1.5" fill="#ff9fb4" opacity=".5"/>
  <path d="M15 24.5l-6.5-1M15 26.4l-6.5 1.6M33 24.5l6.5-1M33 26.4l6.5 1.6" stroke="#fff" stroke-opacity=".7" stroke-width=".7"/>
</svg>`;
}

/** peeking cat head for hidden-object scenes, centre (x,y), radius r. Eyes blink via CSS. */
export function catHead(x: number, y: number, r: number, fur: string, delay = 0) {
  const id = 'h' + (uid++), d = shade(fur, -.32), l = shade(fur, .35), f = (n: number) => n.toFixed(1);
  return `<g class="hcat"><defs><radialGradient id="${id}" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${fur}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs>
  <path d="M${f(x - r)} ${f(y - r * .1)}L${f(x - r * .9)} ${f(y - r * 1.55)}L${f(x - r * .15)} ${f(y - r * .85)}Z" fill="url(#${id})" stroke="${d}" stroke-width=".7" stroke-linejoin="round"/>
  <path d="M${f(x + r)} ${f(y - r * .1)}L${f(x + r * .9)} ${f(y - r * 1.55)}L${f(x + r * .15)} ${f(y - r * .85)}Z" fill="url(#${id})" stroke="${d}" stroke-width=".7" stroke-linejoin="round"/>
  <path d="M${f(x - r * .82)} ${f(y - r * .5)}L${f(x - r * .8)} ${f(y - r * 1.2)}L${f(x - r * .38)} ${f(y - r * .8)}Z M${f(x + r * .82)} ${f(y - r * .5)}L${f(x + r * .8)} ${f(y - r * 1.2)}L${f(x + r * .38)} ${f(y - r * .8)}Z" fill="#ff9fb4" opacity=".85"/>
  <ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * .88)}" fill="url(#${id})" stroke="${d}" stroke-width=".7"/>
  <ellipse cx="${f(x)}" cy="${f(y + r * .4)}" rx="${f(r * .45)}" ry="${f(r * .3)}" fill="${shade(fur, .55)}" opacity=".6"/>
  <g class="blink" style="animation-delay:${delay}s">
    <ellipse cx="${f(x - r * .38)}" cy="${f(y - r * .08)}" rx="${f(r * .21)}" ry="${f(r * .25)}" fill="#ffd84a" stroke="${d}" stroke-width=".4"/>
    <ellipse cx="${f(x + r * .38)}" cy="${f(y - r * .08)}" rx="${f(r * .21)}" ry="${f(r * .25)}" fill="#ffd84a" stroke="${d}" stroke-width=".4"/>
    <ellipse cx="${f(x - r * .36)}" cy="${f(y - r * .06)}" rx="${f(r * .07)}" ry="${f(r * .2)}" fill="#111"/>
    <ellipse cx="${f(x + r * .4)}" cy="${f(y - r * .06)}" rx="${f(r * .07)}" ry="${f(r * .2)}" fill="#111"/>
    <circle cx="${f(x - r * .43)}" cy="${f(y - r * .18)}" r="${f(r * .05)}" fill="#fff"/><circle cx="${f(x + r * .33)}" cy="${f(y - r * .18)}" r="${f(r * .05)}" fill="#fff"/>
  </g>
  <path d="M${f(x - r * .12)} ${f(y + r * .25)}h${f(r * .24)}l${f(-r * .12)} ${f(r * .14)}z" fill="#e87a90"/>
  <path d="M${f(x - r * .4)} ${f(y + r * .3)}l${f(-r * .7)} ${f(-r * .1)}M${f(x - r * .4)} ${f(y + r * .42)}l${f(-r * .7)} ${f(r * .12)}M${f(x + r * .4)} ${f(y + r * .3)}l${f(r * .7)} ${f(-r * .1)}M${f(x + r * .4)} ${f(y + r * .42)}l${f(r * .7)} ${f(r * .12)}" stroke="#fff" stroke-opacity=".6" stroke-width=".5"/>
</g>`;
}

/** tail coming out from behind something: starts at (x,y), curls to one side */
export function catTail(x: number, y: number, r: number, fur: string, dir: 1 | -1, delay = 0) {
  const d = shade(fur, -.32), f = (n: number) => n.toFixed(1);
  const p = `M${f(x)} ${f(y)}c${f(dir * r * .9)} ${f(r * .2)} ${f(dir * r * 1.6)} ${f(-r * .3)} ${f(dir * r * 1.5)} ${f(-r * 1.3)}c0 ${f(-r * .5)} ${f(-dir * r * .5)} ${f(-r * .6)} ${f(-dir * r * .6)} ${f(-r * .2)}`;
  return `<g class="tail" style="animation-delay:-${delay}s;transform-origin:${f(x)}px ${f(y)}px"><path d="${p}" fill="none" stroke="${d}" stroke-width="${f(r * .42)}" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${fur}" stroke-width="${f(r * .28)}" stroke-linecap="round"/></g>`;
}
