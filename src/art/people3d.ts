// Low-poly people, zombies and soldiers for the gate games.
import { THREE, RoundedBoxGeometry, mat, mesh } from '../core/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const skin = mat(0xf2c9a0, { roughness: .7 }), zskin = mat(0x8fbf6a, { roughness: .8 }), dark = mat(0x2b2b31, { roughness: .8 });
const eyeZ = mat(0xff4040, { emissive: 0xff2020, emissiveIntensity: 1 });
const G = {
  torso: new RoundedBoxGeometry(.42, .5, .26, 2, .08), head: new THREE.SphereGeometry(.17, 14, 10), limb: new THREE.CapsuleGeometry(.065, .32, 4, 8),
  leg: new THREE.CapsuleGeometry(.08, .34, 4, 8), helmet: new THREE.SphereGeometry(.19, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), gun: new THREE.BoxGeometry(.08, .1, .5), eye: new THREE.SphereGeometry(.03, 6, 6),
};
for (const g of [G.limb, G.leg]) g.translate(0, -.2, 0);   // pivot at shoulder / hip

export interface Person extends THREE.Group { userData: { arms: THREE.Object3D[]; legs: THREE.Object3D[]; kind: string; t: number } }

export function person(kind: 'zombie' | 'human' | 'soldier' | 'boss', shirt: THREE.ColorRepresentation) {
  const g = new THREE.Group() as Person, cloth = mat(shirt, { roughness: .7 }), pants = mat(kind === 'zombie' || kind === 'boss' ? 0x4b3f63 : 0x2f3b55, { roughness: .8 });
  const head = kind === 'zombie' || kind === 'boss' ? zskin : skin;
  const t = mesh(G.torso, cloth); t.position.y = .95; g.add(t);
  const h = mesh(G.head, head); h.position.y = 1.36; g.add(h);
  if (kind === 'zombie' || kind === 'boss') { for (const x of [-.06, .06]) { const e = mesh(G.eye, eyeZ, false); e.position.set(x, 1.38, -.15); g.add(e); } }
  if (kind === 'soldier') { const hm = mesh(G.helmet, mat(0x4f5d3a, { roughness: .6 })); hm.position.y = 1.38; g.add(hm); }
  const arms: THREE.Object3D[] = [], legs: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const a = mesh(G.limb, kind === 'zombie' || kind === 'boss' ? head : cloth); a.position.set(s * .27, 1.16, 0); g.add(a); arms.push(a);
    const l = mesh(G.leg, pants); l.position.set(s * .11, .7, 0); g.add(l); legs.push(l);
  }
  if (kind === 'zombie' || kind === 'boss') arms.forEach(a => a.rotation.x = -1.35);
  if (kind === 'soldier') { arms.forEach(a => a.rotation.x = -1.2); const gun = mesh(G.gun, dark); gun.position.set(.05, 1.1, -.42); g.add(gun); }
  g.userData = { arms, legs, kind, t: Math.random() * 6 };
  if (kind === 'boss') g.scale.setScalar(2.3);
  return g;
}

/** walk cycle */
export function animate(p: Person, dt: number, speed = 1) {
  const u = p.userData; u.t += dt * 7 * speed; const s = Math.sin(u.t) * .55;
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
  if (u.kind === 'human') { u.arms[0].rotation.x = -s; u.arms[1].rotation.x = s; }
  else if (u.kind !== 'soldier') { u.arms[0].rotation.x = -1.35 + s * .2; u.arms[1].rotation.x = -1.35 - s * .2; }
  p.position.y = Math.abs(Math.cos(u.t)) * .05;
}

/** single-geometry stick figure for InstancedMesh crowds (tinted per instance) */
export function crowdGeometry() {
  const parts = [
    new THREE.CapsuleGeometry(.13, .26, 4, 8).translate(0, .42, 0),
    new THREE.SphereGeometry(.12, 10, 8).translate(0, .76, 0),
    new THREE.CapsuleGeometry(.05, .2, 3, 6).translate(-.08, .14, 0),
    new THREE.CapsuleGeometry(.05, .2, 3, 6).translate(.08, .14, 0),
  ];
  return mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
}

/** canvas texture with big text, for gate panels */
export function labelTexture(text: string, bg: string, sub = '') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d')!;
  const gr = x.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, bg); gr.addColorStop(1, shadeHex(bg, -.25));
  x.fillStyle = gr; x.fillRect(0, 0, 256, 160); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 8; x.strokeRect(6, 6, 244, 148);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 ${sub ? 64 : 84}px Fredoka, sans-serif`; x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.35)';
  x.strokeText(text, 128, sub ? 66 : 84); x.fillText(text, 128, sub ? 66 : 84);
  if (sub) { x.font = '600 30px Fredoka, sans-serif'; x.fillText(sub, 128, 124); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shadeHex(hex: string, k: number) { const c = new THREE.Color(hex); return '#' + c.lerp(new THREE.Color(k < 0 ? 0 : 0xffffff), Math.abs(k)).getHexString(); }
