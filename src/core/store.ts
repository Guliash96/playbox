// Local progress. Later: sync to Telegram CloudStorage / backend by swapping this module.
const P = 'pb2_';
export const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k: string, v: unknown) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { }
  },
};
