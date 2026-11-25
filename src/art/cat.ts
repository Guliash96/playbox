import { shade } from '../core/util';

/** sitting cat, front view, viewBox 0 0 48 48 */
export function sittingCat(fur = '#3a3340', eye = '#ffd84a') {
  const d = shade(fur, -0.25);
  return `<svg viewBox="0 0 48 48">
  <ellipse cx="24" cy="44" rx="15" ry="3" fill="#000" opacity=".18"/>
  <path d="M33 40c8 0 10-6 7-10" fill="none" stroke="${d}" stroke-width="4" stroke-linecap="round"/>
  <path d="M12 44c0-10 4-17 12-17s12 7 12 17z" fill="${fur}"/>
  <path d="M19 44v-5M29 44v-5" stroke="${d}" stroke-width="2" stroke-linecap="round"/>
  <path d="M11 9l3 12h20l3-12-8 6h-10z" fill="${fur}"/>
  <path d="M13.5 12l2 6 3-2.5zM34.5 12l-2 6-3-2.5z" fill="#ff9fb4"/>
  <ellipse cx="24" cy="21" rx="12" ry="10" fill="${fur}"/>
  <ellipse cx="19" cy="20" rx="3" ry="3.4" fill="${eye}"/><ellipse cx="29" cy="20" rx="3" ry="3.4" fill="${eye}"/>
  <ellipse cx="19" cy="20" rx=".9" ry="2.6" fill="#111"/><ellipse cx="29" cy="20" rx=".9" ry="2.6" fill="#111"/>
  <path d="M22.6 24.5h2.8L24 26z" fill="#ff8fa8"/>
  <path d="M15 24l-6-1M15 26l-6 1.5M33 24l6-1M33 26l6 1.5" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>
</svg>`;
}

/** peeking cat head for hidden-object scenes, centre (x,y), radius r. Eyes blink via CSS. */
export function catHead(x: number, y: number, r: number, fur: string, delay = 0) {
  const d = shade(fur, -0.3), f = (n: number) => n.toFixed(1);
  return `<g class="hcat">
  <path d="M${f(x - r)} ${f(y - r * .1)}L${f(x - r * .9)} ${f(y - r * 1.55)}L${f(x - r * .15)} ${f(y - r * .85)}Z" fill="${fur}" stroke="${d}" stroke-width=".7"/>
  <path d="M${f(x + r)} ${f(y - r * .1)}L${f(x + r * .9)} ${f(y - r * 1.55)}L${f(x + r * .15)} ${f(y - r * .85)}Z" fill="${fur}" stroke="${d}" stroke-width=".7"/>
  <path d="M${f(x - r * .82)} ${f(y - r * .5)}L${f(x - r * .8)} ${f(y - r * 1.2)}L${f(x - r * .38)} ${f(y - r * .8)}Z M${f(x + r * .82)} ${f(y - r * .5)}L${f(x + r * .8)} ${f(y - r * 1.2)}L${f(x + r * .38)} ${f(y - r * .8)}Z" fill="#ff9fb4" opacity=".8"/>
  <ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * .88)}" fill="${fur}" stroke="${d}" stroke-width=".7"/>
  <g class="blink" style="animation-delay:${delay}s">
    <ellipse cx="${f(x - r * .38)}" cy="${f(y - r * .08)}" rx="${f(r * .2)}" ry="${f(r * .24)}" fill="#ffd84a"/>
    <ellipse cx="${f(x + r * .38)}" cy="${f(y - r * .08)}" rx="${f(r * .2)}" ry="${f(r * .24)}" fill="#ffd84a"/>
    <ellipse cx="${f(x - r * .38)}" cy="${f(y - r * .08)}" rx="${f(r * .06)}" ry="${f(r * .2)}" fill="#111"/>
    <ellipse cx="${f(x + r * .38)}" cy="${f(y - r * .08)}" rx="${f(r * .06)}" ry="${f(r * .2)}" fill="#111"/>
  </g>
  <path d="M${f(x - r * .12)} ${f(y + r * .25)}h${f(r * .24)}l${f(-r * .12)} ${f(r * .14)}z" fill="#e87a90"/>
</g>`;
}
