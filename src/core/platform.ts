// Platform layer: everything platform-specific goes through here.
declare global { interface Window { Telegram?: any } }

export type Platform = 'telegram' | 'web' | 'android' | 'ios';

export const TG = () => {
  const w = window.Telegram?.WebApp;
  return w && w.initData ? w : null;
};

export function platform(): Platform {
  if (TG()) return 'telegram';
  const cap = (window as any).Capacitor;
  if (cap?.getPlatform) { const p = cap.getPlatform(); if (p === 'android' || p === 'ios') return p; }
  return 'web';
}

export function initPlatform(onBack: () => void) {
  const tg = TG();
  if (!tg) return;
  try {
    tg.ready(); tg.expand();
    tg.disableVerticalSwipes?.();
    tg.BackButton.onClick(onBack);
  } catch { /* old clients */ }
}

export function setBackButton(show: boolean) {
  try { const tg = TG(); if (tg) show ? tg.BackButton.show() : tg.BackButton.hide(); } catch { }
}

import { sfx } from './sfx';
export function haptic(t: 'tap' | 'ok' | 'err' = 'tap') {
  sfx(t);
  try {
    const tg = TG();
    if (tg) t === 'err' ? tg.HapticFeedback.notificationOccurred('error') : tg.HapticFeedback.impactOccurred(t === 'ok' ? 'medium' : 'light');
    else navigator.vibrate?.(t === 'err' ? [40, 40, 40] : 12);
  } catch { }
}
