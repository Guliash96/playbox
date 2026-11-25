// Tiny synthesised sound effects (Web Audio, no files). sfx('tap') etc.; muted state is remembered.
import { store } from './store';

type Name = 'tap' | 'ok' | 'err' | 'win' | 'lose' | 'coin' | 'shoot' | 'pop' | 'whoosh' | 'merge';
let ctx: AudioContext | null = null, master: GainNode | null = null, lastShoot = 0;
export const isMuted = () => store.get('mute', false);
export function setMuted(m: boolean) { store.set('mute', m); }

function ac() {
  if (!ctx) { const C = (window as any).AudioContext || (window as any).webkitAudioContext; if (!C) return null; ctx = new C(); master = ctx!.createGain(); master!.gain.value = .35; master!.connect(ctx!.destination); }
  if (ctx!.state === 'suspended') ctx!.resume();
  return ctx;
}
function tone(f: number, d: number, type: OscillatorType = 'sine', vol = .5, at = 0, slide = 0) {
  const c = ac(); if (!c || !master) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02);
}
function noise(d: number, vol = .3, at = 0, hp = 800) {
  const c = ac(); if (!c || !master) return; const t = c.currentTime + at, len = Math.floor(c.sampleRate * d), b = c.createBuffer(1, len, c.sampleRate), x = b.getChannelData(0);
  for (let i = 0; i < len; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
  s.buffer = b; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}

export function sfx(n: Name) {
  if (isMuted()) return;
  try {
    switch (n) {
      case 'tap': tone(660, .06, 'triangle', .25); break;
      case 'ok': tone(660, .09, 'triangle', .3); tone(990, .12, 'triangle', .28, .07); break;
      case 'err': tone(180, .18, 'square', .18, 0, .7); break;
      case 'coin': tone(988, .07, 'square', .14); tone(1319, .16, 'square', .14, .06); break;
      case 'pop': tone(500, .08, 'sine', .3, 0, 1.8); break;
      case 'merge': tone(523, .1, 'triangle', .3); tone(784, .1, 'triangle', .3, .08); tone(1047, .18, 'triangle', .3, .16); break;
      case 'whoosh': noise(.25, .18, 0, 1200); break;
      case 'shoot': { const now = performance.now(); if (now - lastShoot < 70) return; lastShoot = now; noise(.06, .12, 0, 2500); tone(220, .05, 'square', .06, 0, .5); break; }
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .3, i * .11)); break;
      case 'lose': [392, 330, 262].forEach((f, i) => tone(f, .28, 'sawtooth', .15, i * .16)); break;
    }
  } catch { /* audio not available */ }
}
