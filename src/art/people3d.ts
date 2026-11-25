// Chunky "plasticine" people, zombies, soldiers and bosses for the 3D games.
// Characters face +z. Regular meshes for heroes, InstancedMesh crowds for big groups.
import { THREE } from '../core/three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const mats = new Map<string, THREE.MeshStandardMaterial>();
const M = (c: THREE.ColorRepresentation, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
  const k = String(c) + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: .72, metalness: 0, ...o })); return mats.get(k)!;
};
const SKINS = [0xf2c9a0, 0xe0ac7e, 0xc68a5c, 0x8d5a3b, 0xf6d7b8];
const HAIR = [0x3b2a20, 0x6b4429, 0x1b1b1f, 0xd9a441, 0xa8432d];
const G = {
  body: new THREE.CapsuleGeometry(.25, .26, 6, 14), head: new THREE.SphereGeometry(.25, 18, 14), hair: new THREE.SphereGeometry(.262, 18, 10, 0, Math.PI * 2, 0, Math.PI * .5),
  eye: new THREE.SphereGeometry(.042, 10, 8), shine: new THREE.SphereGeometry(.014, 6, 6), mouth: new THREE.CapsuleGeometry(.025, .06, 3, 6).rotateZ(Math.PI / 2),
  arm: new THREE.CapsuleGeometry(.075, .24, 4, 8).translate(0, -.15, 0), hand: new THREE.SphereGeometry(.085, 10, 8),
  leg: new THREE.CapsuleGeometry(.1, .18, 4, 8).translate(0, -.13, 0), shoe: new THREE.SphereGeometry(.11, 10, 8).scale(1, .6, 1.4),
  helmet: new THREE.SphereGeometry(.28, 16, 10, 0, Math.PI * 2, 0, Math.PI * .55), vest: new THREE.CapsuleGeometry(.27, .14, 4, 12),
};

export interface Person extends THREE.Group { userData: { arms: THREE.Object3D[]; legs: THREE.Object3D[]; kind: string; t: number; body: THREE.Mesh } }
type Kind = 'zombie' | 'human' | 'soldier' | 'boss';

/** gun meshes per weapon tier (also used for the glowing pickups) */
export function gunMesh(tier: number, mat?: THREE.Material) {
  const g = new THREE.Group(), m = mat || M(0x2b2b31, { roughness: .45, metalness: .4 }), acc = mat || M(0x5b6b7a, { roughness: .4, metalness: .5 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, mm = m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mm); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  const cyl = (r: number, l: number, x: number, y: number, z: number, mm = m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 10).rotateX(Math.PI / 2), mm); c.position.set(x, y, z); c.castShadow = true; g.add(c); return c; };
  if (tier === 0) { box(.08, .1, .3, 0, 0, .05); box(.07, .16, .08, 0, -.1, -.05); }
  else if (tier === 1) { box(.09, .12, .42, 0, 0, .05); box(.06, .2, .07, 0, -.13, .05, acc); box(.07, .14, .08, 0, -.1, -.13); cyl(.025, .18, 0, .02, .33); }
  else if (tier === 2) { box(.09, .13, .6, 0, 0, .08); box(.07, .22, .08, 0, -.14, .12, acc); box(.08, .14, .22, 0, -.02, -.3); cyl(.025, .26, 0, .03, .5); box(.05, .06, .16, 0, .1, .05, acc); }
  else if (tier === 3) { box(.1, .12, .55, 0, 0, 0); cyl(.04, .4, 0, .03, .42); cyl(.035, .3, 0, -.06, .28, acc); box(.08, .14, .22, 0, -.03, -.36); }
  else if (tier === 4) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; cyl(.025, .62, Math.cos(a) * .07, Math.sin(a) * .07, .35); } cyl(.13, .2, 0, 0, 0, acc); box(.16, .2, .26, 0, -.05, -.2); }
  else { box(.11, .14, .6, 0, 0, .05, acc); cyl(.05, .3, 0, 0, .45, mat || M(0x6af0ff, { emissive: 0x6af0ff, emissiveIntensity: 1.2 })); box(.06, .24, .08, 0, -.15, .05); }
  return g;
}

