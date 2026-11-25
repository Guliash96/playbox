// Item art for the merge game (0 0 40 40). Shared gradients live in one hidden <svg> (ensureHarborDefs).
const GR: Record<string, [string, string]> = {
  shrimp: ['#ffc0c8', '#ff6f86'], f1: ['#bfe9ff', '#3fa7e6'], f2: ['#ffd98a', '#f08a1a'], f3: ['#a9cbff', '#2f63d6'], f4: ['#c9d3e6', '#4c5a78'], f5: ['#fff3a6', '#e0a414'],
  peb: ['#e2e6ea', '#8d96a0'], sh1: ['#ffd6e2', '#ff7fa2'], sh2: ['#ffe0b8', '#ff9a4a'], sh3: ['#efe6ff', '#a98cff'], wood: ['#d9a86c', '#8a5a2b'],
  rope: ['#ecd2a8', '#b88a4f'], net: ['#bfe6f5', '#3a8fb8'], rod: ['#c48a4a', '#6b4429'], anc: ['#d3dbe6', '#4c5a78'],
};
let defsDone = false;
export function ensureHarborDefs() {
  if (defsDone) return; defsDone = true;
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute';
  s.innerHTML = `<defs>${Object.entries(GR).map(([k, [a, b]]) => `<linearGradient id="hg-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}
    <radialGradient id="hg-pearl" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#eef2ff"/><stop offset="1" stop-color="#b9c3e0"/></radialGradient>
    <radialGradient id="hg-shine" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
  document.body.appendChild(s);
}
const O = 'stroke="#2b2230" stroke-width="1.4" stroke-linejoin="round"';
const fish = (g: string, len: number, stripes = 0, crown = false) => {
  const L = len, x0 = 20 - L / 2, cy = 21;
  return `<ellipse cx="20" cy="33" rx="${L / 2}" ry="2.6" fill="#000" opacity=".15"/>
  <path d="M${x0 + L - 3} ${cy}l${L * .34} ${-L * .24}q${-L * .08} ${L * .24} 0 ${L * .48}z" fill="url(#hg-${g})" ${O}/>
  <path d="M${x0 + L * .35} ${cy - L * .28}q${L * .15} ${-L * .2} ${L * .32} ${-L * .02}z" fill="url(#hg-${g})" ${O}/>
  <ellipse cx="${x0 + L * .45}" cy="${cy}" rx="${L * .5}" ry="${L * .31}" fill="url(#hg-${g})" ${O}/>
  <path d="M${x0 + L * .12} ${cy + L * .08}q${L * .33} ${L * .2} ${L * .7} ${L * .02}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.4"/>
  ${Array.from({ length: stripes }, (_, k) => `<path d="M${x0 + L * (.38 + k * .14)} ${cy - L * .27}q-2 ${L * .27} 0 ${L * .54}" stroke="#2b2230" stroke-opacity=".35" stroke-width="1.8" fill="none"/>`).join('')}
  <path d="M${x0 + L * .3} ${cy - L * .02}q${L * .08} ${L * .1} 0 ${L * .2}" stroke="#2b2230" stroke-opacity=".5" fill="none" stroke-width="1.1"/>
  <ellipse cx="${x0 + L * .42}" cy="${cy - L * .14}" rx="${L * .26}" ry="${L * .09}" fill="url(#hg-shine)"/>
  <circle cx="${x0 + L * .17}" cy="${cy - L * .06}" r="${Math.max(2, L * .075)}" fill="#fff" ${O}/><circle cx="${x0 + L * .16}" cy="${cy - L * .06}" r="${Math.max(1.1, L * .04)}" fill="#1b1b1f"/>
  ${crown ? `<path d="M${x0 + L * .28} ${cy - L * .3}l2 -7 3.5 4.5 3 -6 3 6 3.5 -4.5 2 7z" fill="#ffd23f" ${O}/><circle cx="${x0 + L * .28 + 8.5}" cy="${cy - L * .3 - 4}" r="1.2" fill="#ff3d7f"/>` : ''}`;
};
export const CHAINS: { id: string; name: string; tiers: string[]; art: string[]; unlock: number }[] = [
  {
    id: 'fish', name: 'Риба', unlock: 0, tiers: ['Креветка', 'Рибка', 'Окунь', 'Скумбрія', 'Тунець', 'Золота риба'],
    art: [
      `<ellipse cx="20" cy="33" rx="10" ry="2.4" fill="#000" opacity=".15"/><path d="M11 27c-1-10 8-16 17-12c-6 0-10 4-9 9c1 5-5 7-8 3z" fill="url(#hg-shrimp)" ${O}/><path d="M14 22l-4-3M15 25.5h-4.5M27 14l5-5M26 13l1-6" stroke="#2b2230" stroke-width="1.1" stroke-linecap="round"/><path d="M17 18q2 3 1 6M20 16q2 3 1 6" stroke="#fff" stroke-opacity=".6" fill="none"/><circle cx="24.5" cy="16.5" r="1.6" fill="#1b1b1f"/>`,
      fish('f1', 18), fish('f2', 22, 2), fish('f3', 26, 3), fish('f4', 30, 0), fish('f5', 30, 0, true),
    ],
  },
  {
    id: 'shell', name: 'Мушлі', unlock: 0, tiers: ['Камінчик', 'Мушля', 'Рапан', 'Перлина', 'Скринька перлин'],
    art: [
      `<ellipse cx="20" cy="32" rx="12" ry="2.4" fill="#000" opacity=".15"/><ellipse cx="16" cy="25" rx="8" ry="5.5" fill="url(#hg-peb)" ${O}/><ellipse cx="25.5" cy="27.5" rx="5.5" ry="3.8" fill="url(#hg-peb)" ${O}/><ellipse cx="14" cy="23" rx="3" ry="1.4" fill="#fff" opacity=".6"/>`,
      `<ellipse cx="20" cy="33" rx="11" ry="2.4" fill="#000" opacity=".15"/><path d="M20 31L7 16a15 15 0 0 1 26 0z" fill="url(#hg-sh1)" ${O}/><path d="M20 31L11 12M20 31L16.5 9.5M20 31L23.5 9.5M20 31L29 12" stroke="#2b2230" stroke-opacity=".35" stroke-width="1.2"/><rect x="16.5" y="29" width="7" height="4.5" rx="1.5" fill="url(#hg-sh1)" ${O}/><path d="M12 14q8-6 16 0" stroke="#fff" stroke-opacity=".6" fill="none" stroke-width="1.4"/>`,
      `<ellipse cx="20" cy="33" rx="12" ry="2.4" fill="#000" opacity=".15"/><path d="M9 29c-3-11 6-20 17-17c7 2 7 11 0 13c-5 2-9-2-7-5c2-2 6-1 5 1" fill="url(#hg-sh2)" ${O}/><path d="M9 29l-3 4M26 25l7 6" stroke="#2b2230" stroke-width="1.4" stroke-linecap="round"/><path d="M13 18q4-5 10-4" stroke="#fff" stroke-opacity=".7" fill="none" stroke-width="1.4"/>`,
      `<ellipse cx="20" cy="33" rx="13" ry="2.4" fill="#000" opacity=".15"/><path d="M6 25a14 8 0 0 0 28 0z" fill="url(#hg-sh3)" ${O}/><path d="M6 25a14 10 0 0 1 28 0" fill="url(#hg-sh3)" ${O} transform="rotate(-18 6 25)"/><circle cx="20" cy="23" r="5.5" fill="url(#hg-pearl)" ${O}/><circle cx="18.3" cy="21.3" r="1.6" fill="#fff"/>`,
      `<ellipse cx="20" cy="34" rx="14" ry="2.4" fill="#000" opacity=".15"/><rect x="6" y="18" width="28" height="15" rx="2.5" fill="url(#hg-wood)" ${O}/><path d="M6 18c0-9 28-9 28 0" fill="url(#hg-wood)" ${O} transform="rotate(-22 6 18)"/><circle cx="14" cy="17" r="3.2" fill="url(#hg-pearl)" ${O}/><circle cx="20.5" cy="15" r="3.2" fill="url(#hg-pearl)" ${O}/><circle cx="27" cy="17" r="3.2" fill="url(#hg-pearl)" ${O}/><rect x="17.5" y="22" width="5" height="6" rx="1" fill="#ffd23f" ${O}/><path d="M6 25h28" stroke="#2b2230" stroke-opacity=".3"/>`,
    ],
  },
  {
    id: 'gear', name: 'Снасті', unlock: 2, tiers: ['Мотузка', 'Вузол', 'Сітка', 'Вудка', 'Якір'],
    art: [
      `<ellipse cx="20" cy="33" rx="12" ry="2.4" fill="#000" opacity=".15"/><ellipse cx="20" cy="25" rx="12" ry="7" fill="none" stroke="#7a5038" stroke-width="5.6"/><ellipse cx="20" cy="25" rx="12" ry="7" fill="none" stroke="url(#hg-rope)" stroke-width="4"/><ellipse cx="20" cy="25" rx="6.5" ry="3.6" fill="none" stroke="#7a5038" stroke-width="4.4"/><ellipse cx="20" cy="25" rx="6.5" ry="3.6" fill="none" stroke="url(#hg-rope)" stroke-width="3"/>`,
      `<ellipse cx="20" cy="33" rx="12" ry="2.4" fill="#000" opacity=".15"/><path d="M7 23c6-9 10 9 16 0s9 4 9 4" fill="none" stroke="#7a5038" stroke-width="6.4" stroke-linecap="round"/><path d="M7 23c6-9 10 9 16 0s9 4 9 4" fill="none" stroke="url(#hg-rope)" stroke-width="4.6" stroke-linecap="round"/><circle cx="20" cy="22" r="4.6" fill="url(#hg-rope)" ${O}/>`,
      `<ellipse cx="20" cy="34" rx="12" ry="2.4" fill="#000" opacity=".15"/><rect x="8" y="9" width="24" height="24" rx="4" fill="url(#hg-net)" fill-opacity=".35" ${O}/><path d="M8 17h24M8 25h24M16 9v24M24 9v24" stroke="#2b6a8a" stroke-width="1.6"/><circle cx="8" cy="9" r="3" fill="#ff8a1f" ${O}/><circle cx="32" cy="33" r="3" fill="#ff8a1f" ${O}/>`,
      `<ellipse cx="20" cy="35" rx="12" ry="2.2" fill="#000" opacity=".15"/><path d="M8 33L31 8" stroke="#2b2230" stroke-width="4.2" stroke-linecap="round"/><path d="M8 33L31 8" stroke="url(#hg-rod)" stroke-width="2.8" stroke-linecap="round"/><path d="M31 8q5 11 1 19" fill="none" stroke="#555" stroke-width="1"/><circle cx="32" cy="28" r="2.8" fill="#e8443a" ${O}/><circle cx="12" cy="29" r="4" fill="url(#hg-anc)" ${O}/>`,
      `<ellipse cx="20" cy="35" rx="13" ry="2.2" fill="#000" opacity=".15"/><path d="M20 10v22M13 16h14M8 25q2 9 12 9t12-9" fill="none" stroke="#2b2230" stroke-width="5.6" stroke-linecap="round"/><path d="M20 10v22M13 16h14M8 25q2 9 12 9t12-9" fill="none" stroke="url(#hg-anc)" stroke-width="3.8" stroke-linecap="round"/><circle cx="20" cy="8" r="3.4" fill="none" stroke="#2b2230" stroke-width="4"/><circle cx="20" cy="8" r="3.4" fill="none" stroke="url(#hg-anc)" stroke-width="2.4"/><path d="M6 26l3.5-3.5 2.5 4.5zM34 26l-3.5-3.5-2.5 4.5z" fill="url(#hg-anc)" ${O}/>`,
    ],
  },
];
export const CRATE = `<ellipse cx="20" cy="35" rx="15" ry="2.6" fill="#000" opacity=".2"/><rect x="5" y="10" width="30" height="24" rx="3" fill="url(#hg-wood)" ${O}/><path d="M5 18h30M5 26h30" stroke="#6b4429" stroke-width="1.8"/><path d="M8 10l24 24M32 10L8 34" stroke="#6b4429" stroke-width="1.4" opacity=".45"/><rect x="11" y="4" width="18" height="9" rx="2.5" fill="url(#hg-f3)" ${O}/><path d="M14.5 8.5h7l3-2.2v4.4l-3-2.2" fill="#fff"/>`;

