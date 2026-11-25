// Ads + purchases adapter. Each platform gets its own provider; games only call Ads.*
//  telegram: Adsgram (window.Adsgram.init({blockId}).show()), purchases via Telegram Stars (tg.openInvoice)
//  web:      AdSense for Games (H5 Ads adBreak) or a portal SDK (CrazyGames / Poki); purchases via Stripe
//  android/ios (Capacitor): AdMob plugin; Google Play Billing / StoreKit
import { $ } from './util';
import { modal, closeModal, toast } from './ui';
import { store } from './store';
import { platform } from './platform';

interface Provider { interstitial(): Promise<void>; rewarded(): Promise<boolean>; }

// Demo provider: a 3-second fake ad. Replace per platform.
const demo: Provider = {
  interstitial: () => fakeAd('Міжрівнева реклама').then(() => { }),
  rewarded: () => fakeAd('Реклама за нагороду'),
};
function fakeAd(label: string) {
  return new Promise<boolean>(res => {
    const who = platform() === 'telegram' ? 'Adsgram' : 'AdSense for Games або SDK порталу';
    modal(`<h2>${label}</h2><p class="muted">Тут буде ${who}.</p><div class="count" id="cnt">3</div>`);
    let n = 3;
    const t = setInterval(() => { n--; const c = $('#cnt'); if (c) c.textContent = String(n); if (n <= 0) { clearInterval(t); closeModal(); res(true); } }, 1000);
  });
}

const provider: Provider = demo;

export const Ads = {
  noAds: () => store.get('noads', false),
  interstitial(done: () => void) { this.noAds() ? done() : provider.interstitial().then(done); },
  rewarded(done: () => void) { provider.rewarded().then(ok => ok && done()); },
};

const PRICES: Record<string, string> = { telegram: '149 Stars', web: '2,99 €', android: '2,99 €', ios: '2,99 €' };

export function buyNoAds() {
  if (Ads.noAds()) return toast('Реклама вже вимкнена');
  const p = platform();
  modal(`<h2>Без реклами</h2><p>Назавжди прибирає банер і міжрівневу рекламу. Реклама за бонуси лишається, тільки за бажанням.</p><p class="muted">Демо: гроші не списуються. Платформа: ${p}.</p>`,
    [[`Купити за ${PRICES[p]}`, () => { store.set('noads', true); renderAdBar(); toast('Рекламу вимкнено (демо)'); }], ['Скасувати']]);
}

export function renderAdBar() {
  const off = Ads.noAds(); document.documentElement.classList.toggle('noads', off);
  const a = $('#adbar'); a.hidden = off;
  a.innerHTML = off ? '' : `<span>Тут буде банер 320×50</span><button class="btn ghost sm" id="rm">Прибрати</button>`;
  if (!off) $('#rm').onclick = buyNoAds;
}