export function person(kind: Kind, shirt: THREE.ColorRepresentation, opts: { weapon?: number } = {}) {
  const g = new THREE.Group() as Person, z = kind === 'zombie' || kind === 'boss';
  const skin = z ? M(kind === 'boss' ? 0x7fa35a : 0x8fbf6a) : M(SKINS[Math.floor(Math.random() * SKINS.length)]);
  const cloth = M(shirt), pants = M(z ? 0x4b3f63 : kind === 'soldier' ? 0x4f5d3a : 0x2f3b55), shoe = M(0x2b2b31);
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, zz = 0, parent: THREE.Object3D = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, zz); o.castShadow = true; parent.add(o); return o; };
  const legs: THREE.Object3D[] = [], arms: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const l = new THREE.Group(); l.position.set(s * .12, .42, 0); g.add(l); add(G.leg, pants, 0, 0, 0, l); add(G.shoe, shoe, 0, -.3, .05, l); legs.push(l);
  }
  const body = add(G.body, cloth, 0, .72) as THREE.Mesh;
  if (kind === 'soldier') add(G.vest, M(0x5f6b3a), 0, .74);
  if (z) { add(new THREE.BoxGeometry(.2, .12, .02), M(0x2b2b31), .08, .62, .25).rotation.z = .3; }      // torn patch
  const head = new THREE.Group(); head.position.y = 1.22; g.add(head);
  add(G.head, skin, 0, 0, 0, head);
  if (kind === 'human') add(G.hair, M(HAIR[Math.floor(Math.random() * HAIR.length)]), 0, .02, -.02, head);
  if (kind === 'soldier') add(G.helmet, M(0x4f5d3a, { roughness: .5 }), 0, .04, 0, head);
  const eyeM = z ? M(0xff3030, { emissive: 0xff2020, emissiveIntensity: 1.3 }) : M(0x1b1b1f, { roughness: .3 });
  for (const s of [-1, 1]) { add(G.eye, eyeM, s * .09, .02, .22, head); if (!z) add(G.shine, M(0xffffff, { emissive: 0xffffff }), s * .09 + .015, .04, .26, head); }
  add(G.mouth, M(z ? 0x3a1f1f : 0x8a3a3a), 0, -.1, .23, head).scale.set(z ? 1.6 : 1, z ? 2 : 1, 1);
  for (const s of [-1, 1]) {
    const a = new THREE.Group(); a.position.set(s * .3, .92, 0); g.add(a); add(G.arm, kind === 'human' || kind === 'soldier' ? cloth : skin, 0, 0, 0, a); add(G.hand, skin, 0, -.32, 0, a); arms.push(a);
  }
  if (z) { arms.forEach(a => a.rotation.x = -1.45); body.rotation.x = .15; head.position.z = .06; }
  if (kind === 'soldier') {
    arms[1].rotation.set(-1.15, 0, .12); arms[0].rotation.set(-1.25, 0, -.55);
    const gun = gunMesh(opts.weapon ?? 0); gun.position.set(.3, 1.02, .3); gun.scale.setScalar(1.7); gun.name = 'gun'; g.add(gun);
  }
  g.userData = { arms, legs, kind, t: Math.random() * 6, body };
  if (kind === 'boss') { g.scale.setScalar(2.4); body.scale.set(1.35, 1.2, 1.2); }
  return g;
}

/** walk / run cycle */
export function animate(p: Person, dt: number, speed = 1) {
  const u = p.userData; u.t += dt * 8 * speed; const s = Math.sin(u.t) * .7;
  u.legs[0].rotation.x = s; u.legs[1].rotation.x = -s;
  if (u.kind === 'human') { u.arms[0].rotation.x = -s * .8; u.arms[1].rotation.x = s * .8; }
  else if (u.kind === 'zombie' || u.kind === 'boss') { u.arms[0].rotation.x = -1.45 + s * .15; u.arms[1].rotation.x = -1.45 - s * .15; p.rotation.z = Math.sin(u.t * .5) * .06; }
  p.children.forEach(c => { if (c !== u.legs[0] && c !== u.legs[1]) { } });
  p.position.y = Math.abs(Math.cos(u.t)) * .06 * (p.scale.y || 1);
}

/** swap the soldier's gun */
export function setGun(p: Person, tier: number) { const old = p.getObjectByName('gun'); if (old) p.remove(old); const g = gunMesh(tier); g.position.set(.3, 1.02, .3); g.scale.setScalar(1.7); g.name = 'gun'; p.add(g); }

