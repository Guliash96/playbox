// Pixel pictures for Pixel Snakes: small vector scenes drawn on a canvas and sampled into an N×N grid
// of palette letters ('.' = empty). Each cell takes the colour that covers most of it (8×8 supersampling),
// so any resolution works and pictures stay crisp.
export const PAL: Record<string, string> = {
  R: '#e8443a', W: '#f5efe2', Y: '#ffc533', K: '#3a3340', P: '#ff7ab2', O: '#ff9a3c', B: '#3d8bff', G: '#3fbf5f', N: '#8a5a2b',
  C: '#18b5c4', V: '#7b5cff', L: '#9be37a', S: '#9fdcff', D: '#2e8b4a', Q: '#ffc9df', T: '#d9a066', A: '#a3a7b0', M: '#c62a5a',
};
type Ctx = CanvasRenderingContext2D;
// helpers work in a 0..100 square
const circ = (x: Ctx, cx: number, cy: number, r: number, c: string) => { x.fillStyle = PAL[c]; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); };
const ell = (x: Ctx, cx: number, cy: number, rx: number, ry: number, c: string, rot = 0) => { x.fillStyle = PAL[c]; x.beginPath(); x.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); x.fill(); };
const rect = (x: Ctx, a: number, b: number, w: number, h: number, c: string) => { x.fillStyle = PAL[c]; x.fillRect(a, b, w, h); };
const poly = (x: Ctx, pts: number[], c: string) => { x.fillStyle = PAL[c]; x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); x.closePath(); x.fill(); };
const rr = (x: Ctx, a: number, b: number, w: number, h: number, r: number, c: string) => { x.fillStyle = PAL[c]; x.beginPath(); x.roundRect(a, b, w, h, r); x.fill(); };
const sky = (x: Ctx, top: string, ground: string, h = 72) => { rect(x, 0, 0, 100, h, top); rect(x, 0, h, 100, 100 - h, ground); };
const cloud = (x: Ctx, cx: number, cy: number, s = 1) => { circ(x, cx, cy, 7 * s, 'W'); circ(x, cx + 8 * s, cy - 3 * s, 8 * s, 'W'); circ(x, cx + 16 * s, cy, 6 * s, 'W'); rect(x, cx, cy, 16 * s, 6 * s, 'W'); };
const flowerDot = (x: Ctx, cx: number, cy: number, c: string) => { for (let a = 0; a < 5; a++) circ(x, cx + Math.cos(a * 1.257) * 3, cy + Math.sin(a * 1.257) * 3, 2.6, c); circ(x, cx, cy, 2, 'Y'); };

