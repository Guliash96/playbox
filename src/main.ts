import './styles/base.css';
import { $ } from './core/util';
import { closeModal } from './core/ui';
import { renderAdBar } from './core/ads';
import { initPlatform, setBackButton } from './core/platform';
import { store } from './core/store';
import { GAMES, type Game } from './games/registry';
import { renderHub } from './hub';
import { startAutoTranslate } from './core/i18n';
import { onboarding, leaderSheet } from './core/social';
import { extraTool } from './core/ui';
import { Score } from './core/score';
import { flush } from './core/net';
import { ICON } from './core/ui';
import { settingsMenu, menuExtra } from './core/settings';
import { bugReport, consentSheet } from './core/report';

let cur: Game | null = null, seq = 0;
const home = () => { location.hash = ''; };

async function route() {
  const id = location.hash.slice(1), info = GAMES.find(g => g.id === id && g.load);
  const my = ++seq;
  closeModal(); cur?.stop?.(); cur = null; if (Score.pts > 0) Score.commit(); Score.stop(); menuExtra.items = []; menuExtra.highlight = false;
  const game = $('#game');
  if (!info) {
    game.hidden = true; game.className = ''; $('#hub').hidden = false; renderHub(); setBackButton(false); return;
  }
  const mod = (await info.load!()).default;
  if (my !== seq) return;               // user navigated away while loading
  store.set('last', id);
  $('#hub').hidden = true; game.hidden = false; game.className = mod.theme || '';
  $('#gtitle').textContent = mod.title; $('#stage').innerHTML = ''; $('#stats').innerHTML = ''; $('#tools').innerHTML = '';
  extraTool.fn = () => leaderSheet(id, info.name);
  Score.begin(id); cur = mod; (window as any).__game = mod; mod.start($('#stage')); setBackButton(true);
}

initPlatform(home);
$('#back').onclick = home;
$('#bug').innerHTML = ICON.bug; $('#bug').onclick = () => bugReport();
$('#menu').innerHTML = ICON.menu; $('#menu').onclick = () => settingsMenu();
addEventListener('hashchange', route);
renderAdBar();
startAutoTranslate();
consentSheet(() => onboarding(() => route()));
addEventListener('online', () => flush()); flush();
document.addEventListener('nick', () => { if (!location.hash) renderHub(); });
document.addEventListener('gems', () => { const g = document.querySelector('#gems b'); if (g) g.textContent = String(store.get('gems', 0)); });
