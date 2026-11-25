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
export function harborScene(ch: number) {
  return `<svg viewBox="0 0 360 110" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ch >= 5 ? '#ffb36b' : '#8fd0ff'}"/><stop offset="1" stop-color="#e8f6ff"/></linearGradient></defs>
  <rect width="360" height="110" fill="url(#hsky)"/>
  <circle cx="300" cy="28" r="14" fill="#fff3b0"/>
  <path d="M0 62q40-14 80-4t90-6 100 2 90-4V70H0z" fill="#8fbf6a"/>
  <rect x="0" y="66" width="360" height="44" fill="#3d8bc9"/>
  <path d="M0 74q15-4 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0" stroke="#fff" stroke-opacity=".4" stroke-width="2" fill="none"/>
  <g transform="translate(30 36)"><rect width="30" height="28" fill="#f5efe2" stroke="#1b1b1f"/><path d="M-3 0l18-14 18 14z" fill="#e8443a" stroke="#1b1b1f"/><rect x="11" y="14" width="8" height="14" fill="#8a5a2b"/></g>
  <g transform="translate(66 42)"><rect width="24" height="22" fill="#ffd9a0" stroke="#1b1b1f"/><path d="M-3 0l15-11 15 11z" fill="#3d8bff" stroke="#1b1b1f"/><rect x="6" y="6" width="8" height="7" fill="#9fd4f0"/></g>
  ${ch >= 1 ? `<g><rect x="100" y="62" width="120" height="7" fill="#a8743f" stroke="#1b1b1f"/>${[106, 136, 166, 196, 214].map(x => `<rect x="${x}" y="68" width="4" height="22" fill="#7a5038"/>`).join('')}</g>`
      : `<g opacity=".8"><rect x="100" y="64" width="40" height="6" fill="#7a5038" transform="rotate(6 100 64)"/><rect x="160" y="66" width="30" height="5" fill="#7a5038" transform="rotate(-10 160 66)"/><rect x="106" y="68" width="4" height="20" fill="#5a3a22"/></g>`}
  ${ch >= 2 ? `<g class="boat"><path d="M150 70h56l-8 12h-40z" fill="#e8443a" stroke="#1b1b1f"/><rect x="176" y="40" width="3" height="30" fill="#5a3a22"/><path d="M179 42l22 22h-22z" fill="#fff" stroke="#1b1b1f"/></g>` : ''}
  ${ch >= 3 ? `<g transform="translate(300 20)"><path d="M6 46L10 6h12l4 40z" fill="#fff" stroke="#1b1b1f"/><path d="M8 22h16M7 34h18" stroke="#e8443a" stroke-width="6"/><rect x="9" y="0" width="14" height="8" fill="#ffd23f" stroke="#1b1b1f"/><path d="M16 4L-30 -6M16 4L-30 14" stroke="#fff3b0" stroke-width="3" opacity=".6"/></g>` : ''}
  ${ch >= 4 ? `<g transform="translate(236 44)"><rect width="34" height="18" fill="#f5efe2" stroke="#1b1b1f"/><path d="M-3 0h40l-4-10H1z" fill="#ff7ab2" stroke="#1b1b1f"/><path d="M4 0v-10M12 0v-10M20 0v-10M28 0v-10" stroke="#fff" stroke-width="3"/></g>` : ''}
  ${ch >= 5 ? `<path d="M20 30q80 20 160 0t160 0" stroke="#1b1b1f" fill="none"/>${[40, 70, 100, 130, 160, 190, 220, 250, 280, 310].map((x, i) => `<path d="M${x} ${33 + Math.sin(i) * 3}l5 8 5-8z" fill="${['#ff3d7f', '#ffd23f', '#3d8bff'][i % 3]}"/>`).join('')}` : ''}
</svg>`;
}
