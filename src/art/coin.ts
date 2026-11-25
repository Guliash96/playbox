// Metallic coins drawn as stacked discs (side view, slight top-down angle).
export const METALS = ['#c8743c', '#b7c0ca', '#e6b422', '#d9897a', '#6fa8d8', '#8cc063', '#b58ad9', '#e2675a', '#4fb3a1', '#5b5f6b', '#f0a43a', '#9a6b4f'];
export const metal = (v: number) => METALS[(v - 1) % METALS.length];

let defsDone = false;
/** gradients shared by every coin on the page */
export function ensureCoinDefs() {
  if (defsDone) return; defsDone = true;
  const g = METALS.map((c, i) => `
    <linearGradient id="cs${i + 1}" x1="0" x2="1"><stop offset="0" stop-color="${c}" stop-opacity="1"/><stop offset=".25" stop-color="#fff" stop-opacity=".9"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <radialGradient id="ct${i + 1}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}"/></radialGradient>`).join('');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
  s.innerHTML = `<defs>${g}</defs>`;
  document.body.appendChild(s);
}

/** one stack; coins[] bottom→top values. Returns inner SVG for a 60-wide viewBox, height H */
export const COIN_T = 7.5, COIN_RY = 8;
export function coinStack(coins: number[], H: number, liftFrom = Infinity, hideFrom = Infinity, dropFrom = Infinity) {
  const rx = 25, ry = 8, t = 7.5, base = H - ry - 4;
  let s = '';
  coins.forEach((v, i) => {
    const k = ((v - 1) % METALS.length) + 1, lift = i >= liftFrom ? -12 : 0, cy = base - i * t + lift;
    const st = i >= hideFrom ? ' style="visibility:hidden"' : i >= dropFrom ? ` style="animation-delay:${(i - dropFrom) * 55}ms"` : '';
    s += `<g class="coin${i >= dropFrom && i < hideFrom ? ' drop' : ''}"${st}>
      <path d="M${30 - rx} ${cy} v${t} a${rx} ${ry} 0 0 0 ${2 * rx} 0 v${-t}z" fill="url(#cs${k})"/>
      <path d="M${30 - rx} ${cy + t * .5} a${rx} ${ry} 0 0 0 ${2 * rx} 0" fill="none" stroke="#000" stroke-opacity=".18" stroke-dasharray="2 2"/>
      <ellipse cx="30" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#ct${k})" stroke="#000" stroke-opacity=".25"/>
      <ellipse cx="30" cy="${cy}" rx="${rx - 5}" ry="${ry - 2.2}" fill="none" stroke="#fff" stroke-opacity=".5"/>
      ${i === coins.length - 1 || coins[i + 1] !== v || i + 1 === liftFrom || i + 1 === hideFrom ? `<text x="30" y="${cy + 3.6}" text-anchor="middle" font-size="11" font-weight="700" font-family="Fredoka" fill="#2b1d0e" fill-opacity=".85">${v}</text>` : ''}
    </g>`;
  });
  return s;
}
