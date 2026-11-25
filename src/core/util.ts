export const R = (n: number) => Math.floor(Math.random() * n);
export const pick = <T>(a: T[]): T => a[R(a.length)];
export const shuffle = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const range = (n: number) => [...Array(n).keys()];
export const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector(s) as T;
export const $$ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => [...root.querySelectorAll(s)] as T[];
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** mix a hex colour with white (t>0) or black (t<0) */
export function shade(hex: string, t: number) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  const m = c.map(v => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)));
  return '#' + m.map(v => v.toString(16).padStart(2, '0')).join('');
}
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
