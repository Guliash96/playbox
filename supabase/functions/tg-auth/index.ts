// Supabase Edge Function "tg-auth": verifies Telegram data with the bot token and returns a session for the
// player's Telegram account (same account in the Mini App on any device and on the web via the login widget).
// Secrets: TELEGRAM_BOT_TOKEN (required), TG_PASS_SECRET (optional, any long random string).
import { createClient } from 'npm:@supabase/supabase-js@2';

const BOT = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const URL = Deno.env.get('SUPABASE_URL')!, SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SECRET = Deno.env.get('TG_PASS_SECRET') ?? SERVICE;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function hmac(key: ArrayBuffer | Uint8Array, data: string) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Mini App initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app) */
async function fromInitData(initData: string) {
  const p = new URLSearchParams(initData), hash = p.get('hash'); p.delete('hash');
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac(enc.encode('WebAppData'), BOT);
  if (hex(await hmac(secret, dcs)) !== hash) return null;
  if (Date.now() / 1000 - Number(p.get('auth_date')) > 86400) return null;
  return JSON.parse(p.get('user') || 'null');
}
/** Login Widget data (https://core.telegram.org/widgets/login#checking-authorization) */
async function fromWidget(d: Record<string, string>) {
  const { hash, ...rest } = d;
  const dcs = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('\n');
  const secret = await crypto.subtle.digest('SHA-256', enc.encode(BOT));
  if (hex(await hmac(secret, dcs)) !== hash) return null;
  if (Date.now() / 1000 - Number(d.auth_date) > 86400) return null;
  return { id: Number(d.id), username: d.username, first_name: d.first_name };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (!BOT) return json({ error: 'TELEGRAM_BOT_TOKEN is not set' }, 500);
    const body = await req.json();
    const tg = body.initData ? await fromInitData(body.initData) : body.widget ? await fromWidget(body.widget) : null;
    if (!tg?.id) return json({ error: 'bad telegram data' }, 401);

    const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
    const email = `tg${tg.id}@users.playbox.app`, password = hex(await hmac(enc.encode(SECRET), 'tg' + tg.id));
    let s = await admin.auth.signInWithPassword({ email, password });
    if (s.error) {
      const c = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { tg_id: tg.id, tg_username: tg.username ?? null } });
      if (c.error) return json({ error: c.error.message }, 500);
      s = await admin.auth.signInWithPassword({ email, password });
      if (s.error) return json({ error: s.error.message }, 500);
    }
    const uid = s.data.user!.id;

    // move nickname + points from this device's anonymous account into the Telegram account (once)
    if (body.anonToken) {
      const { data: a } = await admin.auth.getUser(body.anonToken);
      const anon = a?.user;
      if (anon && anon.id !== uid && anon.is_anonymous) {
        const { data: ap } = await admin.from('players').select('*').eq('id', anon.id).maybeSingle();
        if (ap) {
          const { data: sc } = await admin.from('scores').select('*').eq('player_id', anon.id);
          const { data: mine } = await admin.from('players').select('id').eq('id', uid).maybeSingle();
          await admin.from('players').delete().eq('id', anon.id);                       // frees the nickname
          if (!mine) await admin.from('players').insert({ id: uid, nick: ap.nick, renames: ap.renames, rename_credits: ap.rename_credits });
          for (const r of sc ?? []) {
            const { data: cur } = await admin.from('scores').select('*').eq('player_id', uid).eq('game', r.game).maybeSingle();
            const row: Record<string, unknown> = { player_id: uid, game: r.game, points: Number(cur?.points ?? 0) + Number(r.points) };
            if ('best' in r) row.best = Math.max(Number(cur?.best ?? 0), Number(r.best ?? 0));
            await admin.from('scores').upsert(row);
          }
        }
        await admin.auth.admin.deleteUser(anon.id);
      }
    }
    return json({ access_token: s.data.session!.access_token, refresh_token: s.data.session!.refresh_token });
  } catch (e) { return json({ error: String(e) }, 500); }
});
