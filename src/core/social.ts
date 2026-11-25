// First-launch onboarding (language → nickname), profile sheet and leaderboard sheet.
import { $, $$ } from './util';
import { modal, closeModal, toast } from './ui';
import { LANGS, setLang, t, hasLang } from './i18n';
import { online, nickCheck, nickFree, setNick, myNick, top, profile, localTotal } from './net';
import { store } from './store';
import { TG } from './platform';
import { isMuted, setMuted } from './sfx';

const ERR: Record<string, string> = {
  format: 'Потрібно 6–16 символів без пробілів і спецзнаків', digits: 'Нікнейм не може бути лише з цифр',
  bad: 'Цей нікнейм не підходить', taken: 'Цей нікнейм уже зайнятий', pay: 'Наступна зміна нікнейму платна', net: 'Немає зв\'язку з сервером', auth: 'Немає зв\'язку з сервером',
};
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function languageSheet(then?: () => void) {
  modal(`<h2>${t('Обери мову')}</h2><div class="langs">${LANGS.map(([c, n]) => `<button class="btn ghost" data-l="${c}">${n}</button>`).join('')}</div>`);
  $$('#modal [data-l]').forEach(b => b.onclick = () => { setLang(b.dataset.l!); closeModal(); then?.(); });
}

export function nickSheet(then?: () => void) {
  const tg = TG()?.initDataUnsafe?.user, suggestion = myNick() || (tg?.username && tg.username.length >= 6 ? tg.username.slice(0, 16) : '');
  modal(`<h2>${t('Придумай нікнейм')}</h2><p class="muted">${t('Його побачать інші гравці в рейтингу.')}</p>
    <input id="nick" class="inp" maxlength="16" autocomplete="off" spellcheck="false" value="${esc(suggestion)}" placeholder="${t('Гравець')}">
    <p class="nickmsg muted" id="nmsg">${t('6–16 символів: літери, цифри, _ . - (не лише цифри). Одна зміна безкоштовна.')}</p>
    <div class="btns"><button class="btn" id="nsave">${t('Зберегти')}</button><button class="btn ghost" id="nlater">${t('Пізніше')}</button></div>`);
  const inp = $('#nick') as HTMLInputElement, msg = $('#nmsg'); let tm: any;
  const show = (s: string, ok = false) => { msg.textContent = t(s); msg.className = 'nickmsg ' + (ok ? 'ok' : 'bad'); };
  inp.oninput = () => {
    clearTimeout(tm); const n = inp.value.trim(), c = nickCheck(n);
    if (c !== 'ok') return show(ERR[c]);
    if (!online) return show('Нікнейм вільний', true);
    show('Перевіряю…', true);
    tm = setTimeout(async () => { const f = await nickFree(n); if (inp.value.trim() !== n) return; f == null ? show(ERR.net) : f ? show('Нікнейм вільний', true) : show(ERR.taken); }, 400);
  };
  inp.focus();
  $('#nlater').onclick = () => { store.set('nickAsked', true); closeModal(); then?.(); };
  $('#nsave').onclick = async () => {
    const b = $('#nsave') as HTMLButtonElement; b.disabled = true;
    const r = await setNick(inp.value.trim()); b.disabled = false;
    if (r === 'ok') { store.set('nickAsked', true); closeModal(); toast(t('Нікнейм збережено')); document.dispatchEvent(new Event('nick')); then?.(); }
    else show(ERR[r]);
  };
}

export function onboarding(done: () => void) {
  if (!hasLang()) return languageSheet(() => onboarding(done));
  if (!myNick() && !store.get('nickAsked', false)) return nickSheet(done);
  done();
}

export async function profileSheet() {
  modal(`<h2>${t('Профіль')}</h2><p><b>${esc(myNick() || t('Гравець'))}</b></p><p class="muted" id="pinfo"></p>
    <div class="btns"><button class="btn" id="pnick">${t('Змінити нікнейм')}</button><button class="btn ghost" id="plang">${t('Мова')}</button><button class="btn ghost" id="psnd">${t(isMuted() ? 'Звук: вимкнено' : 'Звук: увімкнено')}</button></div>`);
  $('#psnd').onclick = () => { setMuted(!isMuted()); $('#psnd').textContent = t(isMuted() ? 'Звук: вимкнено' : 'Звук: увімкнено'); };
  $('#pnick').onclick = () => nickSheet(); $('#plang').onclick = () => languageSheet(() => location.reload());
  const p = await profile(); if (p && p.renames >= 1 && p.rename_credits < 1) { const i = $('#pinfo'); if (i) i.textContent = t('Наступна зміна нікнейму платна'); }
}

export async function leaderSheet(game: string, name: string) {
  modal(`<h2>${t('Рейтинг')}: ${t(name)}</h2><div class="lb" id="lb"><p class="muted">${t('Завантаження…')}</p></div>`, [['OK']]);
  const box = $('#lb');
  if (!online) { box.innerHTML = `<p class="muted">${t('Рейтинг запрацює після підключення сервера.')}</p><p>${t('Очки')}: <b>${localTotal(game).toLocaleString()}</b></p>`; return; }
  if (!myNick()) { box.innerHTML = `<p class="muted">${t('Щоб потрапити в рейтинг, придумай нікнейм.')}</p><button class="btn" id="lbnick">${t('Придумай нікнейм')}</button>`; $('#lbnick').onclick = () => nickSheet(); return; }
  const r = await top(game); if (!box.isConnected) return;
  if (!r) { box.innerHTML = `<p class="muted">${t('Немає зв\'язку з сервером')}</p>`; return; }
  box.innerHTML = (r.rows.length ? `<ol>${r.rows.map((x, i) => `<li class="${x.me ? 'me' : ''}${i < 3 ? ' p' + (i + 1) : ''}"><span>${i + 1}</span><b>${esc(x.nick)}</b><em>${x.points.toLocaleString()}</em></li>`).join('')}</ol>` : `<p class="muted">${t('Поки порожньо. Стань першим!')}</p>`)
    + (r.rank ? `<p class="myrank">${t('Твоє місце: #{0}', r.rank)}</p>` : '');
}
