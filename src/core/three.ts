// Shared three.js stage for the 3D games: renderer, camera, lights, resize, render loop, tweens, picking.
import * as THREE from 'three';
export { THREE };
export { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const ease = {
  inOut: (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2,
  in: (t: number) => t * t * t,
  out: (t: number) => 1 - (1 - t) ** 3,
  back: (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2,
};

interface Tween { t: number; d: number; delay: number; fn: (k: number) => void; done?: () => void; res: () => void }

export class Stage {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera;
  el: HTMLElement; ro: ResizeObserver; raf = 0; last = 0; tweens: Tween[] = [];
  onFrame: ((dt: number) => void) | null = null; onResize: ((w: number, h: number) => void) | null = null;
  ray = new THREE.Raycaster();

  constructor(el: HTMLElement, opts: { fov?: number; shadows?: boolean; clear?: number | null } = {}) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: opts.clear == null });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    if (opts.clear != null) this.renderer.setClearColor(opts.clear);
    if (opts.shadows) { this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.camera = new THREE.PerspectiveCamera(opts.fov ?? 40, 1, .1, 300);
    const c = this.renderer.domElement; c.className = 'gl'; el.appendChild(c);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    const loop = (ts: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(.05, (ts - (this.last || ts)) / 1000); this.last = ts;
      this.step(dt * 1000); this.onFrame?.(dt);
      this.renderer.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(loop);
  }
  resize() {
    const w = Math.max(1, this.el.clientWidth), h = Math.max(1, this.el.clientHeight);
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.onResize?.(w, h);
  }
  /** standard soft daylight */
  lights(sun = new THREE.Vector3(5, 12, 7), size = 12) {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7f99, 1.25));
    const d = new THREE.DirectionalLight(0xffffff, 2.1); d.position.copy(sun);
    if (this.renderer.shadowMap.enabled) {
      d.castShadow = true; d.shadow.mapSize.set(1024, 1024); d.shadow.bias = -.0005; d.shadow.normalBias = .02;
      const cam = d.shadow.camera as THREE.OrthographicCamera; cam.left = -size; cam.right = size; cam.top = size; cam.bottom = -size; cam.far = 80;
    }
    this.scene.add(d); return d;
  }
  tween(d: number, fn: (k: number) => void, delay = 0) {
    return new Promise<void>(res => this.tweens.push({ t: 0, d, delay, fn, res }));
  }
  step(ms: number) {
    for (const tw of [...this.tweens]) {
      if (tw.delay > 0) { tw.delay -= ms; continue; }
      tw.t += ms; const k = Math.min(1, tw.t / tw.d); tw.fn(k);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
  }
  pick(e: { clientX: number; clientY: number }, objs: THREE.Object3D[]) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), this.camera);
    return this.ray.intersectObjects(objs, true)[0] || null;
  }
  dispose() {
    cancelAnimationFrame(this.raf); this.ro.disconnect();
    this.scene.traverse((o: any) => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => { m?.map?.dispose?.(); m?.dispose?.(); }); });
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

export const mat = (color: THREE.ColorRepresentation, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: .55, metalness: .05, ...o });

export function mesh(geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], shadow = true) {
  const x = new THREE.Mesh(geo, m); x.castShadow = shadow; x.receiveShadow = true; return x;
}
