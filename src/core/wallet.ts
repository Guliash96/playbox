// Crystals 💎 (our soft currency) + boosters inventory + achievements.
// Crystals come from achievements, rewarded ads and (later) purchases: Telegram Stars / web checkout.
// Boosters (hints, shuffles, undos…) are kept between levels; when one runs out the player can
// watch an ad for +1 or buy a few for crystals.
// NOTE: stored on the device for now; moving the balance to the server comes with real payments.
import { $ } from './util';
import { modal, closeModal, toast, ICON } from './ui';
import { store } from './store';
import { Ads } from './ads';
import { t } from './i18n';
import { platform } from './platform';
import { sfx } from './sfx';

export const gems = () => store.get('gems', 0);
export function addGems(n: number, why = '') {
  store.set('gems', gems() + n); document.dispatchEvent(new Event('gems'));
  if (why) toast(`${t(why)} +${n} 💎`); sfx('coin');
}
export function spendGems(n: number) { if (gems() < n) return false; store.set('gems', gems() - n); document.dispatchEvent(new Event('gems')); return true; }

// ---------- boosters ----------
export function inv(id: string, start = 3) { const all = store.get<Record<string, number>>('inv', {}); return all[id] ?? start; }
export function setInv(id: string, n: number) { const all = store.get<Record<string, number>>('inv', {}); all[id] = Math.max(0, n); store.set('inv', all); }
/** use one booster; if none left, offer ad (+1) or crystals (pack), then call back */
export function useBooster(id: string, name: string, price: number, start: number, then: () => void, onChange?: () => void) {
  const n = inv(id, start);
  if (n > 0) { setInv(id, n - 1); onChange?.(); then(); return; }
  modal(`<h2>${t(name)}</h2><p class="muted">${t('Закінчилось. Отримай ще:')}</p>
    <div class="btns"><button class="btn" id="b_ad">${ICON.ad}<span>${t('Реклама: +1')}</span></button>
    <button class="btn ghost" id="b_gem">${ICON.gem}<span>${t('3 шт. за {0} 💎', price)}</span></button><button class="btn ghost" id="b_no">${t('Скасувати')}</button></div>
    <p class="muted" style="text-align:center">${t('У тебе {0} 💎', gems())}</p>`);
  $('#b_no').onclick = closeModal;
  $('#b_ad').onclick = () => { closeModal(); Ads.rewarded(() => { onChange?.(); then(); }); };
  $('#b_gem').onclick = () => {
    if (!spendGems(price)) { closeModal(); return shopSheet(); }
    closeModal(); setInv(id, 2); onChange?.(); then();
  };
}

// ---------- achievements ----------
const MILESTONES: [number, number][] = [[3, 5], [5, 10], [10, 15], [20, 25], [35, 35], [50, 50], [75, 75], [100, 100]];
/** called when a level is completed */
export function levelAchievement(game: string, lvl: number) {
  const got = store.get<Record<string, number>>('ach', {}), key = game, prev = got[key] || 0;
  const m = MILESTONES.find(([l]) => l === lvl && l > prev); if (!m) return;
  got[key] = m[0]; store.set('ach', got);
  setTimeout(() => addGems(m[1], `Досягнення: рівень ${m[0]}`), 900);
}

// ---------- shop ----------
const PACKS: [number, string, string][] = [[100, '99 Stars', '0,99 €'], [550, '449 Stars', '4,49 €'], [1200, '899 Stars', '8,99 €']];
export function shopSheet() {
  const tg = platform() === 'telegram', left = 3 - adsToday();
  modal(`<h2>${ICON.gem} ${t('Кристали')}: ${gems()}</h2><p class="muted">${t('Кристали дають підказки, перемішування та інші бонуси в іграх.')}</p>
    <div class="packs">${PACKS.map(([n, s, e], i) => `<button class="pack" data-p="${i}">${ICON.gem}<b>${n}</b><span>${tg ? s : e}</span></button>`).join('')}</div>
    <div class="btns"><button class="btn" id="g_ad" ${left > 0 ? '' : 'disabled'}>${ICON.ad}<span>${t('Реклама: +10 💎 ({0} сьогодні)', Math.max(0, left))}</span></button><button class="btn ghost" id="g_x">${t('Закрити')}</button></div>
    <p class="muted" style="font-size:12px;text-align:center">${t('Демо: оплата ще не підключена, кристали нараховуються безкоштовно.')}</p>`);
  $('#g_x').onclick = closeModal;
  $('#g_ad').onclick = () => { closeModal(); Ads.rewarded(() => { store.set('adg', { d: today(), n: adsToday() + 1 }); addGems(10, 'Реклама'); }); };
  document.querySelectorAll<HTMLElement>('#modal [data-p]').forEach(b => b.onclick = () => { closeModal(); addGems(PACKS[+b.dataset.p!][0], 'Покупка (демо)'); });
}
const today = () => new Date().toISOString().slice(0, 10);
function adsToday() { const a = store.get<{ d: string; n: number }>('adg', { d: '', n: 0 }); return a.d === today() ? a.n : 0; }

// ---------- ad-or-crystals bonuses ----------
/** a bonus you can take for an ad; after that the ad option sleeps `coolMin` minutes and the bonus costs crystals */
export function adOrGems(key: string, name: string, desc: string, price: number, coolMin: number, grant: () => void) {
  const k = 'cool_' + key, now = Date.now(), until = store.get(k, 0), byAd = now >= until;
  const mins = Math.ceil((until - now) / 60000);
  modal(`<h2>${t(name)}</h2><p class="muted">${t(desc)}</p>
    <div class="btns">${byAd ? `<button class="btn" id="ag_ad">${ICON.ad}<span>${t('Дивитись рекламу')}</span></button>` : `<p class="muted" style="text-align:center">${t('Реклама знову через {0} хв', mins)}</p>`}
    <button class="btn ${byAd ? 'ghost' : ''}" id="ag_gem">${ICON.gem}<span>${t('За {0} 💎', price)}</span></button><button class="btn ghost" id="ag_no">${t('Скасувати')}</button></div>
    <p class="muted" style="text-align:center">${t('У тебе {0} 💎', gems())}</p>`);
  $('#ag_no').onclick = closeModal;
  const ad = document.getElementById('ag_ad'); if (ad) ad.onclick = () => { closeModal(); Ads.rewarded(() => { store.set(k, Date.now() + coolMin * 60000); grant(); }); };
  $('#ag_gem').onclick = () => { if (!spendGems(price)) { closeModal(); return shopSheet(); } closeModal(); grant(); };
}
