// Traditional mahjong faces (centuries-old public-domain designs), drawn in a 0 0 40 52 box:
// dots 1–9, bamboo 1–9, characters 1–9, four winds, three dragons → 34 kinds.
const R = '#c62a2f', B = '#1f4fa8', G = '#1d8a4a', K = '#1b1b1f';
const POS: Record<number, [number, number][]> = {
  1: [[20, 26]], 2: [[20, 14], [20, 38]], 3: [[11, 12], [20, 26], [29, 40]], 4: [[12, 15], [28, 15], [12, 37], [28, 37]],
  5: [[11, 12], [29, 12], [20, 26], [11, 40], [29, 40]], 6: [[13, 11], [27, 11], [13, 26], [27, 26], [13, 41], [27, 41]],
  7: [[9, 9], [20, 14], [31, 19], [13, 31], [27, 31], [13, 43], [27, 43]], 8: [[13, 8], [27, 8], [13, 20], [27, 20], [13, 32], [27, 32], [13, 44], [27, 44]],
  9: [[9, 10], [20, 10], [31, 10], [9, 26], [20, 26], [31, 26], [9, 42], [20, 42], [31, 42]],
};
const dot = (x: number, y: number, r: number, c: string) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${y}" r="${r * .62}" fill="#fff"/><circle cx="${x}" cy="${y}" r="${r * .38}" fill="${c}"/><circle cx="${x - r * .25}" cy="${y - r * .25}" r="${r * .12}" fill="#fff" opacity=".8"/>`;
function dots(n: number) {
  if (n === 1) return `<circle cx="20" cy="26" r="15" fill="${G}"/><circle cx="20" cy="26" r="12" fill="#fff"/><circle cx="20" cy="26" r="10" fill="${R}"/><circle cx="20" cy="26" r="6.5" fill="#fff"/><circle cx="20" cy="26" r="4" fill="${B}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<circle cx="${20 + 8.2 * Math.cos(a * Math.PI / 180)}" cy="${26 + 8.2 * Math.sin(a * Math.PI / 180)}" r="1.1" fill="#fff"/>`).join('')}`;
  const r = n <= 4 ? 7 : n <= 6 ? 5.8 : 4.6, cols = [B, G, R];
  return POS[n].map(([x, y], i) => dot(x, y, r, n === 3 ? cols[i] : n === 7 && i < 3 ? G : n === 5 && i === 2 ? R : n >= 6 && Math.floor(i / (n === 9 ? 3 : 2)) % 2 ? R : B)).join('');
}
const stick = (x: number, y: number, h: number, c: string) => `<rect x="${x - 2.3}" y="${y - h / 2}" width="4.6" height="${h}" rx="2.3" fill="${c}"/><rect x="${x - 2.3}" y="${y - .8}" width="4.6" height="1.6" fill="#fff" opacity=".7"/><rect x="${x - 1}" y="${y - h / 2 + 1}" width="1" height="${h - 2}" fill="#fff" opacity=".35"/>`;
function bamboo(n: number) {
  if (n === 1) return `<path d="M20 44c-8 0-12-6-10-13c2-6 8-8 12-6c-2-4 0-9 4-10c3 4 2 8 0 10c5 0 8 4 6 9c-2 6-6 10-12 10z" fill="${G}"/><path d="M14 32c4-3 8-3 12 0" stroke="#fff" fill="none" stroke-width="1.4"/><circle cx="25" cy="16" r="4" fill="${R}"/><circle cx="26" cy="15" r="1" fill="#fff"/><path d="M28 16l5 1-5 2z" fill="#e8a33a"/><path d="M12 44l-3 5M18 45l-1 5" stroke="${R}" stroke-width="1.6"/>`;
  const h = n <= 3 ? 18 : n <= 6 ? 14 : 11;
  const cols = (i: number) => (n === 5 || n === 7 || n === 9) && (i === 0 || (n === 9 && i % 3 === 1)) ? R : G;
  const P: Record<number, [number, number][]> = {
    2: [[20, 15], [20, 37]], 3: [[20, 15], [12, 37], [28, 37]], 4: [[13, 15], [27, 15], [13, 37], [27, 37]], 5: [[20, 26], [11, 14], [29, 14], [11, 38], [29, 38]],
    6: [[10, 15], [20, 15], [30, 15], [10, 37], [20, 37], [30, 37]], 7: [[20, 9], [10, 26], [20, 26], [30, 26], [10, 43], [20, 43], [30, 43]],
    8: [[10, 12], [20, 12], [30, 12], [14, 26], [26, 26], [10, 40], [20, 40], [30, 40]], 9: [[10, 10], [20, 10], [30, 10], [10, 26], [20, 26], [30, 26], [10, 42], [20, 42], [30, 42]],
  };
  return P[n].map(([x, y], i) => stick(x, y, h, cols(i))).join('');
}
const NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const ch = (n: number) => `<text x="20" y="21" text-anchor="middle" font-family="serif" font-weight="700" font-size="17" fill="${K}">${NUM[n - 1]}</text><text x="20" y="45" text-anchor="middle" font-family="serif" font-weight="700" font-size="20" fill="${R}">萬</text>`;
const big = (s: string, c: string) => `<text x="20" y="36" text-anchor="middle" font-family="serif" font-weight="900" font-size="27" fill="${c}">${s}</text>`;
const white = `<rect x="7" y="8" width="26" height="36" rx="2" fill="none" stroke="${B}" stroke-width="3"/><rect x="11" y="12" width="18" height="28" rx="1" fill="none" stroke="${B}" stroke-width="1.4"/>`;

export const MJ_FACES: string[] = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(dots), ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(bamboo), ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(ch),
  big('東', K), big('南', K), big('西', K), big('北', K), big('中', R), big('發', G), white,
];
export const mjFace = (i: number) => `<svg viewBox="0 0 40 52">${MJ_FACES[i % MJ_FACES.length]}</svg>`;
/** tile back: emerald with a gold border pattern */
export const MJ_BACK = `<svg viewBox="0 0 40 52"><rect width="40" height="52" rx="4" fill="#1f8f63"/><rect x="3" y="3" width="34" height="46" rx="3" fill="none" stroke="#f3c64f" stroke-width="1.5"/><path d="M20 12l8 14-8 14-8-14z" fill="none" stroke="#f3c64f" stroke-width="1.4"/><circle cx="20" cy="26" r="3" fill="#f3c64f"/></svg>`;