/** harbour scene; parts appear as chapters are completed */
export const RESTORE = ['Причал', 'Рибальський човен', 'Маяк', 'Рибний ринок', 'Свято гавані', 'Гавань процвітає'];
export function harborScene(ch: number) {
  const eve = ch >= 5;
  const house = (x: number, y: number, w: number, h: number, wall: string, roof: string) => `<g transform="translate(${x} ${y})"><rect x="2" y="3" width="${w}" height="${h}" fill="#000" opacity=".12"/><rect width="${w}" height="${h}" fill="${wall}" stroke="#2b2230" stroke-width="1.2"/><path d="M-4 0L${w / 2} ${-h * .55}L${w + 4} 0z" fill="${roof}" stroke="#2b2230" stroke-width="1.2"/><rect x="${w * .15}" y="${h * .25}" width="${w * .25}" height="${h * .25}" fill="${eve ? '#ffd86b' : '#9fd4f0'}" stroke="#2b2230" stroke-width=".8"/><rect x="${w * .6}" y="${h * .45}" width="${w * .25}" height="${h * .55}" fill="#8a5a2b" stroke="#2b2230" stroke-width=".8"/></g>`;
  return `<svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${eve ? '#ff9f6b' : '#6fbaf2'}"/><stop offset="1" stop-color="${eve ? '#ffe0b0' : '#d9f0ff'}"/></linearGradient>
    <linearGradient id="hsea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fa0d9"/><stop offset="1" stop-color="#1d5f9a"/></linearGradient>
    <radialGradient id="hsun"><stop offset="0" stop-color="#fff7c2"/><stop offset=".5" stop-color="#fff7c2" stop-opacity=".6"/><stop offset="1" stop-color="#fff7c2" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="360" height="120" fill="url(#hsky)"/>
  <circle cx="290" cy="${eve ? 60 : 26}" r="30" fill="url(#hsun)"/><circle cx="290" cy="${eve ? 60 : 26}" r="11" fill="#fff3b0"/>
  <g fill="#fff" opacity=".85"><ellipse cx="60" cy="22" rx="20" ry="6"/><ellipse cx="74" cy="18" rx="12" ry="7"/><ellipse cx="190" cy="14" rx="16" ry="5"/></g>
  <path d="M0 60q30-22 70-14t60 4 70-6 90 4 70-2V74H0z" fill="#7fb36a"/><path d="M0 66q40-10 90-4t100 0 90-4 80 2V76H0z" fill="#5f9a52"/>
  ${house(18, 44, 30, 24, '#f5efe2', '#e8443a')}${house(56, 48, 24, 20, '#ffd9a0', '#3d8bff')}${house(86, 46, 26, 22, '#e3f1ff', '#7b5cff')}
  <rect y="72" width="360" height="48" fill="url(#hsea)"/>
  <g class="waves" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none"><path d="M-20 80q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0"/><path d="M-10 94q10-4 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0"/></g>
  ${ch >= 1 ? `<g><rect x="118" y="68" width="112" height="7" rx="1" fill="#b07a45" stroke="#2b2230"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(k => `<path d="M${120 + k * 8} 68v7" stroke="#8a5a2b"/>`).join('')}${[124, 154, 184, 214].map(x => `<rect x="${x}" y="74" width="4" height="22" fill="#6b4429"/>`).join('')}</g>`
      : `<g><rect x="118" y="70" width="36" height="6" fill="#7a5038" transform="rotate(8 118 70)"/><rect x="172" y="72" width="26" height="5" fill="#7a5038" transform="rotate(-12 172 72)"/><rect x="124" y="74" width="4" height="18" fill="#5a3a22"/><rect x="184" y="76" width="4" height="14" fill="#5a3a22" transform="rotate(10 184 76)"/></g>`}
  ${ch >= 2 ? `<g class="boat"><path d="M160 78h60l-9 13h-42z" fill="#e8443a" stroke="#2b2230"/><path d="M160 78h60" stroke="#fff" stroke-width="2"/><rect x="188" y="44" width="3" height="34" fill="#5a3a22"/><path d="M191 46l24 28h-24z" fill="#fff" stroke="#2b2230"/><path d="M188 48l-18 24h18z" fill="#ffd23f" stroke="#2b2230"/></g>` : ''}
  ${ch >= 3 ? `<g transform="translate(300 18)">${eve ? '<path d="M16 6L-60 -10L-60 20z" fill="#fff3b0" opacity=".5"/>' : ''}<path d="M6 58L10 10h12l4 48z" fill="#fff" stroke="#2b2230"/><path d="M8 26h16M7 42h18" stroke="#e8443a" stroke-width="7"/><rect x="8" y="0" width="16" height="10" rx="2" fill="#ffd23f" stroke="#2b2230"/><path d="M6 0h20l-10-7z" fill="#e8443a" stroke="#2b2230"/></g>` : ''}
  ${ch >= 4 ? `<g transform="translate(240 50)"><rect width="40" height="20" fill="#f5efe2" stroke="#2b2230"/><path d="M-4 0h48l-5-12H1z" fill="#ff7ab2" stroke="#2b2230"/><path d="M5 0v-12M15 0v-12M25 0v-12M35 0v-12" stroke="#fff" stroke-width="4"/><rect x="6" y="8" width="28" height="5" fill="#8a5a2b"/><circle cx="12" cy="7" r="2.5" fill="#3d8bff"/><circle cx="20" cy="7" r="2.5" fill="#ffb020"/><circle cx="28" cy="7" r="2.5" fill="#3d8bff"/></g>` : ''}
  ${ch >= 5 ? `<path d="M10 34q85 22 170 0t170 0" stroke="#2b2230" fill="none"/>${Array.from({ length: 16 }, (_, i) => { const x = 18 + i * 21, y = 36 + Math.sin(i * .9) * 4; return `<path d="M${x} ${y}l5 9 5-9z" fill="${['#ff3d7f', '#ffd23f', '#3d8bff', '#2fbf71'][i % 4]}"/>`; }).join('')}` : ''}
  <g class="gulls" fill="none" stroke="#2b2230" stroke-width="1.4" stroke-linecap="round"><path d="M140 30q4-4 8 0q4-4 8 0"/><path d="M170 22q3-3 6 0q3-3 6 0"/></g>
</svg>`;
}