// ---------- instanced crowds: tinted bodies + skin heads with eyes, posed per frame ----------
function colored(geo: THREE.BufferGeometry, c: THREE.ColorRepresentation) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv'); return g;
}
export class CrowdMesh {
  bodies: THREE.InstancedMesh; heads: THREE.InstancedMesh; max: number; private d = new THREE.Object3D(); private c = new THREE.Color();
  constructor(max: number, scene: THREE.Object3D, kind: 'human' | 'zombie' = 'human') {
    this.max = max; const z = kind === 'zombie', skin = z ? 0x8fbf6a : 0xf2c9a0;
    const bodyGeo = mergeGeometries([
      colored(new THREE.CapsuleGeometry(.25, .26, 4, 10).translate(0, .72, 0), 0xffffff),
      colored(new THREE.CapsuleGeometry(.1, .2, 3, 6).translate(-.12, .3, 0), 0x2f3b55), colored(new THREE.CapsuleGeometry(.1, .2, 3, 6).translate(.12, .3, 0), 0x2f3b55),
      colored(new THREE.CapsuleGeometry(.075, .24, 3, 6).rotateX(z ? -1.45 : -.2).translate(-.3, .8, z ? .14 : 0), z ? skin : 0xffffff),
      colored(new THREE.CapsuleGeometry(.075, .24, 3, 6).rotateX(z ? -1.45 : .2).translate(.3, .8, z ? .14 : 0), z ? skin : 0xffffff),
    ]);
    const headGeo = mergeGeometries([
      colored(new THREE.SphereGeometry(.25, 14, 10).translate(0, 1.22, 0), skin),
      colored(new THREE.SphereGeometry(.045, 8, 6).translate(-.09, 1.24, .22), z ? 0xff3030 : 0x1b1b1f), colored(new THREE.SphereGeometry(.045, 8, 6).translate(.09, 1.24, .22), z ? 0xff3030 : 0x1b1b1f),
      ...(z ? [] : [colored(new THREE.SphereGeometry(.262, 14, 8, 0, Math.PI * 2, 0, Math.PI * .45).translate(0, 1.24, -.02), 0x3b2a20)]),
    ]);
    this.bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .7 }), max);
    this.heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, emissive: z ? 0x220000 : 0 }), max);
    for (const m of [this.bodies, this.heads]) { m.castShadow = true; m.count = 0; m.frustumCulled = false; scene.add(m); }
  }
  set count(n: number) { this.bodies.count = this.heads.count = Math.min(n, this.max); }
  get count() { return this.bodies.count; }
  color(i: number, c: THREE.ColorRepresentation) { this.bodies.setColorAt(i, this.c.set(c)); if (this.bodies.instanceColor) this.bodies.instanceColor.needsUpdate = true; }
  pose(i: number, x: number, y: number, z: number, ry = 0, s = 1, lean = 0) {
    const d = this.d; d.position.set(x, y, z); d.rotation.set(lean, ry, 0); d.scale.setScalar(s); d.updateMatrix();
    this.bodies.setMatrixAt(i, d.matrix); this.heads.setMatrixAt(i, d.matrix);
  }
  commit() { this.bodies.instanceMatrix.needsUpdate = true; this.heads.instanceMatrix.needsUpdate = true; }
  dispose(scene: THREE.Object3D) { scene.remove(this.bodies, this.heads); }
}

/** canvas texture with big text, for gate panels */
export function labelTexture(text: string, bg: string, sub = '') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d')!;
  const gr = x.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, bg); gr.addColorStop(1, '#' + new THREE.Color(bg).multiplyScalar(.7).getHexString());
  x.fillStyle = gr; x.beginPath(); x.roundRect(4, 4, 248, 152, 18); x.fill(); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 7; x.stroke();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = sub ? 62 : 84; x.font = `700 ${fs}px Fredoka, sans-serif`;
  while (x.measureText(text).width > 228 && fs > 22) { fs -= 2; x.font = `700 ${fs}px Fredoka, sans-serif`; }
  x.lineWidth = 10; x.strokeStyle = 'rgba(0,0,0,.35)';
  x.strokeText(text, 128, sub ? 64 : 84); x.fillText(text, 128, sub ? 64 : 84);
  if (sub) { let ss = 28; x.font = `600 ${ss}px Fredoka, sans-serif`; while (x.measureText(sub).width > 232 && ss > 14) { ss -= 2; x.font = `600 ${ss}px Fredoka, sans-serif`; } x.lineWidth = 6; x.strokeText(sub, 128, 124); x.fillText(sub, 128, 124); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** floating number above an object, drawn as a sprite */
export function numberSprite(text: string, bg = '#1b1b1f', w = 1.4) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 112; const x = c.getContext('2d')!;
  x.fillStyle = bg; x.beginPath(); x.roundRect(8, 8, 240, 96, 48); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke();
  x.fillStyle = '#fff'; x.font = '700 64px Fredoka, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(w, w * 112 / 256, 1); s.renderOrder = 10; return s;
}
export function setSpriteText(s: THREE.Sprite, text: string, bg = '#1b1b1f') { const old = (s.material as THREE.SpriteMaterial).map; const n = numberSprite(text, bg); (s.material as THREE.SpriteMaterial).map = (n.material as THREE.SpriteMaterial).map; old?.dispose(); }

/** little burst of spheres (poof) */
export function poof(scene: THREE.Object3D, stage: { tween: (d: number, f: (k: number) => void) => Promise<void> }, x: number, y: number, z: number, color: THREE.ColorRepresentation, n = 6, size = .12) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true });
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(size, 6, 5), m); s.position.set(x, y, z); scene.add(s);
    const v = new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 1.6 + .4, (Math.random() - .5) * 2);
    stage.tween(420, k => { s.position.set(x + v.x * k, y + v.y * k - k * k * .8, z + v.z * k); s.scale.setScalar(1 - k * .7); m.opacity = 1 - k; }).then(() => { scene.remove(s); s.geometry.dispose(); });
  }
}
