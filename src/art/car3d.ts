// Low-poly 3D vehicles built from primitives. Front faces +x, sits on y=0, centred on its cells.
import { THREE, RoundedBoxGeometry, mat, mesh } from '../core/three';

const glass = mat(0x22364f, { roughness: .15, metalness: .4 });
const tyre = mat(0x1e1e22, { roughness: .9 });
const hub = mat(0xd9dde3, { metalness: .6, roughness: .3 });
const lamp = mat(0xfff3b0, { emissive: 0xffe680, emissiveIntensity: .8 });
const tail = mat(0xff4040, { emissive: 0xc01010, emissiveIntensity: .6 });
const dark = mat(0x2b2b31, { roughness: .8 });
const wheelGeo = new THREE.CylinderGeometry(.16, .16, .12, 18).rotateX(Math.PI / 2);
const hubGeo = new THREE.CylinderGeometry(.07, .07, .13, 10).rotateX(Math.PI / 2);

const arrowGeo = (() => { const s = new THREE.Shape(); s.moveTo(-.22, -.16); s.lineTo(.05, -.16); s.lineTo(.05, -.3); s.lineTo(.32, 0); s.lineTo(.05, .3); s.lineTo(.05, .16); s.lineTo(-.22, .16); s.closePath(); return new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2); })();
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff }), arrowEdge = new THREE.MeshBasicMaterial({ color: 0x1b1b1f });
export function car3d(len: number, color: string, arrow = false) {
  const g = new THREE.Group(), L = len * .92, body = mat(color, { roughness: .35, metalness: .15 });
  const lighter = mat(new THREE.Color(color).lerp(new THREE.Color('#ffffff'), .82), { roughness: .5 });
  const add = (m: THREE.Mesh, x: number, y: number, z = 0) => { m.position.set(x, y, z); g.add(m); return m; };
  add(mesh(new THREE.BoxGeometry(L - .1, .1, .7), dark), 0, .14);
  if (len >= 3) {
    add(mesh(new RoundedBoxGeometry(.86, .6, .78, 3, .1), body), L / 2 - .47, .5);
    add(mesh(new RoundedBoxGeometry(.08, .28, .64, 2, .03), glass), L / 2 - .07, .62);
    add(mesh(new RoundedBoxGeometry(.5, .24, .02, 2, .01), glass), L / 2 - .5, .62, .39);
    add(mesh(new RoundedBoxGeometry(.5, .24, .02, 2, .01), glass), L / 2 - .5, .62, -.39);
    add(mesh(new RoundedBoxGeometry(L - 1.02, .8, .82, 3, .07), lighter), -.47, .58);
    add(mesh(new THREE.BoxGeometry(L - 1.0, .1, .84), body), -.47, .48);
  } else {
    add(mesh(new RoundedBoxGeometry(L, .34, .8, 3, .12), body), 0, .3);
    const cw = len === 1 ? L * .62 : L * .5;
    add(mesh(new RoundedBoxGeometry(cw, .3, .68, 3, .1), glass), -L * .04, .58);
    add(mesh(new RoundedBoxGeometry(cw * .82, .07, .62, 2, .03), body), -L * .06, .74);
    add(mesh(new THREE.BoxGeometry(L * .22, .015, .5), mat(0xffffff, { transparent: true, opacity: .25 }), false), L * .3, .475);
  }
  for (const z of [.25, -.25]) {
    add(mesh(new THREE.BoxGeometry(.04, .08, .14), lamp, false), L / 2, .3, z);
    add(mesh(new THREE.BoxGeometry(.04, .08, .14), tail, false), -L / 2, .3, z);
  }
  const wx = len >= 3 ? [L / 2 - .45, -L / 2 + .35, -L / 2 + .8] : [L * .3, -L * .3];
  for (const x of wx) for (const z of [.4, -.4]) { add(mesh(wheelGeo, tyre), x, .16, z); add(mesh(hubGeo, hub, false), x, .16, z); }
  if (arrow) {
    const s = len === 1 ? .8 : 1.1, x = len >= 3 ? -.47 : -L * .06, y = len >= 3 ? .99 : .78;
    const e = new THREE.Mesh(arrowGeo, arrowEdge); e.position.set(x - .02, y, 0); e.scale.setScalar(s * 1.25); g.add(e);
    const a = new THREE.Mesh(arrowGeo, arrowMat); a.position.set(x, y + .004, 0); a.scale.setScalar(s); g.add(a);
  }
  return g;
}
