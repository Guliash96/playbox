import { shade } from '../core/util';

/** top-down car, facing right, len = cells (1..3). viewBox is (len*100) x 100 */
export function carSVG(len: number, col: string, extra = '') {
  const W = len * 100, d = shade(col, -0.28), l = shade(col, 0.35);
  const isTruck = len >= 3;
  const cabX = isTruck ? W - 112 : W * 0.3, cabW = isTruck ? 70 : W * 0.4;
  const cargo = isTruck ? `<rect x="14" y="16" width="${W - 136}" height="68" rx="10" fill="${l}"/><path d="M28 30h${W - 164}M28 50h${W - 164}M28 70h${W - 164}" stroke="${d}" stroke-width="3" opacity=".35"/>` : '';
  return `<svg viewBox="0 0 ${W} 100" ${extra}>
  <rect x="8" y="14" width="${W - 14}" height="82" rx="26" fill="#000" opacity=".28"/>
  <rect x="4" y="7" width="${W - 8}" height="84" rx="26" fill="${col}"/>
  <rect x="4" y="7" width="${W - 8}" height="84" rx="26" fill="none" stroke="${d}" stroke-width="4"/>
  <rect x="14" y="13" width="${W - 28}" height="18" rx="9" fill="#fff" opacity=".28"/>
  ${cargo}
  <rect x="${cabX}" y="18" width="${cabW}" height="62" rx="14" fill="${d}"/>
  <rect x="${cabX + cabW - 4}" y="20" width="${isTruck ? 26 : Math.max(16, W * 0.1)}" height="58" rx="9" fill="#bfe6ff"/>
  <rect x="${cabX + cabW - 2}" y="22" width="6" height="54" rx="3" fill="#fff" opacity=".7"/>
  ${isTruck ? '' : `<rect x="${cabX - Math.max(12, W * 0.08)}" y="23" width="${Math.max(12, W * 0.08)}" height="52" rx="7" fill="#8fc6e8"/>`}
  <rect x="${W - 14}" y="15" width="8" height="15" rx="3" fill="#fff6b0"/><rect x="${W - 14}" y="68" width="8" height="15" rx="3" fill="#fff6b0"/>
  <rect x="6" y="16" width="6" height="13" rx="2" fill="#ff4b4b"/><rect x="6" y="69" width="6" height="13" rx="2" fill="#ff4b4b"/>
  <rect x="${W * 0.22}" y="2" width="18" height="8" rx="3" fill="#222"/><rect x="${W * 0.22}" y="88" width="18" height="8" rx="3" fill="#222"/>
  <rect x="${W * 0.72}" y="2" width="18" height="8" rx="3" fill="#222"/><rect x="${W * 0.72}" y="88" width="18" height="8" rx="3" fill="#222"/>
</svg>`;
}
