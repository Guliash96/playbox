// Online profile + leaderboards (Supabase). Works offline too: nickname is kept locally and
// points are queued until the server is reachable.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as CFG from '../config';
import { TG } from './platform';
const { SUPABASE_URL, SUPABASE_ANON_KEY } = CFG;
export const TELEGRAM_BOT: string = (CFG as any).TELEGRAM_BOT || 'playboxoff_bot';
import { store } from './store';

export const online = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
let sb: SupabaseClient | null = null, ready: Promise<boolean> | null = null;

function client() { return sb ||= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: 'pb-auth' } }); }
async function ensure(): Promise<boolean> {
  if (!online) return false;
  return ready ||= (async () => {
    try {
      const c = client(), { data } = await c.auth.getSession();
      // inside Telegram: use (or switch to) the player's Telegram account, the same on every device
      const init = TG()?.initData;
      if (init && (!data.session || data.session.user.is_anonymous)) { if (await tgAuth({ initData: init }, data.session?.access_token)) return true; }
      if (!data.session) { const r = await c.auth.signInAnonymously(); if (r.error) throw r.error; }
      return true;
    } catch (e) { console.warn('supabase', e); ready = null; return false; }
  })();
}

async function tgAuth(payload: Record<string, unknown>, anonToken?: string) {
  try {
    const { data, error } = await client().functions.invoke('tg-auth', { body: { ...payload, anonToken } });
    if (error || !data?.access_token) { console.warn('tg-auth', error || data); return false; }
    await client().auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    const { data: p } = await client().rpc('my_profile'); if (p?.[0]?.nick) store.set('nick', p[0].nick);
    store.set('tgLinked', true); document.dispatchEvent(new Event('nick'));
    return true;
  } catch (e) { console.warn('tg-auth', e); return false; }
}
/** web: data from the Telegram Login Widget */
export async function loginWithTelegram(widget: Record<string, string>) {
  if (!online) return false;
  const { data } = await client().auth.getSession();
  const ok = await tgAuth({ widget }, data.session?.user.is_anonymous ? data.session.access_token : undefined);
  if (ok) { ready = Promise.resolve(true); flush(); }
  return ok;
}
export const tgLinked = () => store.get('tgLinked', false);

