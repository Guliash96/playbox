// Red-triangle bug report: screenshot of the screen + short description + device info → Supabase.
// Also: first-launch privacy / cookies consent.
import { $ } from './util';
import { modal, closeModal, toast, dismissable } from './ui';
import { store } from './store';
import { t, lang } from './i18n';
import { platform } from './platform';
import { reportBug, myNick } from './net';
import { pause, resume, Paused } from './pause';

// keep the last errors so reports carry them
const errs: string[] = [];
addEventListener('error', e => { errs.push(String(e.message).slice(0, 200)); errs.splice(0, errs.length - 8); });
addEventListener('unhandledrejection', e => { errs.push('promise: ' + String((e as any).reason).slice(0, 200)); errs.splice(0, errs.length - 8); });

async function screenshot(): Promise<string | null> {
  try {
    const { domToJpeg } = await import('modern-screenshot');
    const app = $('#app'), scale = Math.min(1, 720 / Math.max(1, app.clientWidth));
    return await domToJpeg(app, { scale, quality: .6, backgroundColor: '#1b1730', timeout: 4000 });
  } catch (e) { console.warn('shot', e); return null; }
}

export async function bugReport() {
  const was = Paused.on; pause(); const done = () => { closeModal(); if (!was) resume(); };
  const shot = await screenshot();          // before the sheet covers the screen
  modal(`<h2>${t('Повідомити про помилку')}</h2>
    ${shot ? `<img class="bugshot" src="${shot}" alt="">` : ''}
    <label class="chk"><input type="checkbox" id="bshot" ${shot ? 'checked' : 'disabled'}> ${t('Додати скріншот')}</label>
    <textarea id="btxt" class="inp" rows="4" maxlength="2000" placeholder="${t('Що сталося? Що ти робив перед цим?')}"></textarea>
    <div class="btns"><button class="btn" id="bsend">${t('Надіслати')}</button><button class="btn ghost" id="bx">${t('Скасувати')}</button></div>`);
  $('#bx').onclick = done; dismissable(() => { if (!was) resume(); });
  $('#bsend').onclick = async () => {
    const txt = ($('#btxt') as HTMLTextAreaElement).value.trim(), b = $('#bsend') as HTMLButtonElement;
    if (!txt) { ($('#btxt') as HTMLElement).focus(); return; }
    b.disabled = true;
    const meta = { game: location.hash.slice(1) || 'hub', lang, platform: platform(), ua: navigator.userAgent, w: innerWidth, h: innerHeight, nick: myNick(), errors: errs.slice(), progress: Object.fromEntries(Object.keys(localStorage).filter(k => /_lvl$/.test(k)).map(k => [k.replace('pb2_', ''), localStorage.getItem(k)])) };
    const ok = await reportBug(txt, ($('#bshot') as HTMLInputElement).checked ? shot : null, meta);
    b.disabled = false;
    if (ok) { done(); toast(t('Дякуємо! Звіт надіслано')); } else toast(t('Немає зв\'язку з сервером'));
  };
}

// ---------- consent ----------
export const consent = () => store.get<string>('consent', '');
export function consentSheet(then: () => void) {
  if (consent()) return then();
  modal(`<h2>${t('Конфіденційність')}</h2>
    <p class="muted">${t('Ми зберігаємо прогрес і налаштування на твоєму пристрої та анонімний акаунт для рейтингу. Рекламні партнери можуть використовувати cookies, щоб показувати рекламу.')}</p>
    <p class="muted"><a href="./privacy.html" target="_blank" rel="noopener">${t('Політика конфіденційності')}</a></p>
    <div class="btns"><button class="btn" id="c_all">${t('Прийняти все')}</button><button class="btn ghost" id="c_min">${t('Лише необхідні')}</button></div>`);
  const pick = (v: string) => { store.set('consent', v); closeModal(); then(); };
  $('#c_all').onclick = () => pick('all'); $('#c_min').onclick = () => pick('necessary');
}
