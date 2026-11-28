// Local progress (localStorage). Progress keys are also synced to the player's account (see net.ts syncSave),
// so levels, crystals, boosters and records are the same in Telegram and in the browser.
const P = 'pb2_';
/** which keys travel with the account */
export const isSync = (k: string) => /_lvl$|_best$|^cool_/.test(k) || ['gems', 'inv', 'ach', 'pbest', 'ptot', 'noads', 'adg'].includes(k);
/** keys merged by maximum (progress only goes up); everything else: the latest change wins */
export const isMax = (k: string) => /_lvl$|_best$/.test(k) || ['pbest', 'ptot', 'ach'].includes(k);
let onDirty: (() => void) | null = null;
export const setDirtyHook = (f: () => void) => { onDirty = f; };
export const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(P + k, JSON.stringify(v));
      if (isSync(k)) { const ts = store.get<Record<string, number>>('_ts', {}); ts[k] = Date.now(); localStorage.setItem(P + '_ts', JSON.stringify(ts)); onDirty?.(); }
    } catch { }
  },
  /** write without touching sync timestamps (used when applying the cloud copy) */
  raw(k: string, v: unknown) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { } },
  syncKeys() { const out: string[] = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; if (k.startsWith(P) && isSync(k.slice(P.length))) out.push(k.slice(P.length)); } return out; },
};