// same rules as the database; quick feedback before asking the server
const BAD = ['fuck', 'shit', 'cunt', 'nigger', 'nigga', 'faggot', 'whore', 'slut', 'retard', 'hitler', 'rapist', 'pedo', 'хуй', 'хуе', 'хуё', 'хуи', 'пизд', 'ебат', 'ебал', 'ёб', 'бля', 'сука', 'пидор', 'пидар', 'підар', 'підор', 'гандон', 'шлюх', 'мудак', 'залуп', 'kurwa', 'chuj', 'jebac', 'jebać', 'pierdol', 'pedał', 'scheisse', 'scheiße', 'fotze', 'hurensohn', 'wichser', 'mierda', 'cabron', 'cabrón', 'maricon', 'maricón', 'pendejo', 'gilipollas', 'orospu', 'siktir', 'yarrak', 'pezevenk', 'caralho', 'buceta', 'viado', 'filhodaputa', 'salope', 'connard', 'encule', 'enculé'];
export type NickErr = 'format' | 'digits' | 'bad' | 'taken' | 'pay' | 'auth' | 'net';
export function nickCheck(n: string): 'ok' | NickErr {
  if (n.length < 6 || n.length > 16 || /[\s<>"'`/\\|{}()[\]#@!?,;:+=*&%$^~]/.test(n)) return 'format';
  if (/^[0-9._-]+$/.test(n)) return 'digits';
  const l = n.toLowerCase(); if (BAD.some(w => l.includes(w))) return 'bad';
  return 'ok';
}
export const myNick = () => store.get<string>('nick', '');

export async function nickFree(n: string): Promise<boolean | null> {
  if (!(await ensure())) return null;
  const { data, error } = await client().rpc('nick_free', { n }); return error ? null : !!data;
}
export async function setNick(n: string): Promise<'ok' | NickErr> {
  const c = nickCheck(n); if (c !== 'ok') return c;
  if (!online) { store.set('nick', n); return 'ok'; }
  if (!(await ensure())) return 'net';
  const { data, error } = await client().rpc('set_nick', { n });
  if (error) return 'net';
  if (data === 'ok') { store.set('nick', n); flush(); }
  return data as any;
}
export async function profile(): Promise<{ nick: string; renames: number; rename_credits: number } | null> {
  if (!(await ensure())) return null;
  const { data } = await client().rpc('my_profile'); return data?.[0] ?? null;
}

/** queue points for a game and send when possible */
export function addPoints(game: string, pts: number) {
  pts = Math.round(pts); if (pts <= 0) return;
  const q = store.get<Record<string, number>>('pq', {}); q[game] = (q[game] || 0) + pts; store.set('pq', q);
  const tot = store.get<Record<string, number>>('ptot', {}); tot[game] = (tot[game] || 0) + pts; store.set('ptot', tot);
  flush();
}
let flushing = false;
export async function flush() {
  if (flushing || !online || !myNick()) return; flushing = true;
  try {
    if (await ensure()) {
      const q = store.get<Record<string, number>>('pq', {});
      for (const g of Object.keys(q)) {
        let left = q[g];
        while (left > 0) { const part = Math.min(left, 200000); const { error } = await client().rpc('add_points', { g, pts: part }); if (error) throw error; left -= part; }
        delete q[g]; store.set('pq', q);
      }
      const bq = store.get<Record<string, number>>('bq', {});
      for (const g of Object.keys(bq)) { const { error } = await client().rpc('submit_best', { g, v: bq[g] }); if (error) throw error; delete bq[g]; store.set('bq', bq); }
    }
  } catch (e) { console.warn('flush', e); } finally { flushing = false; }
}
export const localTotal = (game: string) => store.get<Record<string, number>>('ptot', {})[game] || 0;
export const localBest = (game: string) => store.get<Record<string, number>>('pbest', {})[game] || 0;
/** remember a new high score and send it (the server keeps the maximum) */
export function submitBest(game: string, v: number) {
  v = Math.round(v); const b = store.get<Record<string, number>>('pbest', {}); if (v <= (b[game] || 0)) return;
  b[game] = v; store.set('pbest', b); const q = store.get<Record<string, number>>('bq', {}); q[game] = v; store.set('bq', q);
  clearTimeout(bestT); bestT = setTimeout(() => flush(), 1500);
}
let bestT: any = 0;
/** report a bug: optional screenshot (JPEG data URL) goes to Storage bucket "bugs", text to table bug_reports */
export async function reportBug(text: string, shot: string | null, meta: Record<string, unknown>): Promise<boolean> {
  if (!(await ensure())) return false;
  const c = client(); let path: string | null = null;
  try {
    if (shot) {
      const blob = await (await fetch(shot)).blob(), { data: u } = await c.auth.getUser();
      path = `${u.user?.id || 'anon'}/${Date.now()}.jpg`;
      const up = await c.storage.from('bugs').upload(path, blob, { contentType: 'image/jpeg' }); if (up.error) { console.warn('bug shot', up.error); path = null; }
    }
    const { error } = await c.rpc('report_bug', { msg: text.slice(0, 2000), shot: path, meta });
    return !error;
  } catch (e) { console.warn('bug', e); return false; }
}

export async function top(game: string): Promise<{ rows: { nick: string; points: number; me: boolean }[]; rank: number | null } | null> {
  if (!(await ensure())) return null;
  await flush();
  const [a, b] = await Promise.all([client().rpc('top_scores', { g: game, lim: 50 }), client().rpc('my_rank', { g: game })]);
  if (a.error) return null;
  return { rows: (a.data || []).map((r: any) => ({ nick: r.nick, points: Number(r.points), me: r.me })), rank: b.data?.[0]?.rank ? Number(b.data[0].rank) : null };
}
