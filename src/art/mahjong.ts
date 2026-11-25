// 24 tile faces, each drawn in a 0 0 40 50 box. Original drawings, no reproduced tile sets.
const num = (n: number) => `<text x="20" y="22" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="19" fill="#1f3a8a">${n}</text><text x="20" y="44" text-anchor="middle" font-family="serif" font-weight="700" font-size="18" fill="#c0272d">万</text>`;
const PICS = [
  // teapot
  `<ellipse cx="20" cy="31" rx="12" ry="10" fill="#2f8f8a"/><path d="M8 28c-6-2-7 6-3 7" fill="none" stroke="#2f8f8a" stroke-width="3"/><path d="M31 27l6-6" stroke="#2f8f8a" stroke-width="3" stroke-linecap="round"/><ellipse cx="20" cy="21" rx="7" ry="2.5" fill="#1f6b67"/><circle cx="20" cy="17" r="2" fill="#c0272d"/><path d="M13 31h14" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>`,
  // frog
  `<ellipse cx="20" cy="31" rx="13" ry="10" fill="#4caf50"/><circle cx="13" cy="21" r="5" fill="#4caf50"/><circle cx="27" cy="21" r="5" fill="#4caf50"/><circle cx="13" cy="21" r="2.3" fill="#111"/><circle cx="27" cy="21" r="2.3" fill="#111"/><path d="M13 32q7 5 14 0" fill="none" stroke="#1b5e20" stroke-width="1.6"/><ellipse cx="20" cy="36" rx="7" ry="3" fill="#a5d6a7"/>`,
  // coin with square hole
  `<circle cx="20" cy="26" r="13" fill="#e2a72e" stroke="#9c6b12" stroke-width="2"/><circle cx="20" cy="26" r="9.5" fill="none" stroke="#9c6b12" stroke-width="1"/><rect x="16.5" y="22.5" width="7" height="7" fill="#f6efd9" stroke="#9c6b12"/>`,
  // lotus
  `<path d="M20 12c5 6 5 14 0 22c-5-8-5-16 0-22z" fill="#f06292"/><path d="M8 20c7 1 11 7 12 14c-8-1-12-7-12-14zM32 20c-7 1-11 7-12 14c8-1 12-7 12-14z" fill="#f48fb1"/><path d="M8 36q12 6 24 0" fill="none" stroke="#2e7d32" stroke-width="3"/>`,
  // koi
  `<path d="M8 26c5-9 18-9 24 0c-6 9-19 9-24 0z" fill="#ff7a1a"/><path d="M32 26l6-6v12z" fill="#ff7a1a"/><circle cx="14" cy="24" r="1.8" fill="#111"/><path d="M19 21c2 2 2 8 0 10M24 21c2 2 2 8 0 10" stroke="#fff" stroke-width="1.5" fill="none"/>`,
  // lantern
  `<rect x="18" y="8" width="4" height="4" fill="#8a5a2b"/><rect x="11" y="12" width="18" height="4" rx="2" fill="#d4a017"/><ellipse cx="20" cy="27" rx="11" ry="12" fill="#d32f2f"/><path d="M14 17v20M20 15v24M26 17v20" stroke="#ff8a80" stroke-width="1.2"/><rect x="11" y="37" width="18" height="4" rx="2" fill="#d4a017"/><path d="M20 41v6" stroke="#d4a017" stroke-width="2"/>`,
  // fan
  `<path d="M20 38L5 22a20 20 0 0 1 30 0z" fill="#7e57c2"/><path d="M20 38L9 18M20 38L15 14M20 38L20 13M20 38L25 14M20 38L31 18" stroke="#ede7f6" stroke-width="1.2"/><circle cx="20" cy="38" r="2.5" fill="#d4a017"/>`,
  // bamboo
  `<g fill="#43a047"><rect x="9" y="9" width="6" height="34" rx="3"/><rect x="17" y="13" width="6" height="30" rx="3"/><rect x="25" y="9" width="6" height="34" rx="3"/></g><path d="M9 20h6M9 32h6M17 24h6M17 35h6M25 18h6M25 30h6" stroke="#1b5e20" stroke-width="2"/>`,
  // plum blossom
  `<g fill="#ec407a">${[0, 72, 144, 216, 288].map(a => `<circle cx="${20 + 8 * Math.cos((a - 90) * Math.PI / 180)}" cy="${26 + 8 * Math.sin((a - 90) * Math.PI / 180)}" r="6"/>`).join('')}</g><circle cx="20" cy="26" r="4" fill="#ffd54f"/>`,
  // tea bowl
  `<path d="M7 24h26c0 9-6 15-13 15S7 33 7 24z" fill="#5d7a99"/><path d="M15 39h10v3H15z" fill="#3e5670"/><path d="M14 18c0-3 3-3 3-6M22 18c0-3 3-3 3-6" fill="none" stroke="#9aa9b8" stroke-width="1.6" stroke-linecap="round"/><path d="M9 27h22" stroke="#fff" stroke-opacity=".5"/>`,
  // lucky cat
  `<path d="M10 16l2-7 5 5zM30 16l-2-7-5 5z" fill="#fff" stroke="#333"/><ellipse cx="20" cy="21" rx="11" ry="9" fill="#fff" stroke="#333"/><path d="M11 30h18v11H11z" fill="#fff" stroke="#333"/><path d="M28 30v-9" stroke="#333" stroke-width="5" stroke-linecap="round"/><path d="M28 30v-9" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M15 20q1.5-2 3 0M22 20q1.5-2 3 0" fill="none" stroke="#333"/><path d="M11 30h18" stroke="#d32f2f" stroke-width="3"/><circle cx="20" cy="33" r="2.3" fill="#e2a72e"/>`,
  // crane bird
  `<path d="M6 30c8-2 14-10 22-10c-3 4-4 10-10 13z" fill="#fff" stroke="#333"/><path d="M28 20c2-5 6-6 8-4" fill="none" stroke="#333" stroke-width="2"/><circle cx="35" cy="16" r="2" fill="#d32f2f"/><path d="M18 33l-2 9M20 32l1 10" stroke="#333" stroke-width="1.5"/><path d="M10 29c4-5 9-7 12-6" fill="none" stroke="#333"/>`,
  // cloud swirl
  `<path d="M8 32a6 6 0 0 1 3-11a8 8 0 0 1 15-2a6 6 0 0 1 6 9a5 5 0 0 1-4 4z" fill="#90caf9"/><path d="M14 27a3 3 0 1 1 4 2M24 25a3 3 0 1 0 4 3" fill="none" stroke="#1e63b5" stroke-width="1.6"/>`,
  // dumpling
  `<path d="M6 34c0-9 6-16 14-16s14 7 14 16z" fill="#f3e3c3" stroke="#b08a55"/><path d="M11 26l2 4M16 22l1 5M21 21v5M26 22l-1 5M30 26l-2 4" stroke="#b08a55" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="20" cy="38" rx="15" ry="2.5" fill="#000" opacity=".1"/>`,
  // red centre character
  `<text x="20" y="36" text-anchor="middle" font-family="serif" font-weight="900" font-size="28" fill="#c0272d">中</text>`,
];
export const MJ_FACES: string[] = [...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num), ...PICS];
export const mjFace = (i: number) => `<svg viewBox="0 0 40 50">${MJ_FACES[i % MJ_FACES.length]}</svg>`;
