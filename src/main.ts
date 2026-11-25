import './styles/base.css';
import { $ } from './core/util';
import { closeModal } from './core/ui';
import { renderAdBar } from './core/ads';
import { initPlatform, setBackButton } from './core/platform';
import { store } from './core/store';
import { GAMES, type Game } from './games/registry';
import { renderHub } from './hub';

let cur: Game | null = null, seq = 0;
const home = () => { location.hash = ''; };

async function route() {
  const id = location.hash.slice(1), info = GAMES.find(g => g.id === id && g.load);
  const my = ++seq;
  closeModal(); cur?.stop?.(); cur = null;
  const game = $('#game');
  if (!info) {
    game.hidden = true; game.className = ''; $('#hub').hidden = false; renderHub(); setBackButton(false); return;
  }
  const mod = (await info.load!()).default;
  if (my !== seq) return;               // user navigated away while loading
  store.set('last', id);
  $('#hub').hidden = true; game.hidden = false; game.className = mod.theme || '';
  $('#gtitle').textContent = mod.title; $('#stage').innerHTML = ''; $('#stats').innerHTML = ''; $('#tools').innerHTML = '';
  cur = mod; mod.start($('#stage')); setBackButton(true);
}

initPlatform(home);
$('#back').onclick = home;
addEventListener('hashchange', route);
renderAdBar();
route();