const SCENES: ((x: Ctx) => void)[] = [
  // heart
  x => { rect(x, 0, 0, 100, 100, 'S'); cloud(x, 8, 18, .8); cloud(x, 66, 82, .9); circ(x, 34, 40, 20, 'R'); circ(x, 66, 40, 20, 'R'); poly(x, [15, 48, 85, 48, 50, 86], 'R'); circ(x, 28, 34, 6, 'Q'); },
  // strawberry
  x => { rect(x, 0, 0, 100, 100, 'Q'); poly(x, [18, 36, 82, 36, 74, 70, 50, 92, 26, 70], 'R'); circ(x, 50, 40, 32, 'R'); for (const [a, b] of [[36, 46], [52, 54], [64, 44], [44, 66], [58, 72], [32, 60], [68, 60], [50, 38]]) ell(x, a, b, 1.8, 2.6, 'Y'); poly(x, [30, 16, 50, 26, 70, 16, 62, 30, 50, 34, 38, 30], 'G'); rect(x, 47, 6, 6, 16, 'D'); },
  // cat face
  x => { rect(x, 0, 0, 100, 100, 'V'); flowerDot(x, 12, 12, 'Q'); flowerDot(x, 88, 88, 'Q'); poly(x, [16, 40, 22, 8, 44, 30], 'O'); poly(x, [84, 40, 78, 8, 56, 30], 'O'); poly(x, [22, 34, 25, 16, 38, 30], 'Q'); poly(x, [78, 34, 75, 16, 62, 30], 'Q'); ell(x, 50, 56, 36, 30, 'O'); ell(x, 50, 70, 20, 14, 'W'); ell(x, 36, 52, 6, 8, 'K'); ell(x, 64, 52, 6, 8, 'K'); circ(x, 38, 49, 2, 'W'); circ(x, 66, 49, 2, 'W'); poly(x, [45, 62, 55, 62, 50, 68], 'P'); rect(x, 49, 67, 2, 6, 'K'); },
  // fish
  x => { rect(x, 0, 0, 100, 100, 'B'); for (const [a, b, r] of [[16, 20, 4], [24, 12, 2.5], [84, 76, 3], [78, 86, 2]]) circ(x, a, b, r, 'S'); ell(x, 46, 50, 30, 20, 'O'); poly(x, [70, 50, 92, 30, 92, 70], 'Y'); poly(x, [38, 32, 54, 18, 58, 34], 'Y'); for (const c of [36, 50]) rect(x, c, 32, 5, 36, 'W'); circ(x, 26, 46, 5, 'W'); circ(x, 25, 46, 2.5, 'K'); rect(x, 0, 88, 100, 12, 'T'); ell(x, 14, 86, 4, 10, 'G'); ell(x, 86, 84, 4, 12, 'G'); },
  // flower
  x => { sky(x, 'S', 'G', 74); cloud(x, 62, 16); rect(x, 47, 46, 6, 34, 'D'); ell(x, 38, 64, 12, 5, 'D', -.5); ell(x, 62, 70, 12, 5, 'D', .5); for (let a = 0; a < 6; a++) circ(x, 50 + Math.cos(a * 1.047) * 15, 34 + Math.sin(a * 1.047) * 15, 11, 'P'); circ(x, 50, 34, 10, 'Y'); flowerDot(x, 14, 86, 'R'); flowerDot(x, 84, 90, 'V'); },
  // mushroom
  x => { sky(x, 'S', 'L', 76); cloud(x, 8, 16, .7); rr(x, 38, 50, 24, 34, 6, 'W'); x.save(); x.beginPath(); x.rect(0, 0, 100, 54); x.clip(); ell(x, 50, 54, 40, 36, 'R'); x.restore(); for (const [a, b, r] of [[34, 36, 7], [60, 30, 6], [74, 44, 5], [24, 46, 4.5], [48, 24, 4]]) circ(x, a, b, r, 'W'); rect(x, 42, 64, 4, 5, 'K'); rect(x, 54, 64, 4, 5, 'K'); },
  // house + sun
  x => { sky(x, 'S', 'G', 76); circ(x, 82, 16, 10, 'Y'); rect(x, 22, 46, 56, 34, 'T'); poly(x, [16, 48, 50, 18, 84, 48], 'R'); rect(x, 44, 58, 14, 22, 'N'); rect(x, 28, 54, 12, 12, 'S'); rect(x, 62, 54, 12, 12, 'S'); rect(x, 66, 22, 8, 16, 'A'); cloud(x, 6, 20, .7); },
  // ice cream
  x => { rect(x, 0, 0, 100, 100, 'C'); poly(x, [32, 50, 68, 50, 50, 94], 'T'); for (let k = 0; k < 4; k++) rect(x, 34 + k * 8, 52, 2, 18 - k * 3, 'N'); circ(x, 38, 44, 15, 'Q'); circ(x, 62, 44, 15, 'W'); circ(x, 50, 28, 16, 'N'); circ(x, 50, 12, 5, 'R'); for (const [a, b, c] of [[40, 24, 'Y'], [56, 30, 'P'], [48, 34, 'L'], [58, 20, 'B']] as [number, number, string][]) rect(x, a, b, 4, 2, c); },
  // apple
  x => { rect(x, 0, 0, 100, 100, 'Y'); circ(x, 36, 58, 28, 'R'); circ(x, 64, 58, 28, 'R'); circ(x, 50, 70, 26, 'R'); rect(x, 47, 18, 6, 18, 'N'); ell(x, 64, 24, 14, 7, 'G', -.4); ell(x, 32, 48, 6, 10, 'Q', .3); },
  // rainbow
  x => { rect(x, 0, 0, 100, 100, 'S'); const c = ['R', 'O', 'Y', 'G', 'B', 'V']; c.forEach((k, i) => circ(x, 50, 84, 46 - i * 6, k)); circ(x, 50, 84, 10, 'S'); cloud(x, 4, 78, 1.1); cloud(x, 72, 78, 1.1); rect(x, 0, 88, 100, 12, 'W'); },
  // watermelon
  x => { rect(x, 0, 0, 100, 100, 'L'); x.save(); x.beginPath(); x.rect(0, 34, 100, 66); x.clip(); circ(x, 50, 34, 46, 'D'); circ(x, 50, 34, 40, 'W'); circ(x, 50, 34, 35, 'R'); x.restore(); for (const [a, b] of [[34, 44], [50, 50], [66, 44], [42, 58], [58, 58], [50, 66], [28, 52], [72, 52]]) ell(x, a, b, 2, 3, 'K'); },
  // chick
  x => { sky(x, 'S', 'G', 74); cloud(x, 64, 14, .8); circ(x, 50, 56, 26, 'Y'); circ(x, 50, 32, 16, 'Y'); ell(x, 28, 60, 10, 6, 'O', .5); circ(x, 44, 30, 3, 'K'); circ(x, 56, 30, 3, 'K'); poly(x, [46, 36, 54, 36, 50, 42], 'O'); poly(x, [44, 16, 50, 8, 52, 18], 'O'); rect(x, 40, 80, 3, 8, 'O'); rect(x, 56, 80, 3, 8, 'O'); flowerDot(x, 12, 88, 'W'); flowerDot(x, 88, 86, 'P'); },
  // penguin
  x => { rect(x, 0, 0, 100, 100, 'S'); rect(x, 0, 84, 100, 16, 'W'); ell(x, 50, 58, 28, 32, 'K'); circ(x, 50, 28, 20, 'K'); ell(x, 50, 64, 19, 24, 'W'); circ(x, 40, 33, 10, 'W'); circ(x, 60, 33, 10, 'W'); ell(x, 50, 44, 14, 7, 'W'); circ(x, 41, 33, 4.6, 'K'); circ(x, 59, 33, 4.6, 'K'); poly(x, [44, 41, 56, 41, 50, 49], 'O'); ell(x, 21, 60, 6, 18, 'K', .35); ell(x, 79, 60, 6, 18, 'K', -.35); ell(x, 39, 90, 10, 5, 'O'); ell(x, 61, 90, 10, 5, 'O'); },
  // sunset sea
  x => { rect(x, 0, 0, 100, 30, 'V'); rect(x, 0, 30, 100, 16, 'P'); rect(x, 0, 46, 100, 14, 'O'); circ(x, 50, 60, 20, 'Y'); rect(x, 0, 60, 100, 40, 'B'); for (let k = 0; k < 4; k++) rect(x, 34 + k * 4, 66 + k * 8, 32 - k * 8, 4, 'Y'); cloud(x, 10, 20, .8); cloud(x, 70, 12, .7); },
  // cherry
  x => { rect(x, 0, 0, 100, 100, 'Q'); x.strokeStyle = PAL.D; x.lineWidth = 5; x.beginPath(); x.moveTo(34, 64); x.quadraticCurveTo(42, 30, 60, 14); x.moveTo(66, 66); x.quadraticCurveTo(64, 34, 60, 14); x.stroke(); ell(x, 72, 18, 14, 7, 'G', -.3); circ(x, 34, 70, 18, 'M'); circ(x, 66, 72, 18, 'M'); circ(x, 27, 63, 5, 'P'); circ(x, 59, 65, 5, 'P'); },
  // frog
  x => { rect(x, 0, 0, 100, 100, 'C'); ell(x, 50, 80, 44, 14, 'D'); ell(x, 50, 58, 32, 24, 'G'); circ(x, 32, 34, 12, 'G'); circ(x, 68, 34, 12, 'G'); circ(x, 32, 34, 7, 'W'); circ(x, 68, 34, 7, 'W'); circ(x, 33, 35, 4, 'K'); circ(x, 67, 35, 4, 'K'); ell(x, 50, 62, 18, 4, 'D'); ell(x, 50, 74, 16, 9, 'L'); circ(x, 34, 58, 3, 'P'); circ(x, 66, 58, 3, 'P'); },
];
export const SCENE_COUNT = SCENES.length;

