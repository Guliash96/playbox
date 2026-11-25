import { store } from '../core/store';
import { carSVG } from '../art/car';
import { busSVG, crowd } from '../art/bus';
import { sittingCat, catHead } from '../art/cat';
import { mjFace } from '../art/mahjong';
import { coinStack } from '../art/coin';

export interface Game {
  title: string;
  theme?: string;               // css class added to #game for the background
  start(el: HTMLElement): void;
  stop?(): void;
}
export interface GameInfo {
  id: string; name: string; tag: string; color: string;
  load?: () => Promise<{ default: Game }>;
  meta?: () => string;
  art: () => string;            // inner SVG for a 160x110 card illustration
}

const lvl = (k: string) => () => 'Рівень ' + store.get(k, 1);
const embed = (svg: string, x: number, y: number, w: number, h: number, extra = '') =>
  svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" ${extra} `);

export const GAMES: GameInfo[] = [
  { id: 'parking', name: 'Парковка', tag: 'Виведи всі машини', color: '#2f9bff', load: () => import('./parking'), meta: lvl('pk_lvl'),
    art: () => `<rect width="160" height="110" fill="#4b5563"/><path d="M0 55h160M53 0v110M106 0v110" stroke="#fff" stroke-opacity=".35" stroke-width="2" stroke-dasharray="8 6"/>${embed(carSVG(2, '#ff3d7f'), 8, 10, 90, 45)}${embed(carSVG(1, '#ffd23f'), 112, 8, 45, 45)}${embed(carSVG(3, '#2fbf71'), 20, 60, 130, 43)}` },
  { id: 'blocks', name: 'Блоки', tag: 'Заповнюй ряди', color: '#7b5cff', load: () => import('./blocks'), meta: () => 'Рекорд ' + store.get('bb_best', 0),
    art: () => `<rect width="160" height="110" fill="#2b2350"/>${[[40, 20, '#ff3d7f'], [66, 20, '#ff3d7f'], [66, 46, '#ff3d7f'], [92, 46, '#2f9bff'], [40, 72, '#ffb020'], [66, 72, '#ffb020'], [92, 72, '#ffb020']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="24" height="24" rx="5" fill="${c}"/><rect x="${+x + 3}" y="${+y + 3}" width="18" height="7" rx="3" fill="#fff" opacity=".4"/><rect x="${x}" y="${+y + 18}" width="24" height="6" rx="3" fill="#000" opacity=".2"/>`).join('')}` },
  { id: 'mahjong', name: 'Маджонг', tag: 'Знайди пари', color: '#1f7a4d', load: () => import('./mahjong'), meta: lvl('mj_lvl'),
    art: () => `<rect width="160" height="110" fill="#1f7a4d"/>${[[34, 26, 2], [64, 18, 17], [94, 26, 10]].map(([x, y, f]) => `<rect x="${x + 5}" y="${y + 6}" width="38" height="50" rx="6" fill="#1f5e3c"/><rect x="${x + 2}" y="${y + 3}" width="38" height="50" rx="6" fill="#e9dfc6"/><rect x="${x}" y="${y}" width="38" height="50" rx="6" fill="#fffaf0"/>${embed(mjFace(f), x + 2, y + 2, 34, 46)}`).join('')}` },
  { id: 'coins', name: 'Монети', tag: 'Сортуй і зливай', color: '#b5651d', load: () => import('./coins'), meta: lvl('co_lvl'),
    art: () => `<rect width="160" height="110" fill="#5a3a22"/><rect x="10" y="18" width="140" height="84" rx="10" fill="#3b2616"/>${[[22, [1, 1, 2, 2, 2]], [62, [3, 3, 3, 3, 3, 3, 3]], [102, [2, 2, 1, 4]]].map(([x, c]: any) => `<svg x="${x}" y="22" width="36" height="78" viewBox="0 0 60 130">${coinStack(c, 130)}</svg>`).join('')}` },
  { id: 'catdoku', name: 'Котоку', tag: 'Один кіт на зону', color: '#e0679b', load: () => import('./catdoku'), meta: lvl('cd_lvl'),
    art: () => `<rect width="160" height="110" fill="#f7d6e4"/><g transform="translate(35 10)"><rect width="90" height="90" rx="8" fill="#fff"/>${[[0, 0, '#ffb3c7'], [45, 0, '#a8d8ff'], [0, 45, '#ffd08a'], [45, 45, '#c9b8ff']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="45" height="45" fill="${c}"/>`).join('')}<path d="M45 0v90M0 45h90" stroke="#3a3340" stroke-width="3"/>${embed(sittingCat(), 4, 4, 36, 36)}${embed(sittingCat('#e08a3c'), 50, 50, 36, 36)}</g>` },
  { id: 'bus', name: 'Автобуси', tag: 'Розсади пасажирів', color: '#ff8a1f', load: () => import('./bus'), meta: lvl('bj_lvl'),
    art: () => `<rect width="160" height="110" fill="#8a8f98"/><rect y="0" width="160" height="44" fill="#3d4148"/><path d="M0 22h160" stroke="#ffd23f" stroke-width="2" stroke-dasharray="10 8"/><rect y="44" width="160" height="6" fill="#d6d0c4"/>${embed(busSVG('#ff8a1f', 3, ['#2f9bff', null, null]), 20, 2, 140, 60)}${embed(crowd('#2f9bff'), 20, 58, 40, 40)}${embed(crowd('#ff3d7f'), 62, 58, 40, 40)}${embed(crowd('#ff8a1f'), 104, 58, 40, 40)}` },
  { id: 'findcat', name: 'Знайди кота', tag: 'Пошук на малюнку', color: '#c9772f', load: () => import('./findcat'), meta: lvl('fc_lvl'),
    art: () => `<rect width="160" height="110" fill="#f1e2c4"/><rect x="0" y="70" width="160" height="10" fill="#8b5a2b"/>${catHead(62, 56, 16, '#e08a3c')}<rect x="40" y="58" width="44" height="12" rx="2" fill="#c97b4a"/><rect x="92" y="30" width="10" height="40" fill="#4a6fa5"/><rect x="103" y="36" width="9" height="34" fill="#a5463a"/><rect x="113" y="26" width="11" height="44" fill="#d9a441"/><circle cx="20" cy="44" r="14" fill="#5c9a4b"/><rect x="10" y="50" width="20" height="20" fill="#b5651d"/>` },
  { id: 'cube', name: 'Куб-стрілки', tag: 'Розбери 3D-куб', color: '#18b5c4',
    art: () => `<rect width="160" height="110" fill="#18b5c4"/><path d="M80 16l36 19v40L80 94 44 75V35z" fill="#fff"/><path d="M80 54l36-19v40L80 94z" fill="#bfeef3"/><path d="M80 54L44 35v40l36 19z" fill="#e8fbfd"/>` },
  { id: 'snake', name: 'Пікс-змійки', tag: 'Колір до кольору', color: '#ff3d7f',
    art: () => `<rect width="160" height="110" fill="#ff3d7f"/><path d="M30 80h40V40h40v40h20" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>` },
  { id: 'runner', name: 'Сани', tag: 'Нескінченний спуск', color: '#6a8dff',
    art: () => `<rect width="160" height="110" fill="#6a8dff"/><path d="M0 85Q70 45 160 70V110H0z" fill="#fff"/><path d="M60 62h40l8-8" fill="none" stroke="#1b1b1f" stroke-width="5" stroke-linecap="round"/>` },
  { id: 'merge', name: 'Гавань', tag: 'Мердж з історією', color: '#e8443a',
    art: () => `<rect width="160" height="110" fill="#e8443a"/><circle cx="62" cy="55" r="22" fill="#fff"/><circle cx="100" cy="55" r="22" fill="#fff" opacity=".7"/>` },
];
