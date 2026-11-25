// Item art for the merge game. Each returns inner SVG for a 0 0 40 40 box.
const fish = (col: string, len: number, stripes = 0, crown = false) => {
  const L = len, x0 = 20 - L / 2;
  return `<ellipse cx="20" cy="31" rx="${L / 2}" ry="3" fill="#000" opacity=".12"/>
  <path d="M${x0 + L - 2} 20l${L * .32} -${L * .22}v${L * .44}z" fill="${col}" stroke="#1b1b1f" stroke-width="1.2" stroke-linejoin="round"/>
  <ellipse cx="${x0 + L * .45}" cy="20" rx="${L * .5}" ry="${L * .3}" fill="${col}" stroke="#1b1b1f" stroke-width="1.2"/>
  ${Array.from({ length: stripes }, (_, k) => `<path d="M${x0 + L * (.35 + k * .15)} ${20 - L * .26}q-2 ${L * .26} 0 ${L * .52}" stroke="#1b1b1f" stroke-opacity=".45" stroke-width="1.6" fill="none"/>`).join('')}
  <ellipse cx="${x0 + L * .4}" cy="${20 - L * .12}" rx="${L * .25}" ry="${L * .08}" fill="#fff" opacity=".35"/>
  <circle cx="${x0 + L * .18}" cy="${20 - L * .06}" r="${Math.max(1.6, L * .06)}" fill="#1b1b1f"/>
  ${crown ? `<path d="M${x0 + L * .3} ${20 - L * .3}l2 -6 3 4 3 -5 3 5 3 -4 2 6z" fill="#ffd23f" stroke="#1b1b1f" stroke-width="1"/>` : ''}`;
};
export const CHAINS: { id: string; name: string; tiers: string[]; art: string[]; unlock: number }[] = [
  {
    id: 'fish', name: 'Риба', unlock: 0, tiers: ['Креветка', 'Рибка', 'Окунь', 'Скумбрія', 'Тунець', 'Золота риба'],
    art: [
      `<path d="M12 26c0-9 8-14 16-11c-6 0-10 4-9 9c1 4-4 6-7 2z" fill="#ff9aa2" stroke="#1b1b1f" stroke-width="1.2"/><path d="M14 22l-4-3M16 25l-4 0M27 15l5-5M26 14l1-6" stroke="#1b1b1f" stroke-width="1"/><circle cx="25" cy="17" r="1.3" fill="#1b1b1f"/>`,
      fish('#7fd1ff', 18), fish('#ffb020', 22, 2), fish('#3d8bff', 26, 3), fish('#5b6b8c', 30, 0), fish('#ffd23f', 30, 0, true),
    ],
  },
  {
    id: 'shell', name: 'Мушлі', unlock: 0, tiers: ['Камінчик', 'Мушля', 'Рапан', 'Перлина', 'Скринька перлин'],
    art: [
      `<ellipse cx="16" cy="25" rx="7" ry="5" fill="#9aa3ad" stroke="#1b1b1f" stroke-width="1.2"/><ellipse cx="25" cy="27" rx="5" ry="3.5" fill="#c3c9d0" stroke="#1b1b1f" stroke-width="1.2"/>`,
      `<path d="M20 30L8 16a14 14 0 0 1 24 0z" fill="#ffb3c7" stroke="#1b1b1f" stroke-width="1.2"/><path d="M20 30L12 13M20 30L17 10M20 30L23 10M20 30L28 13" stroke="#1b1b1f" stroke-opacity=".5"/><rect x="17" y="29" width="6" height="4" rx="1" fill="#ff8fab" stroke="#1b1b1f"/>`,
      `<path d="M10 28c-2-10 6-18 16-16c6 2 6 10 0 12c-5 2-8-2-6-5c2-2 5-1 4 1" fill="#ffb877" stroke="#1b1b1f" stroke-width="1.3"/><path d="M10 28l-3 4M26 24l6 6" stroke="#1b1b1f" stroke-width="1.3"/>`,
      `<path d="M6 24a14 8 0 0 0 28 0z" fill="#b9a5ff" stroke="#1b1b1f" stroke-width="1.2"/><path d="M6 24a14 10 0 0 1 28 0" fill="#d6c9ff" stroke="#1b1b1f" stroke-width="1.2" transform="rotate(-18 6 24)"/><circle cx="20" cy="22" r="5" fill="#fff" stroke="#1b1b1f"/><circle cx="18.5" cy="20.5" r="1.5" fill="#e6f3ff"/>`,
      `<rect x="7" y="18" width="26" height="14" rx="2" fill="#a8743f" stroke="#1b1b1f" stroke-width="1.2"/><path d="M7 18c0-8 26-8 26 0" fill="#c48a4a" stroke="#1b1b1f" stroke-width="1.2" transform="rotate(-20 7 18)"/><circle cx="15" cy="17" r="3" fill="#fff" stroke="#1b1b1f"/><circle cx="21" cy="15" r="3" fill="#fff" stroke="#1b1b1f"/><circle cx="27" cy="17" r="3" fill="#fff" stroke="#1b1b1f"/><rect x="18" y="22" width="4" height="5" fill="#ffd23f" stroke="#1b1b1f"/>`,
    ],
  },
  {
    id: 'gear', name: 'Снасті', unlock: 2, tiers: ['Мотузка', 'Вузол', 'Сітка', 'Вудка', 'Якір'],
    art: [
      `<ellipse cx="20" cy="24" rx="11" ry="7" fill="none" stroke="#c9a27a" stroke-width="4"/><ellipse cx="20" cy="24" rx="6" ry="3.5" fill="none" stroke="#a8743f" stroke-width="3"/>`,
      `<path d="M8 22c6-8 10 8 16 0s8 4 8 4" fill="none" stroke="#c9a27a" stroke-width="5" stroke-linecap="round"/><circle cx="20" cy="21" r="4" fill="#a8743f" stroke="#1b1b1f"/>`,
      `<rect x="9" y="10" width="22" height="22" rx="3" fill="none" stroke="#3a6f8f" stroke-width="1.5"/><path d="M9 17h22M9 24h22M16 10v22M23 10v22" stroke="#3a6f8f" stroke-width="1.5"/><circle cx="9" cy="10" r="2.5" fill="#ff8a1f"/><circle cx="31" cy="32" r="2.5" fill="#ff8a1f"/>`,
      `<path d="M8 33L30 8" stroke="#8a5a2b" stroke-width="3" stroke-linecap="round"/><path d="M30 8q4 10 1 18" fill="none" stroke="#555" stroke-width="1"/><circle cx="31" cy="27" r="2.5" fill="#e8443a" stroke="#1b1b1f"/><circle cx="12" cy="29" r="3.5" fill="#666" stroke="#1b1b1f"/>`,
      `<path d="M20 9v22M13 15h14M9 24q2 9 11 9t11-9" fill="none" stroke="#5b6b8c" stroke-width="3.5" stroke-linecap="round"/><circle cx="20" cy="8" r="3" fill="none" stroke="#5b6b8c" stroke-width="2.5"/><path d="M7 25l3-3 2 4zM33 25l-3-3-2 4z" fill="#5b6b8c"/>`,
    ],
  },
];
export const CRATE = `<rect x="5" y="9" width="30" height="24" rx="3" fill="#b07a45" stroke="#1b1b1f" stroke-width="1.5"/><path d="M5 17h30M5 25h30" stroke="#8a5a2b" stroke-width="2"/><path d="M8 9l24 24M32 9L8 33" stroke="#8a5a2b" stroke-width="1.5" opacity=".5"/><rect x="12" y="4" width="16" height="8" rx="2" fill="#3d8bff" stroke="#1b1b1f"/><path d="M15 8h7l3-2v4l-3-2" fill="#fff"/>`;

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