const cache = new Map<string, string[]>();
/** picture #i sampled into an n×n grid of palette letters */
export function pixPic(i: number, n: number): string[] {
  const key = i + ':' + n; if (cache.has(key)) return cache.get(key)!;
  const S = 8, c = document.createElement('canvas'); c.width = c.height = n * S; const x = c.getContext('2d')!;
  x.scale(n * S / 100, n * S / 100); SCENES[i % SCENES.length](x);
  const d = x.getImageData(0, 0, n * S, n * S).data, rgb = Object.entries(PAL).map(([k, h]) => [k, parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as [string, number, number, number]);
  const near = (r: number, g: number, b: number) => { let best = '.', bd = 1e9; for (const [k, R, G, B] of rgb) { const e = (R - r) ** 2 + (G - g) ** 2 + (B - b) ** 2; if (e < bd) { bd = e; best = k; } } return bd < 60 ? best : ''; };
  const out: string[] = [];
  for (let gy = 0; gy < n; gy++) {
    let row = '';
    for (let gx = 0; gx < n; gx++) {
      const cnt: Record<string, number> = {};
      for (let sy = 1; sy < S; sy += 2) for (let sx = 1; sx < S; sx += 2) {
        const p = ((gy * S + sy) * n * S + gx * S + sx) * 4; const k = d[p + 3] < 128 ? '.' : near(d[p], d[p + 1], d[p + 2]);
        if (k) cnt[k] = (cnt[k] || 0) + 1;
      }
      row += Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || '.';
    }
    out.push(row);
  }
  cache.set(key, out); return out;
}
