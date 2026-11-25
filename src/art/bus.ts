import { shade } from '../core/util';

/** side-view bus facing right. groups = window count (1 window = 1 group of 5).
 *  filled[i] = colour of the group sitting at window i (or null). viewBox (60+groups*34) x 70 */
export function busSVG(col: string, groups: number, filled: (string | null)[], label = '') {
  const W = 60 + groups * 34, d = shade(col, -0.3), l = shade(col, 0.3);
  const win = Array.from({ length: groups }, (_, i) => {
    const x = 14 + i * 34, g = filled[i];
    const heads = g ? [0, 1, 2].map(k => `<circle cx="${x + 7 + k * 8}" cy="25" r="4" fill="${g}"/><rect x="${x + 3 + k * 8}" y="29" width="8" height="7" rx="3" fill="${shade(g, -0.2)}"/>`).join('') : '';
    return `<rect x="${x}" y="14" width="30" height="24" rx="4" fill="#cdeeff"/>${heads}<rect x="${x + 2}" y="16" width="5" height="20" rx="2" fill="#fff" opacity=".6"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} 70" width="${W}" height="70">
  <ellipse cx="${W / 2}" cy="64" rx="${W / 2 - 6}" ry="4" fill="#000" opacity=".25"/>
  <rect x="4" y="6" width="${W - 8}" height="50" rx="10" fill="${col}"/>
  <rect x="4" y="40" width="${W - 8}" height="16" rx="6" fill="${d}"/>
  <rect x="8" y="8" width="${W - 16}" height="4" rx="2" fill="${l}"/>
  ${win}
  <rect x="${W - 40}" y="14" width="16" height="36" rx="3" fill="#9fd4f0" stroke="${d}" stroke-width="2"/>
  <path d="M${W - 18} 14h8a6 6 0 0 1 6 6v14h-14z" fill="#bfe6ff"/>
  <rect x="${W - 9}" y="42" width="5" height="6" rx="2" fill="#fff6b0"/>
  <circle cx="22" cy="56" r="9" fill="#222"/><circle cx="22" cy="56" r="4" fill="#bbb"/>
  <circle cx="${W - 26}" cy="56" r="9" fill="#222"/><circle cx="${W - 26}" cy="56" r="4" fill="#bbb"/>
  ${label ? `<text x="${W / 2 - 16}" y="52" font-size="10" font-weight="700" font-family="Fredoka" fill="#fff" text-anchor="middle">${label}</text>` : ''}
</svg>`;
}

/** cluster of 5 people (group) in one colour, viewBox 0 0 40 40 */
export function crowd(col: string) {
  const d = shade(col, -0.25), p = (x: number, y: number, s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4.5" y="0" width="9" height="11" rx="4" fill="${d}"/><circle cx="0" cy="-3" r="4" fill="${col}"/><circle cx="-1.3" cy="-4.3" r="1.2" fill="#fff" opacity=".6"/></g>`;
  return `<svg viewBox="0 0 40 40"><ellipse cx="20" cy="34" rx="16" ry="4" fill="#000" opacity=".18"/>${p(10, 11, .9)}${p(20, 9, .9)}${p(30, 11, .9)}${p(14, 21)}${p(26, 21)}</svg>`;
}
