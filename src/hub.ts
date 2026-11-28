import { $, $$ } from './core/util';
import { store } from './core/store';
import { toast } from './core/ui';
import { buyNoAds } from './core/ads';
import { GAMES } from './games/registry';
import { myNick } from './core/net';
import { profileSheet } from './core/social';
import { ICON } from './core/ui';
import { gems, shopSheet } from './core/wallet';
import { bugReport } from './core/report';
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

import { ensureCoinDefs } from './art/coin';

export function renderHub() {
  ensureCoinDefs();
  const ready = GAMES.filter(g => g.load), soon = GAMES.filter(g => !g.load);
  const last = GAMES.find(g => g.id === store.get('last', '') && g.load) || ready[0];
  const card = (g: typeof GAMES[number], cls = '') => `
    <button class="card ${cls} ${g.load ? '' : 'soon'}" data-id="${g.id}" style="--gc:${g.color}">
      <span class="art"><svg viewBox="0 0 160 110" preserveAspectRatio="xMidYMid slice">${g.art()}</svg></span>
      <span class="info">${cls ? '<span>' : ''}<b>${g.name}</b><small>${g.load ? g.meta!() : g.tag}</small>${cls ? `</span><span class="tag">Грати</span>` : ''}</span>
      ${cls ? '' : `<span class="tag">${g.load ? 'Грати' : 'Скоро'}</span>`}
    </button>`;
  $('#hub').innerHTML = `
    <div class="hero">
      <div class="rays" aria-hidden="true"></div>
      <div class="hero-top"><button id="prof" class="chip">${myNick() ? esc(myNick()) : 'Профіль'}</button><span class="hero-r"><button id="gems" class="chip gemchip">${ICON.gem}<b>${gems()}</b></button><button id="hbug" class="ibtn sq bugb" aria-label="Повідомити про помилку">${ICON.bug}</button></span></div>
      <h1 class="logo" aria-label="PlayBox"><span>Play</span><span>Box</span></h1>
      <p class="sub">Головоломки на хвилинку. Без реєстрації, прогрес зберігається.</p><button id="noads" class="btn ghost sm noadsb">Без реклами</button>
    </div>
    <div class="shelf">
      <h2 class="sec">Продовжити</h2>
      ${card(last, 'feat')}
      <h2 class="sec">Усі ігри</h2>
      <div class="grid">${ready.filter(g => g !== last).map(g => card(g)).join('')}</div>
      ${soon.length ? `<h2 class="sec">Скоро</h2><div class="grid">${soon.map(g => card(g)).join('')}</div>` : ''}
    </div>`;
  $('#noads').onclick = buyNoAds; $('#gems').onclick = () => shopSheet(); $('#hbug').onclick = () => bugReport(); $('#prof').onclick = () => profileSheet();
  $$('#hub .card').forEach(b => b.onclick = () => {
    const g = GAMES.find(x => x.id === b.dataset.id)!;
    g.load ? (location.hash = g.id) : toast(`«${g.name}» ще в роботі`);
  });
}
