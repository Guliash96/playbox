// Online profile + leaderboards (Supabase). Works offline too: nickname is kept locally and
// points are queued until the server is reachable.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { store } from './store';

export const online = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
let sb: SupabaseClient | null = null, ready: Promise<boolean> | null = null;

function client() { return sb ||= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: 'pb-auth' } }); }
async function ensure(): Promise<boolean> {
  if (!online) return false;
  return ready ||= (async () => {
    try {
      const c = client(), { data } = await c.auth.getSession();
      if (!data.session) { const r = await c.auth.signInAnonymously(); if (r.error) throw r.error; }
      return true;
    } catch (e) { console.warn('supabase', e); ready = null; return false; }
  })();
}

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
    }
  } catch (e) { console.warn('flush', e); } finally { flushing = false; }
}
export const localTotal = (game: string) => store.get<Record<string, number>>('ptot', {})[game] || 0;

export async function top(game: string): Promise<{ rows: { nick: string; points: number; me: boolean }[]; rank: number | null } | null> {
  if (!(await ensure())) return null;
  await flush();
  const [a, b] = await Promise.all([client().rpc('top_scores', { g: game, lim: 50 }), client().rpc('my_rank', { g: game })]);
  if (a.error) return null;
  return { rows: (a.data || []).map((r: any) => ({ nick: r.nick, points: Number(r.points), me: r.me })), rank: b.data?.[0]?.rank ? Number(b.data[0].rank) : null };
}
