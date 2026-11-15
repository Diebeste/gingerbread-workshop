import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const $ = (s) => document.querySelector(s);
const UP = new V3(0, 1, 0), ZA = new V3(0, 0, 1), XA = new V3(1, 0, 0);
const r3 = (v) => Math.round(v * 1000) / 1000;
function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const newSeed = () => (Math.random() * 1e9) | 0;
const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ---------------- house dimensions ----------------
const W = 4, D = 5, H = 3, G = 1.8, T = 0.22, OV = 0.4;
const ALPHA = Math.atan2(G, W / 2), TAN = G / (W / 2);
const SLOPE = Math.hypot(W / 2, G), RL = SLOPE + OV, RZ = D / 2 + OV;
const BOARD = 11;
const STORE_KEY = 'gingerbread-house-v1';

// ---------------- renderer / scene ----------------
const stage = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 3.5; controls.maxDistance = 38; controls.maxPolarAngle = Math.PI * 0.48;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.autoRotateSpeed = 1.1;

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function canvasTex(c, { repeat, srgb = true, wrap = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = Math.min(8, MAX_ANISO);
  return t;
}

// ---------------- background ----------------
(function background() {
  const [c, g] = mkCanvas(1024, 1024);
  const gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, '#3a2116'); gr.addColorStop(0.55, '#2a170e'); gr.addColorStop(1, '#170c07');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  const rng = mulberry(7);
  const cols = ['255,196,110', '255,170,80', '255,120,90', '140,220,150', '255,230,170'];
  for (let i = 0; i < 70; i++) {
    const x = rng() * 1024, y = 60 + rng() * 520, r = 10 + rng() * 38, a = 0.08 + rng() * 0.22;
    const col = cols[(rng() * cols.length) | 0];
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${col},${a})`); rg.addColorStop(0.7, `rgba(${col},${a * 0.7})`); rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // string of lights
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 26; i++) {
      const x = i * 42 + (k ? 20 : 0), y = 120 + k * 150 + Math.sin(i * 0.5 + k) * 30;
      const col = cols[(i + k) % cols.length];
      const rg = g.createRadialGradient(x, y, 0, x, y, 16);
      rg.addColorStop(0, `rgba(${col},0.95)`); rg.addColorStop(0.3, `rgba(${col},0.45)`); rg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = rg; g.fillRect(x - 16, y - 16, 32, 32);
    }
  }
  scene.background = canvasTex(c);
  scene.fog = new THREE.Fog(0x24150c, 30, 70);
})();

// ---------------- lights ----------------
scene.add(new THREE.HemisphereLight(0xfff0d8, 0x3a2414, 1.0));
const sun = new THREE.DirectionalLight(0xffe0b0, 2.5);
sun.position.set(9, 17, 11);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xc8d8ff, 0.55); fill.position.set(-12, 9, -9); scene.add(fill);
const innerLight = new THREE.PointLight(0xffa24a, 0, 0, 1.4); innerLight.position.set(0, 1.4, 0); scene.add(innerLight);

// ---------------- procedural textures ----------------
function paintGinger(g, b, w, h, rng) {
  g.fillStyle = '#a9652d'; g.fillRect(0, 0, w, h);
  b.fillStyle = '#808080'; b.fillRect(0, 0, w, h);
  const n = Math.floor(w * h / 650);
  for (let i = 0; i < n; i++) {
    const x = rng() * w, y = rng() * h, r = 6 + rng() * 26, lt = rng() < 0.5;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, lt ? 'rgba(200,130,62,0.25)' : 'rgba(118,60,22,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    const gb = b.createRadialGradient(x, y, 0, x, y, r);
    gb.addColorStop(0, lt ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'); gb.addColorStop(1, 'rgba(128,128,128,0)');
    b.fillStyle = gb; b.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const s = Math.floor(w * h / 45);
  for (let i = 0; i < s; i++) {
    const x = rng() * w, y = rng() * h, d = rng(), sz = 0.8 + rng() * 1.8;
    if (d < 0.5) g.fillStyle = `rgba(84,40,12,${0.12 + rng() * 0.28})`;
    else if (d < 0.85) g.fillStyle = `rgba(214,150,84,${0.12 + rng() * 0.25})`;
    else g.fillStyle = 'rgba(60,24,6,0.5)';
    g.fillRect(x, y, sz, sz);
    if (d > 0.85) { b.fillStyle = 'rgba(0,0,0,0.55)'; b.fillRect(x - 0.5, y - 0.5, sz + 1, sz + 1); }
    else if (d > 0.6) { b.fillStyle = 'rgba(255,255,255,0.25)'; b.fillRect(x, y, sz, sz); }
  }
}
function tracePath(g, pts) { g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); }

function pieceMaterial(shape, pattern, seed) {
  const pts = shape.getPoints(32);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  minX -= 0.03; minY -= 0.03; maxX += 0.03; maxY += 0.03;
  const w = maxX - minX, h = maxY - minY, ppu = 110;
  const cw = Math.ceil(w * ppu), ch = Math.ceil(h * ppu);
  const [c, g] = mkCanvas(cw, ch); const [bc, b] = mkCanvas(cw, ch);
  const rng = mulberry(seed);
  paintGinger(g, b, cw, ch, rng);
  for (const ctx of [g, b]) ctx.setTransform(ppu, 0, 0, -ppu, -minX * ppu, maxY * ppu);
  // embossed patterns
  if (pattern === 'brick') {
    b.strokeStyle = 'rgba(40,40,40,0.35)'; b.lineWidth = 0.025;
    g.strokeStyle = 'rgba(110,55,20,0.18)'; g.lineWidth = 0.02;
    for (let y = 0.3, row = 0; y < maxY; y += 0.3, row++) {
      for (const ctx of [g, b]) { ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke(); }
      for (let x = minX + (row % 2 ? 0.25 : 0); x < maxX; x += 0.5) for (const ctx of [g, b]) { ctx.beginPath(); ctx.moveTo(x, y - 0.3); ctx.lineTo(x, y); ctx.stroke(); }
    }
  } else if (pattern === 'scallop') {
    b.lineWidth = 0.035; b.strokeStyle = 'rgba(30,30,30,0.5)';
    g.lineWidth = 0.03; g.strokeStyle = 'rgba(105,52,18,0.28)';
    for (let x = 0.32, row = 0; x < maxX; x += 0.36, row++) {
      for (let y = minY + (row % 2 ? 0.2 : 0); y < maxY + 0.2; y += 0.4) {
        for (const ctx of [g, b]) { ctx.beginPath(); ctx.arc(x, y, 0.2, -Math.PI / 2, Math.PI / 2, false); ctx.stroke(); }
      }
    }
  }
  // baked darker edges
  const outline = shape.getPoints(32), holes = shape.holes.map((hh) => hh.getPoints(24));
  const widths = [0.42, 0.3, 0.2, 0.12, 0.06];
  for (const wdt of widths) {
    g.lineWidth = wdt; g.strokeStyle = 'rgba(78,34,8,0.13)'; g.lineJoin = 'round';
    g.beginPath(); tracePath(g, outline); for (const hp of holes) tracePath(g, hp); g.stroke();
  }
  g.lineWidth = 0.05; g.strokeStyle = 'rgba(255,220,170,0.0)';
  const map = canvasTex(c), bump = canvasTex(bc, { srgb: false });
  for (const t of [map, bump]) { t.repeat.set(1 / w, 1 / h); t.offset.set(-minX / w, -minY / h); }
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.4, roughness: 0.82, metalness: 0 });
}

const genericGinger = (() => {
  const [c, g] = mkCanvas(512, 512); const [bc, b] = mkCanvas(512, 512);
  paintGinger(g, b, 512, 512, mulberry(99));
  const map = canvasTex(c, { wrap: true }), bump = canvasTex(bc, { wrap: true, srgb: false });
  const rep = 110 / 512;
  map.repeat.set(rep, rep); bump.repeat.set(rep, rep);
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.2, roughness: 0.8 });
})();

function noiseTex(size, seed, dots, bg = '#808080') {
  const [c, g] = mkCanvas(size, size); g.fillStyle = bg; g.fillRect(0, 0, size, size);
  const rng = mulberry(seed);
  for (let i = 0; i < dots; i++) { g.fillStyle = rng() < 0.5 ? `rgba(255,255,255,${rng() * 0.8})` : `rgba(0,0,0,${rng() * 0.5})`; const s = 1 + rng() * 2; g.fillRect(rng() * size, rng() * size, s, s); }
  return canvasTex(c, { wrap: true, srgb: false });
}
const sugarBump = noiseTex(128, 3, 1800); sugarBump.repeat.set(2, 2);
const snowBump = noiseTex(256, 5, 9000); snowBump.repeat.set(10, 10);

function woodTex() {
  const [c, g] = mkCanvas(1024, 1024); g.fillStyle = '#6a3d20'; g.fillRect(0, 0, 1024, 1024);
  const rng = mulberry(11);
  for (let p = 0; p < 8; p++) { g.fillStyle = p % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,200,150,0.04)'; g.fillRect(0, p * 128, 1024, 128); g.fillStyle = 'rgba(20,8,2,0.6)'; g.fillRect(0, p * 128, 1024, 2); }
  for (let i = 0; i < 700; i++) {
    const y = rng() * 1024, a = rng() * 0.18;
    g.strokeStyle = rng() < 0.6 ? `rgba(40,18,6,${a})` : `rgba(190,120,70,${a * 0.7})`;
    g.lineWidth = 0.5 + rng() * 2.5; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 * rng());
    g.stroke();
  }
  return canvasTex(c, { wrap: true, repeat: [7, 7] });
}

// ---------------- table, board, snow ----------------
const table = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.7 }));
table.position.y = -0.26; table.receiveShadow = true; scene.add(table);
const parchment = new THREE.Mesh(new THREE.PlaneGeometry(14.6, 13).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xefe3c8, roughness: 0.95 }));
parchment.position.set(0.3, -0.255, 12.35); parchment.receiveShadow = true; scene.add(parchment);
const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(BOARD, 0.25, BOARD), new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.75, roughness: 0.32 }));
boardMesh.position.y = -0.125; boardMesh.receiveShadow = true; boardMesh.castShadow = true; scene.add(boardMesh);
function snowHeight(x, z) {
  const e = Math.max(Math.abs(x), Math.abs(z)); const edge = Math.min(1, Math.max(0, (BOARD / 2 - 0.15 - e) / 0.5));
  const n = 0.035 + 0.022 * Math.sin(x * 1.3 + z * 0.7) + 0.016 * Math.sin(x * 3.1 - z * 2.3) + 0.01 * Math.sin(z * 5.7 + x * 0.4);
  return Math.max(0.005, n * edge + 0.004);
}
const snowGeo = new THREE.PlaneGeometry(BOARD - 0.2, BOARD - 0.2, 120, 120).rotateX(-Math.PI / 2);
{ const p = snowGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, snowHeight(p.getX(i), p.getZ(i))); snowGeo.computeVertexNormals(); }
const snowMesh = new THREE.Mesh(snowGeo, new THREE.MeshStandardMaterial({ color: 0xf5f8fc, roughness: 0.92, bumpMap: snowBump, bumpScale: 0.6 }));
snowMesh.receiveShadow = true; scene.add(snowMesh);

// ---------------- icing tube geometry ----------------
const ICING = { white: '#fbf8f1', red: '#d8343a', green: '#2f9a4c', pink: '#f59bc3', blue: '#5aa9e6' };
const matCache = {};
function icingMat(col) { return matCache['ic_' + col] || (matCache['ic_' + col] = new THREE.MeshStandardMaterial({ color: ICING[col] || col, roughness: 0.6, metalness: 0, bumpMap: sugarBump, bumpScale: 0.3 })); }
function tubeGeometry(points, radius, { lumpy = 1, radial = 8, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  const len = Math.max(curve.getLength(), 1e-4);
  const segs = Math.max(4, Math.min(1500, Math.ceil(len / (radius * 0.5))));
  const frames = curve.computeFrenetFrames(segs, closed);
  const pos = new Float32Array((segs + 1) * (radial + 1) * 3), nor = new Float32Array(pos.length), idx = [];
  const P = new V3(), N = new V3(); let k = 0;
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, P);
    const r = radius * (1 + lumpy * (0.11 * Math.sin(i * 0.8) + 0.06 * Math.sin(i * 2.1 + 1.3)));
    const n = frames.normals[i], b = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2, s = Math.sin(v), c = -Math.cos(v);
      N.set(c * n.x + s * b.x, c * n.y + s * b.y, c * n.z + s * b.z).normalize();
      pos[k] = P.x + r * N.x; nor[k++] = N.x; pos[k] = P.y + r * N.y; nor[k++] = N.y; pos[k] = P.z + r * N.z; nor[k++] = N.z;
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b2 = (i + 1) * (radial + 1) + j;
    idx.push(a, b2, a + 1, b2, b2 + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}
const capGeo = new THREE.SphereGeometry(1, 12, 8);
function icingLine(points, radius, col, opts = {}) {
  const grp = new THREE.Group();
  const m = new THREE.Mesh(tubeGeometry(points, radius, opts), icingMat(col)); m.castShadow = true; m.receiveShadow = true; grp.add(m);
  if (!opts.closed) for (const p of [points[0], points[points.length - 1]]) {
    const cap = new THREE.Mesh(capGeo, icingMat(col)); cap.scale.setScalar(radius * 0.97); cap.position.copy(p); cap.castShadow = true; grp.add(cap);
  }
  return grp;
}
function dollopGeo(R) {
  const pts = [[0, -0.1], [R, -0.1], [R, 0.05], [R * 0.95, R * 0.35], [R * 0.78, R * 0.7], [R * 0.5, R * 1.0], [R * 0.2, R * 1.25], [0.0, R * 1.38]].map(([x, y]) => new THREE.Vector2(x, y * (y < 0 ? R : 1)));
  return new THREE.LatheGeometry(pts, 20);
}

// ---------------- gingerbread pieces ----------------
function rectHole(x0, y0, x1, y1) { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.closePath(); return p; }
function paneWindow(cx, cy, w, h, gap) {
  const hw = (w - gap) / 2, hh = (h - gap) / 2;
  return [rectHole(cx - w / 2, cy - h / 2, cx - w / 2 + hw, cy - h / 2 + hh), rectHole(cx + gap / 2, cy - h / 2, cx + w / 2, cy - h / 2 + hh),
    rectHole(cx - w / 2, cy + gap / 2, cx - w / 2 + hw, cy + h / 2), rectHole(cx + gap / 2, cy + gap / 2, cx + w / 2, cy + h / 2)];
}
function circleHole(cx, cy, r) { const p = new THREE.Path(); p.absarc(cx, cy, r, 0, Math.PI * 2, false); return p; }
function gable(s) { s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(0, H + G); s.lineTo(-W / 2, H); s.closePath(); }
function frontShape() {
  const s = new THREE.Shape(), dw = 0.55, dh = 1.45;
  s.moveTo(-W / 2, 0); s.lineTo(-dw, 0); s.lineTo(-dw, dh); s.absarc(0, dh, dw, Math.PI, 0, true); s.lineTo(dw, 0); gable(s);
  s.holes.push(...paneWindow(-1.35, 1.75, 0.7, 0.8, 0.08), ...paneWindow(1.35, 1.75, 0.7, 0.8, 0.08), circleHole(0, H + 0.55, 0.3));
  return s;
}
function backShape() { const s = new THREE.Shape(); s.moveTo(-W / 2, 0); gable(s); s.holes.push(...paneWindow(0, 1.65, 0.95, 1.05, 0.08), circleHole(0, H + 0.55, 0.3)); return s; }
function sideShape() {
  const sw = (D - 2 * T) / 2, s = new THREE.Shape();
  s.moveTo(-sw, 0); s.lineTo(sw, 0); s.lineTo(sw, H); s.lineTo(-sw, H); s.closePath();
  s.holes.push(...paneWindow(-1.1, 1.65, 0.8, 0.9, 0.08), ...paneWindow(1.1, 1.65, 0.8, 0.9, 0.08));
  return s;
}
function roofShape() { const s = new THREE.Shape(); s.moveTo(0, -RZ); s.lineTo(RL, -RZ); s.lineTo(RL, RZ); s.lineTo(0, RZ); s.closePath(); return s; }
function chimneyShape() { const s = new THREE.Shape(), a = 0.3; s.moveTo(-a, a * TAN); s.lineTo(a, -a * TAN); s.lineTo(a, 1.25); s.lineTo(-a, 1.25); s.closePath(); return s; }
const EXT = (depth) => ({ depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 20 });

const qRoof = (side) => side > 0 ? new Q().setFromAxisAngle(ZA, -ALPHA) : new Q().setFromAxisAngle(UP, Math.PI).multiply(new Q().setFromAxisAngle(ZA, -ALPHA));
const RIDGE = new V3(0, H + G, 0);
const CHIM_S = 1.25, CHIM_Z = -1.0;
function roofLocalToWorld(side, x, y, z) { return new V3(x, y, z).applyQuaternion(qRoof(side)).add(RIDGE); }
const CHIM_POS = roofLocalToWorld(1, CHIM_S, T, CHIM_Z);
const qFlat = new Q().setFromAxisAngle(XA, -Math.PI / 2);

const PIECES = [
  { id: 'front', label: 'Front', shape: frontShape, pattern: 'brick', tp: [0, 0, D / 2 - T / 2], tq: new Q(), home: [-2.35, T / 2, 11.1], hq: qFlat },
  { id: 'back', label: 'Back', shape: backShape, pattern: 'brick', tp: [0, 0, -D / 2 + T / 2], tq: new Q().setFromAxisAngle(UP, Math.PI), home: [2.35, T / 2, 11.1], hq: qFlat },
  { id: 'left', label: 'Left side', shape: sideShape, pattern: 'brick', tp: [-W / 2 + T / 2, 0, 0], tq: new Q().setFromAxisAngle(UP, Math.PI / 2), home: [-2.55, T / 2, 14.6], hq: qFlat },
  { id: 'right', label: 'Right side', shape: sideShape, pattern: 'brick', tp: [W / 2 - T / 2, 0, 0], tq: new Q().setFromAxisAngle(UP, -Math.PI / 2), home: [2.55, T / 2, 14.6], hq: qFlat },
  { id: 'roofL', label: 'Roof (left)', roof: -1, shape: roofShape, pattern: 'scallop', tp: RIDGE.toArray(), tq: qRoof(-1), home: [-3.1, 0.02, 18.3], hq: new Q().setFromAxisAngle(UP, Math.PI / 2) },
  { id: 'roofR', label: 'Roof (right)', roof: 1, shape: roofShape, pattern: 'scallop', tp: RIDGE.toArray(), tq: qRoof(1), home: [3.1, 0.02, 18.3], hq: new Q().setFromAxisAngle(UP, Math.PI / 2) },
  { id: 'chimney', label: 'Chimney', optional: true, shape: chimneyShape, pattern: 'brick', tp: CHIM_POS.toArray(), tq: new Q(), home: [5.6, 0.32, 8.4], hq: qFlat },
];
const REQUIRED = PIECES.filter((p) => !p.optional).map((p) => p.id);
const WALLS = ['front', 'back', 'left', 'right'];

const houseGroup = new THREE.Group(); scene.add(houseGroup);
const seamGroup = new THREE.Group(); scene.add(seamGroup);
const pieces = {};
PIECES.forEach((def, i) => {
  const shape = def.shape();
  let geo;
  if (def.roof) { geo = new THREE.ExtrudeGeometry(shape, EXT(T - 0.04)); geo.translate(0, 0, 0.02); geo.rotateX(-Math.PI / 2); }
  else if (def.id === 'chimney') { geo = new THREE.ExtrudeGeometry(shape, EXT(0.56)); geo.translate(0, 0, -0.28); }
  else { geo = new THREE.ExtrudeGeometry(shape, EXT(T - 0.04)); geo.translate(0, 0, -(T - 0.04) / 2); }
  const mesh = new THREE.Mesh(geo, pieceMaterial(shape, def.pattern, 100 + i * 17));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.pieceId = def.id;
  houseGroup.add(mesh);
  pieces[def.id] = { def, mesh, placed: false, busy: false, seams: [], homeP: new V3(...def.home), homeQ: def.hq.clone(), tP: new V3(...def.tp), tQ: def.tq.clone() };
  mesh.position.copy(pieces[def.id].homeP); mesh.quaternion.copy(pieces[def.id].homeQ);
});
const isPlaced = (id) => pieces[id].placed;
const allBuilt = () => REQUIRED.every(isPlaced);

// drop targets for drag-to-snap: a translucent "ghost" where the piece belongs
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.25, depthWrite: false });
const targetGhost = new THREE.Mesh(undefined, ghostMat); targetGhost.visible = false; targetGhost.userData.noHit = true; scene.add(targetGhost);

function seamLines(id) {
  const y = 0.07, e = 0.035, L = [];
  const hz = D / 2 + e, hx = W / 2 + e;
  if (id === 'front') { L.push([[-W / 2, y, hz], [-0.62, y, hz]], [[0.62, y, hz], [W / 2, y, hz]]); }
  if (id === 'back') L.push([[-W / 2, y, -hz], [W / 2, y, -hz]]);
  if (id === 'left' || id === 'right') {
    const s = id === 'left' ? -1 : 1;
    L.push([[s * hx, y, -D / 2], [s * hx, y, D / 2]]);
    L.push([[s * (W / 2 + 0.02), 0.05, D / 2 + 0.02], [s * (W / 2 + 0.02), H - 0.05, D / 2 + 0.02]]);
    L.push([[s * (W / 2 + 0.02), 0.05, -D / 2 - 0.02], [s * (W / 2 + 0.02), H - 0.05, -D / 2 - 0.02]]);
  }
  if (id === 'roofL' || id === 'roofR') {
    const s = id === 'roofL' ? -1 : 1;
    for (const zz of [D / 2 + 0.04, -D / 2 - 0.04]) L.push([[0, H + G - 0.12, zz], [s * (W / 2 - 0.05), H - 0.02, zz]]);
    if (isPlaced('roofL') && isPlaced('roofR')) {
      const yr = H + G + T * Math.cos(ALPHA) - 0.01;
      L.push([[0, yr, -RZ + 0.02], [0, yr, RZ - 0.02]]);
    }
  }
  if (id === 'chimney') {
    const a = 0.33, c = CHIM_POS;
    return [[[c.x - a, c.y + a * TAN + 0.03, c.z - a], [c.x + a, c.y - a * TAN + 0.03, c.z - a], [c.x + a, c.y - a * TAN + 0.03, c.z + a], [c.x - a, c.y + a * TAN + 0.03, c.z + a]].map((p) => new V3(...p))].map((pts) => ({ pts, closed: true }));
  }
  return L.map(([a, b]) => {
    const A = new V3(...a), B = new V3(...b), n = Math.max(2, Math.ceil(A.distanceTo(B) / 0.4));
    const pts = []; for (let i = 0; i <= n; i++) pts.push(A.clone().lerp(B, i / n));
    return { pts, closed: false };
  });
}
function addSeams(id, animate) {
  for (const s of seamLines(id)) {
    const grp = icingLine(s.pts, id === 'chimney' ? 0.06 : 0.075, 'white', { closed: s.closed, lumpy: 1.4 });
    seamGroup.add(grp); pieces[id].seams.push(grp);
    if (animate) {
      const tube = grp.children[0], total = tube.geometry.index.count; let t = 0;
      grp.children.slice(1).forEach((c) => (c.visible = false));
      tube.geometry.setDrawRange(0, 0);
      tweens.push((dt) => { t += dt / 0.55; const k = Math.min(1, t); tube.geometry.setDrawRange(0, Math.floor(total * k / 6) * 6); if (k >= 1) { grp.children.forEach((c) => (c.visible = true)); return false; } return true; });
    }
  }
}
function removeSeams(id) { for (const s of pieces[id].seams) seamGroup.remove(s); pieces[id].seams = []; }

function updateInnerLight() { innerLight.intensity = WALLS.every(isPlaced) ? 9 : 0; }

// ---------------- candy models ----------------
const MATS = {};
const mat = (key, fn) => MATS[key] || (MATS[key] = fn());
const GEOS = {};
const geom = (key, fn) => GEOS[key] || (GEOS[key] = fn());
function mk(geo, m) { const o = new THREE.Mesh(geo, m); o.castShadow = true; o.receiveShadow = true; return o; }

const swirlTex = (() => {
  const [c, g] = mkCanvas(256, 256); g.fillStyle = '#fffefa'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#d61f2c';
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    g.beginPath(); g.moveTo(128, 128);
    g.quadraticCurveTo(128 + Math.cos(a + 0.5) * 80, 128 + Math.sin(a + 0.5) * 80, 128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128);
    g.arc(128, 128, 128, a, a + 0.38);
    g.quadraticCurveTo(128 + Math.cos(a + 0.75) * 70, 128 + Math.sin(a + 0.75) * 70, 128, 128);
    g.fill();
  }
  g.fillStyle = '#fffefa'; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill();
  return canvasTex(c);
})();
const stripeTex = (() => {
  const [c, g] = mkCanvas(128, 64); g.fillStyle = '#fffdf8'; g.fillRect(0, 0, 128, 64);
  for (const [col, w, off] of [['#d4202c', 26, 0], ['#2f9a4c', 7, 40]]) {
    g.fillStyle = col;
    for (let x = -128; x < 256; x += 128) { g.beginPath(); g.moveTo(x + off, 0); g.lineTo(x + off + w, 0); g.lineTo(x + off + w + 64, 64); g.lineTo(x + off + 64, 64); g.fill(); }
  }
  return canvasTex(c, { wrap: true, repeat: [9, 1] });
})();
const twistTex = (() => {
  const [c, g] = mkCanvas(64, 256); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 256);
  for (let y = -64; y < 320; y += 32) { const gr = g.createLinearGradient(0, y, 0, y + 32); gr.addColorStop(0, 'rgba(0,0,0,0.0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, y); g.lineTo(64, y + 32); g.lineTo(64, y + 64); g.lineTo(0, y + 32); g.fill(); }
  return canvasTex(c, { wrap: true, repeat: [3, 4] });
})();
const waferTex = (() => {
  const [c, g] = mkCanvas(128, 128); g.fillStyle = '#fff6e6'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i <= 128; i += 16) { g.fillStyle = 'rgba(120,70,30,0.32)'; g.fillRect(i - 1, 0, 3, 128); g.fillRect(0, i - 1, 128, 3); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(i + 2, 0, 1, 128); g.fillRect(0, i + 2, 128, 1); }
  g.strokeStyle = 'rgba(110,60,25,0.5)'; g.lineWidth = 6; g.strokeRect(0, 0, 128, 128);
  return canvasTex(c);
})();

const GUM = ['#e3342f', '#38a845', '#f6c026', '#f5821f', '#8e44ad', '#ef6fa8'];
const BTN = ['#d62f2f', '#f3c623', '#2f9a4c', '#2f6fd6', '#f07b1d', '#6b3b22'];
const WAFER = ['#e8c48c', '#e8c48c', '#f4b9c8', '#fff1d6', '#8a5a3a'];
const SPRINKLE = ['#e3342f', '#f6c026', '#38a845', '#2f6fd6', '#ef6fa8', '#ffffff', '#8e44ad', '#f5821f'];

function gumdrop(v) {
  const g = geom('gum', () => { const pts = [[0, 0], [0.2, 0], [0.225, 0.03], [0.215, 0.12], [0.18, 0.21], [0.12, 0.27], [0.05, 0.3], [0, 0.305]].map(([x, y]) => new THREE.Vector2(x, y)); return new THREE.LatheGeometry(pts, 28).rotateX(Math.PI / 2); });
  const m = mat('gum' + v, () => new THREE.MeshPhysicalMaterial({ color: GUM[v % GUM.length], roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.45, bumpMap: sugarBump, bumpScale: 3, emissive: GUM[v % GUM.length], emissiveIntensity: 0.08 }));
  const grp = new THREE.Group(); grp.add(mk(g, m)); return grp;
}
function peppermint() {
  const g = geom('pep', () => new THREE.CylinderGeometry(0.27, 0.27, 0.075, 40).rotateX(Math.PI / 2).translate(0, 0, 0.038));
  const side = mat('pepS', () => new THREE.MeshPhysicalMaterial({ color: '#fbf7f0', roughness: 0.3, clearcoat: 1 }));
  const top = mat('pepT', () => new THREE.MeshPhysicalMaterial({ map: swirlTex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
  const grp = new THREE.Group(); grp.add(mk(g, [side, top, top])); return grp;
}
function cane(mode) {
  const g = geom('cane', () => {
    const pts = []; for (let i = 0; i <= 6; i++) pts.push(new V3(0, -0.55 + (0.95 * i) / 6, 0));
    for (let i = 1; i <= 12; i++) { const a = Math.PI - (i / 12) * (Math.PI + 0.35); pts.push(new V3(0.18 + 0.18 * Math.cos(a), 0.4 + 0.18 * Math.sin(a), 0)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, 0.058, 14, false);
  });
  const m = mat('cane', () => new THREE.MeshPhysicalMaterial({ map: stripeTex, roughness: 0.28, clearcoat: 0.9 }));
  const o = mk(g, m); const grp = new THREE.Group(); grp.add(o);
  for (const end of [-0.55]) { const cap = mk(geom('caneCap', () => new THREE.SphereGeometry(0.058, 14, 10)), mat('caneW', () => new THREE.MeshPhysicalMaterial({ color: '#fffdf8', roughness: 0.3, clearcoat: 0.9 }))); cap.position.y = end; o.add(cap); }
  if (mode === 'stand') o.position.set(0, 0.47, 0); else o.position.set(-0.09, -0.02, 0.058);
  return grp;
}
function button(v) {
  const g = geom('btn', () => new THREE.SphereGeometry(0.125, 26, 14).scale(1, 1, 0.42).translate(0, 0, 0.048));
  const m = mat('btn' + v, () => new THREE.MeshPhysicalMaterial({ color: BTN[v % BTN.length], roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }));
  const grp = new THREE.Group(); grp.add(mk(g, m)); return grp;
}
function licorice(color) {
  const g = geom('lic', () => new THREE.CylinderGeometry(0.052, 0.052, 1.0, 16, 1).translate(0, 0, 0.052));
  const m = mat('lic' + color, () => new THREE.MeshPhysicalMaterial({ color, map: twistTex, bumpMap: twistTex, bumpScale: 2, roughness: 0.35, clearcoat: 0.7 }));
  const grp = new THREE.Group(); grp.add(mk(g, m)); return grp;
}
function marshmallow() {
  const g = geom('marsh', () => new THREE.CylinderGeometry(0.075, 0.075, 0.13, 20).rotateX(Math.PI / 2).translate(0, 0, 0.065));
  const m = mat('marsh', () => new THREE.MeshPhysicalMaterial({ color: '#fffaf2', roughness: 0.95, sheen: 1, sheenColor: new THREE.Color('#ffffff'), bumpMap: sugarBump, bumpScale: 1.5 }));
  const grp = new THREE.Group(); grp.add(mk(g, m)); return grp;
}
function stadium(x1, y1, x2, y2, r) {
  const s = new THREE.Shape(), a = Math.atan2(y2 - y1, x2 - x1);
  s.absarc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2, false); s.absarc(x1, y1, r, a + Math.PI / 2, a + 1.5 * Math.PI, false); s.closePath(); return s;
}
function gingerman(mode) {
  const g = geom('gman', () => {
    const head = new THREE.Shape(); head.absarc(0, 0.7, 0.17, 0, Math.PI * 2, false);
    const shapes = [head, stadium(0, 0.2, 0, 0.5, 0.165), stadium(-0.33, 0.37, 0, 0.47, 0.075), stadium(0.33, 0.37, 0, 0.47, 0.075), stadium(-0.17, -0.02, -0.05, 0.24, 0.08), stadium(0.17, -0.02, 0.05, 0.24, 0.08)];
    return mergeGeometries(shapes.map((s) => new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.016, bevelSegments: 2, curveSegments: 18 }).translate(0, 0, 0.016)));
  });
  const ice = icingMat('white');
  const inner = new THREE.Group(); inner.add(mk(g, genericGinger));
  const zf = 0.085;
  const dot = geom('gdot', () => new THREE.SphereGeometry(1, 10, 8));
  for (const x of [-0.06, 0.06]) { const e = mk(dot, ice); e.scale.set(0.024, 0.024, 0.014); e.position.set(x, 0.74, zf); inner.add(e); }
  const smile = []; for (let i = 0; i <= 8; i++) { const a = Math.PI * 1.15 + (i / 8) * Math.PI * 0.7; smile.push(new V3(Math.cos(a) * 0.075, 0.69 + Math.sin(a) * 0.075, zf - 0.005)); }
  inner.add(icingLine(smile, 0.011, 'white', { lumpy: 0.3, radial: 6 }));
  [['red', 0.43], ['green', 0.33], ['red', 0.23]].forEach(([c, y]) => { const b = mk(dot, icingMat(c)); b.scale.set(0.03, 0.03, 0.02); b.position.set(0, y, zf); inner.add(b); });
  const zig = (x0, y0, x1, y1) => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new V3(x0 + (x1 - x0) * t + (i % 2 ? 0.02 : -0.02) * (y1 !== y0 ? 1 : 0), y0 + (y1 - y0) * t + (i % 2 ? 0.025 : -0.025) * (y1 === y0 ? 1 : 0.3), zf - 0.01)); } return icingLine(pts, 0.01, 'white', { lumpy: 0.2, radial: 6 }); };
  inner.add(zig(-0.27, 0.35, -0.27, 0.48), zig(0.27, 0.35, 0.27, 0.48), zig(-0.21, 0.02, -0.09, 0.02), zig(0.09, 0.02, 0.21, 0.02));
  if (mode === 'stand') inner.position.set(0, 0.1, -0.04); else inner.position.set(0, -0.37, 0);
  const grp = new THREE.Group(); grp.add(inner); return grp;
}
function wafer(v) {
  const g = geom('waf', () => new THREE.BoxGeometry(0.44, 0.3, 0.035).translate(0, 0, 0.018));
  const m = mat('waf' + v, () => new THREE.MeshStandardMaterial({ map: waferTex, color: WAFER[v % WAFER.length], roughness: 0.8 }));
  const grp = new THREE.Group(); grp.add(mk(g, m)); return grp;
}
function tree(v) {
  const rng = mulberry(500 + v);
  const green = mat('tree', () => new THREE.MeshPhysicalMaterial({ color: '#2f7d4c', roughness: 0.65, sheen: 0.6, sheenColor: new THREE.Color('#a6f0b8'), bumpMap: sugarBump, bumpScale: 2 }));
  const grp = new THREE.Group();
  [[0.56, 0.72, 0.58], [0.44, 0.62, 0.98], [0.31, 0.52, 1.34]].forEach(([r, h, y]) => { const c = mk(geom('cone' + r, () => new THREE.ConeGeometry(r, h, 22)), green); c.position.y = y; grp.add(c); });
  const trunk = mk(geom('trunk', () => new THREE.CylinderGeometry(0.08, 0.1, 0.26, 10)), genericGinger); trunk.position.y = 0.13; grp.add(trunk);
  const garland = []; for (let i = 0; i <= 40; i++) { const t = i / 40, y = 0.3 + t * 1.25, r = 0.58 * (1 - t) + 0.08; const a = t * Math.PI * 5; garland.push(new V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
  grp.add(icingLine(garland, 0.028, 'white', { lumpy: 0.8 }));
  const orn = geom('orn', () => new THREE.SphereGeometry(0.045, 12, 8));
  for (let i = 0; i < 9; i++) { const t = rng() * 0.85, y = 0.3 + t * 1.25, r = 0.58 * (1 - t) + 0.05, a = rng() * Math.PI * 2; const o = mk(orn, button(i % 6).children[0].material); o.position.set(Math.cos(a) * r, y, Math.sin(a) * r); grp.add(o); }
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.06 : 0.14; i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const st = mk(geom('star', () => new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02)), mat('star', () => new THREE.MeshPhysicalMaterial({ color: '#f6c026', roughness: 0.25, clearcoat: 1, emissive: '#f6a000', emissiveIntensity: 0.35 })));
  st.position.y = 1.66; grp.add(st);
  grp.scale.setScalar(0.85 + (v % 4) * 0.12);
  return grp;
}
function fence() {
  const m = mat('pretzel', () => new THREE.MeshPhysicalMaterial({ color: '#7d3f12', roughness: 0.4, clearcoat: 0.6, bumpMap: sugarBump, bumpScale: 2 }));
  const grp = new THREE.Group();
  for (const x of [-0.5, 0, 0.5]) { const p = mk(geom('post', () => new THREE.CylinderGeometry(0.036, 0.036, 0.6, 10)), m); p.position.set(x, 0.27, 0); grp.add(p); }
  for (const y of [0.18, 0.42]) { const r = mk(geom('rail', () => new THREE.CylinderGeometry(0.03, 0.03, 1.1, 10).rotateZ(Math.PI / 2)), m); r.position.set(0, y, 0.04); grp.add(r); }
  const salt = mat('salt', () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })); const sg = geom('salt', () => new THREE.BoxGeometry(0.018, 0.018, 0.018));
  const rng = mulberry(4); for (let i = 0; i < 24; i++) { const s = mk(sg, salt); const onRail = i % 2; if (onRail) s.position.set(-0.5 + rng(), i % 4 ? 0.21 : 0.45, 0.07); else s.position.set([-0.5, 0, 0.5][i % 3] + 0.03, 0.05 + rng() * 0.45, 0.03); s.rotation.set(rng() * 3, rng() * 3, 0); grp.add(s); }
  return grp;
}

const KINDS = {
  gumdrop: { label: 'Gumdrops', mode: 'flat', variants: GUM.length, build: (m, v) => gumdrop(v) },
  peppermint: { label: 'Peppermints', mode: 'flat', variants: 1, build: () => peppermint() },
  cane: { label: 'Candy canes', mode: 'auto', variants: 1, build: (m) => cane(m) },
  button: { label: 'Candy buttons', mode: 'flat', variants: BTN.length, build: (m, v) => button(v) },
  licRed: { label: 'Red licorice', mode: 'flat', variants: 1, build: () => licorice('#b3121b') },
  licBlack: { label: 'Black licorice', mode: 'flat', variants: 1, build: () => licorice('#262020') },
  marsh: { label: 'Mini marsh­mallows', mode: 'flat', variants: 1, build: () => marshmallow() },
  gingerman: { label: 'Ginger­bread man', mode: 'auto', variants: 1, build: (m) => gingerman(m) },
  wafer: { label: 'Wafer tiles', mode: 'flat', variants: WAFER.length, build: (m, v) => wafer(v) },
  tree: { label: 'Trees', mode: 'stand', ground: true, variants: 4, build: (m, v) => tree(v) },
  fence: { label: 'Pretzel fence', mode: 'stand', ground: true, variants: 1, build: () => fence() },
  sprinkles: { label: 'Sprinkles', scatter: true },
  sugar: { label: 'Sugar snow', scatter: true },
};

// ---------------- decorations (data -> 3D) ----------------
const decorGroup = new THREE.Group(); scene.add(decorGroup);
const tempGroup = new THREE.Group(); scene.add(tempGroup);
const sprGeo = new THREE.IcosahedronGeometry(0.024, 1);
const sugarGeo = new THREE.IcosahedronGeometry(0.04, 0);
const sprMat = new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6 });
const sugarMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.08 });
const _m4 = new THREE.Matrix4(), _q = new Q(), _s = new V3(), _p = new V3(), _c = new THREE.Color();

function scatterMesh(kind, cap) {
  const im = new THREE.InstancedMesh(kind === 'sugar' ? sugarGeo : sprGeo, kind === 'sugar' ? sugarMat : sprMat, cap);
  im.count = 0; im.castShadow = kind !== 'sugar'; im.receiveShadow = true;
  if (kind !== 'sugar') im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
  return im;
}
function setScatterInstance(im, kind, i, p, rng, colorIdx) {
  if (kind === 'sugar') { _q.setFromAxisAngle(UP, rng() * 6.28); const s = 0.5 + rng() * 0.9; _s.set(s, s * 0.35, s); }
  else { _q.setFromEuler(new THREE.Euler(rng() * 6, rng() * 6, 0)); _s.setScalar(0.8 + rng() * 0.4); im.setColorAt(i, _c.set(SPRINKLE[colorIdx % SPRINKLE.length])); }
  _m4.compose(_p.set(p[0], p[1], p[2]), _q, _s); im.setMatrixAt(i, _m4);
}
function buildScatter(data) {
  const n = data.pts.length / 3, im = scatterMesh(data.k, Math.max(1, n)), rng = mulberry(data.seed);
  for (let i = 0; i < n; i++) setScatterInstance(im, data.k, i, [data.pts[i * 3], data.pts[i * 3 + 1], data.pts[i * 3 + 2]], rng, data.cols ? data.cols[i] : 0);
  im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}
function roofMatrix(side) { return new THREE.Matrix4().compose(RIDGE, qRoof(side), new V3(1, 1, 1)); }
function buildShingles(data) {
  const rng = mulberry(data.seed), grp = new THREE.Group();
  const tiles = [];
  for (const side of [-1, 1]) {
    const RM = roofMatrix(side);
    for (let row = 0, x = RL - 0.15; x > 0.14; row++, x -= 0.27) {
      for (let z = -RZ + 0.2 + (row % 2) * 0.22; z < RZ - 0.15; z += 0.44) {
        if (side > 0 && isPlaced('chimney') && Math.abs(x - CHIM_S) < 0.5 && Math.abs(z - CHIM_Z) < 0.45) continue;
        const local = new THREE.Matrix4().compose(new V3(x, T + 0.038, z), new Q().setFromEuler(new THREE.Euler(0, (rng() - 0.5) * 0.08, 0.1)), new V3(1, 1, 1));
        tiles.push([RM.clone().multiply(local), WAFER[(rng() * WAFER.length) | 0]]);
      }
    }
  }
  const im = new THREE.InstancedMesh(geom('shingle', () => new THREE.BoxGeometry(0.33, 0.035, 0.42)), mat('shingleM', () => new THREE.MeshStandardMaterial({ map: waferTex, roughness: 0.8 })), tiles.length);
  tiles.forEach(([m, c], i) => { im.setMatrixAt(i, m); im.setColorAt(i, _c.set(c)); });
  im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
  grp.add(im); return grp;
}
function buildDrips(data) {
  const rng = mulberry(data.seed), geos = [];
  for (const side of [-1, 1]) {
    const edges = [[[RL + 0.02, -RZ], [RL + 0.02, RZ]], [[0.05, RZ + 0.02], [RL, RZ + 0.02]], [[0.05, -RZ - 0.02], [RL, -RZ - 0.02]]];
    for (const [[x0, z0], [x1, z1]] of edges) {
      const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 0.3), pts = [];
      for (let i = 0; i <= n; i++) pts.push(roofLocalToWorld(side, x0 + (x1 - x0) * i / n, T * 0.75, z0 + (z1 - z0) * i / n));
      geos.push(tubeGeometry(pts, 0.075, { lumpy: 1.6 }));
      const m = Math.floor(len / 0.11);
      for (let i = 0; i <= m; i++) {
        if (rng() < 0.28) continue;
        const t = (i + rng() * 0.4) / m, p = roofLocalToWorld(side, x0 + (x1 - x0) * t, 0.02, z0 + (z1 - z0) * t);
        const L = 0.08 + Math.pow(rng(), 2.2) * 0.45, r = 0.045 + rng() * 0.025;
        const prof = [[0, 0.04], [r, 0.0], [r * 0.85, -L * 0.35], [r * 0.5, -L * 0.75], [r * 0.3, -L * 0.95], [0, -L]].map(([a, b]) => new THREE.Vector2(a, b));
        const g = new THREE.LatheGeometry(prof, 8); g.deleteAttribute('uv'); g.translate(p.x, p.y, p.z);
        geos.push(g.index ? g : g);
      }
    }
  }
  const merged = mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
  const m = mk(merged, icingMat(data.col || 'white'));
  const grp = new THREE.Group(); grp.add(m); return grp;
}

function candyQuat(n, mode, rot) {
  const m = new THREE.Matrix4();
  if (mode === 'stand') {
    const z = camera.position.clone().sub(controls.target); z.y = 0; if (z.lengthSq() < 1e-4) z.set(0, 0, 1); z.normalize();
    m.makeBasis(new V3().crossVectors(UP, z), UP, z);
  } else {
    const Z = n.clone().normalize();
    let Y = UP.clone().sub(Z.clone().multiplyScalar(Z.dot(UP)));
    if (Y.lengthSq() < 0.05) { Y = controls.target.clone().sub(camera.position); Y.sub(Z.clone().multiplyScalar(Y.dot(Z))); if (Y.lengthSq() < 1e-4) Y.set(0, 0, -1); }
    Y.normalize();
    m.makeBasis(new V3().crossVectors(Y, Z), Y, Z);
  }
  return new Q().setFromRotationMatrix(m);
}
function applyCandy(obj, d) {
  obj.position.fromArray(d.p);
  obj.quaternion.fromArray(d.q).multiply(new Q().setFromAxisAngle(d.m === 'stand' ? UP : ZA, d.r || 0));
}
function createDecoration(d) {
  let obj;
  switch (d.t) {
    case 'candy': obj = KINDS[d.k].build(d.m, d.v || 0); applyCandy(obj, d); break;
    case 'line': { const pts = []; for (let i = 0; i < d.pts.length; i += 3) pts.push(new V3(d.pts[i], d.pts[i + 1], d.pts[i + 2])); obj = icingLine(pts, d.rad, d.col); break; }
    case 'dot': { obj = new THREE.Group(); const m = mk(geom('dollop' + d.rad, () => dollopGeo(d.rad)), icingMat(d.col)); obj.add(m); obj.position.fromArray(d.p); obj.quaternion.setFromUnitVectors(UP, new V3(...d.n).normalize()); break; }
    case 'scatter': obj = new THREE.Group(); obj.add(buildScatter(d)); break;
    case 'shingles': obj = buildShingles(d); break;
    case 'drips': obj = buildDrips(d); break;
  }
  obj.userData.data = d;
  return obj;
}

// ---------------- undo / redo / save ----------------
const undoStack = [], redoStack = [];
function commit(action) { action.do(); undoStack.push(action); if (undoStack.length > 300) undoStack.shift(); redoStack.length = 0; afterChange(); }
function undo() { const a = undoStack.pop(); if (!a) return; a.undo(); redoStack.push(a); sfx.tick(); afterChange(); }
function redo() { const a = redoStack.pop(); if (!a) return; a.do(); undoStack.push(a); sfx.tick(); afterChange(); }
function addAction(obj) { return { do() { decorGroup.add(obj); }, undo() { decorGroup.remove(obj); if (selected === obj) select(null); } }; }
function removeAction(obj) { return { do() { decorGroup.remove(obj); if (selected === obj) select(null); }, undo() { decorGroup.add(obj); } }; }
function changeAction(obj, before, after) { return { do() { obj.userData.data = after; applyCandy(obj, after); refreshSel(); }, undo() { obj.userData.data = before; applyCandy(obj, before); refreshSel(); } }; }
let saveTimer = 0;
function afterChange() { updateActionButtons(); clearTimeout(saveTimer); saveTimer = setTimeout(save, 250); }
function getState() {
  return { v: 1, app: 'gingerbread-workshop', name: $('#name').value, phase, placed: PIECES.filter((p) => pieces[p.id].placed).map((p) => p.id), decor: decorGroup.children.map((o) => o.userData.data) };
}
function save() {
  const state = { ...getState(), muted: sfx.muted };
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); }
}
function load() {
  let s; try { s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { s = null; }
  return s && s.v === 1 ? s : null;
}

// ---------------- sound (WebAudio, generated) ----------------
const sfx = {
  ctx: null, muted: false, noiseBuf: null, squishNode: null,
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, len); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; } catch { return; } }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; },
  tone(f0, f1, dur, vol, type = 'sine', delay = 0) {
    if (!this.ok()) return; const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, freq, vol, type = 'bandpass', q = 1, delay = 0) {
    if (!this.ok()) return null; const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); if (dur) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(c.destination); s.start(t); if (dur) s.stop(t + dur + 0.05);
    return { s, g, f };
  },
  thunk() { this.tone(170, 55, 0.22, 0.5); this.noise(0.08, 500, 0.25, 'lowpass'); },
  pop() { const p = 500 + Math.random() * 300; this.tone(p, p * 1.7, 0.08, 0.22, 'sine'); },
  tick() { this.tone(1800, 1400, 0.04, 0.08, 'triangle'); },
  shake() { this.noise(0.12, 5000, 0.07, 'highpass'); },
  sprinkle() { for (let i = 0; i < 3; i++) this.tone(2400 + Math.random() * 1800, 2000, 0.03, 0.04, 'triangle', i * 0.03); },
  chime() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.9, 0.16, 'sine', i * 0.12)); },
  shutter() { this.noise(0.05, 3000, 0.3, 'bandpass', 0.7); this.noise(0.06, 2000, 0.25, 'bandpass', 0.7, 0.09); },
  squishStart() { if (this.squishNode || !this.ok()) return; this.squishNode = this.noise(0, 700, 0.05, 'bandpass', 2.5); },
  squishMod(speed) { if (this.squishNode) this.squishNode.f.frequency.setTargetAtTime(500 + Math.min(speed, 40) * 25, this.ctx.currentTime, 0.05); },
  squishStop() { if (!this.squishNode) return; const { s, g } = this.squishNode, t = this.ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0.0001, t, 0.04); s.stop(t + 0.2); this.squishNode = null; },
};

// ---------------- UI state ----------------
let phase = 'build';
let tool = 'pipe';          // ice: pipe|look ; decorate: select|look|<kind>
let tip = 'medium', icingColor = 'white';
let selected = null, selBox = null;
const tweens = [];
const TIPS = { thin: { line: 0.03, dot: 0.06 }, medium: { line: 0.05, dot: 0.1 }, thick: { line: 0.085, dot: 0.15 } };
const nextVariant = {};
const reroll = (k) => { nextVariant[k] = ((Math.random() * (KINDS[k].variants || 1)) | 0); };
Object.keys(KINDS).forEach(reroll);

let toastTimer = 0;
function toast(msg, ms = 2200, progressMs = 0) {
  const el = $('#toast'), bar = $('#toast-bar');
  $('#toast-text').textContent = msg; el.classList.add('show');
  bar.style.transition = 'none'; bar.style.width = '0';
  if (progressMs) { requestAnimationFrame(() => { bar.style.transition = `width ${progressMs}ms linear`; bar.style.width = '100%'; }); }
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
function modal(html, buttons) {
  $('#modal-body').innerHTML = html; const bb = $('#modal-buttons'); bb.innerHTML = '';
  for (const b of buttons) { const el = document.createElement(b.href ? 'a' : 'button'); el.textContent = b.label; if (b.cls) el.className = b.cls; if (b.href) { el.href = b.href; el.download = b.download; } el.onclick = () => { if (b.onClick) b.onClick(); if (!b.keep) $('#modal').hidden = true; }; bb.appendChild(el); }
  $('#modal').hidden = false;
}

const GUIDE = {
  build: ['Step 1 · Build the house', 'Drag each gingerbread piece from the parchment onto the board and let go — it stands up and gets glued with a seam of icing. Walls first, then the two roof panels, then the chimney (optional). Tap a piece to place it straight away.'],
  ice: ['Step 2 · Pipe the icing', 'Pick a tip and a colour, then drag across the house to pipe a raised line. Tap for a dot. Outline the windows, door and roof edges — or add snowy icicles to the roof.'],
  decorate: ['Step 3 · Decorate', 'Drag candy from the tray onto the house or yard — it sticks where you drop it. Tap a candy to stamp it again and again. Use Select to move, turn or delete pieces.'],
  finish: ['Step 4 · Show it off', 'Add your name at the top, spin it around, then take a photo to share with everyone.'],
};
const ORDER = ['build', 'ice', 'decorate', 'finish'];

function renderGuide() {
  const [title, text] = GUIDE[phase];
  $('#guide-title').textContent = title; $('#guide-text').textContent = text;
  const prog = $('#guide-progress'); prog.innerHTML = '';
  $('#autobuild').hidden = phase !== 'build' || allBuilt();
  if (phase === 'build') for (const p of PIECES) { const c = document.createElement('span'); c.className = 'chip' + (pieces[p.id].placed ? ' ok' : ''); c.textContent = p.label + (p.optional ? ' (opt.)' : ''); prog.appendChild(c); }
  const next = $('#next');
  const label = { build: 'Next: Ice it ➜', ice: 'Next: Decorate ➜', decorate: 'Finish ➜', finish: '📷 Take photo' }[phase];
  next.textContent = phase === 'build' && !allBuilt() ? `Place ${REQUIRED.filter((i) => !isPlaced(i)).length} more piece(s)…` : label;
  next.disabled = phase === 'build' && !allBuilt();
  document.querySelectorAll('#steps li').forEach((li) => {
    const s = li.dataset.step, i = ORDER.indexOf(s);
    li.classList.toggle('active', s === phase); li.classList.toggle('done', i < ORDER.indexOf(phase));
    li.classList.toggle('locked', s !== 'build' && !allBuilt());
  });
  document.body.classList.toggle('finish', phase === 'finish');
}

let thumbs = {};
function renderPanel() {
  const p = $('#panel'); p.innerHTML = '';
  p.hidden = phase === 'build';
  if (phase === 'build') { /* build tools live in the guide card */ } else if (phase === 'ice') {
    p.innerHTML = `<h3>🎂 Piping bag</h3>
      <div class="row"><button class="tool" data-tool="pipe">✍️ Pipe</button><button class="tool" data-tool="look">✋ Look around</button></div>
      <h4>Tip size</h4><div class="seg" id="tips">${Object.keys(TIPS).map((t) => `<button data-tip="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      <h4>Icing colour</h4><div class="row" id="colors">${Object.entries(ICING).map(([k, c]) => `<button class="sw" data-col="${k}" title="${k}" style="background:${c}"></button>`).join('')}</div>
      <h4>Snowy roof</h4><button class="secondary" id="drips" style="width:100%">❄️ Add icicle drips to roof edges</button>
      <p class="note">Drag = line · tap = dot · Ctrl+Z undoes.</p>`;
    p.querySelectorAll('[data-tip]').forEach((b) => (b.onclick = () => { tip = b.dataset.tip; renderPanelState(); }));
    p.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => { icingColor = b.dataset.col; renderPanelState(); }));
    $('#drips').onclick = () => { sfx.squishStart(); setTimeout(() => sfx.squishStop(), 350); commit(addAction(createDecoration({ t: 'drips', seed: newSeed(), col: icingColor }))); toast('Icicles piped along the roof ❄️'); };
  } else if (phase === 'decorate') {
    p.innerHTML = `<h3>🍬 Candy tray</h3>
      <div class="row" style="margin-bottom:8px"><button class="tool" data-tool="select">👆 Select / move</button><button class="tool" data-tool="look">✋ Look</button></div>
      <div class="tray">${Object.entries(KINDS).map(([k, d]) => `<button class="candy" data-kind="${k}" title="${d.label}"><img alt="" src="${thumbs[k] || ''}">${d.label}</button>`).join('')}</div>
      <h4>Roof</h4><button class="secondary" id="shingle" style="width:100%">🧇 Shingle the whole roof with wafers</button>
      <p class="note">Drag candy onto the house, or tap it then click to stamp. Sprinkles and sugar snow scatter as you drag. Trees and fences go in the yard.</p>`;
    p.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('pointerdown', (e) => trayDown(e, b.dataset.kind)));
    $('#shingle').onclick = () => { commit(addAction(createDecoration({ t: 'shingles', seed: newSeed() }))); sfx.pop(); toast('Wafer shingles laid 🧇'); };
  } else {
    p.innerHTML = `<h3>🎉 All done!</h3>
      <button class="primary" id="photo2">📷 Take photo</button>
      <h4>Show</h4><div class="row"><button class="tool" id="spin">🔄 Turntable</button><button class="tool" id="snowt">❄️ Snowfall</button></div>
      <h4>Keep going</h4><button class="secondary" id="backdec" style="width:100%">🍬 Back to decorating</button>
      <p class="note">Your house is saved in this browser automatically — come back any time.</p>`;
    $('#photo2').onclick = takePhoto;
    $('#spin').onclick = () => { controls.autoRotate = !controls.autoRotate; renderPanelState(); };
    $('#snowt').onclick = () => { snow.visible = !snow.visible; renderPanelState(); };
    $('#backdec').onclick = () => setPhase('decorate');
  }
  p.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => { tool = b.dataset.tool; if (tool !== 'select') select(null); renderPanelState(); }));
  renderPanelState();
}
function renderPanelState() {
  const p = $('#panel');
  p.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
  p.querySelectorAll('[data-tip]').forEach((b) => b.classList.toggle('on', b.dataset.tip === tip));
  p.querySelectorAll('[data-col]').forEach((b) => b.classList.toggle('on', b.dataset.col === icingColor));
  p.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b.dataset.kind === tool));
  const spin = $('#spin'); if (spin) spin.classList.toggle('on', controls.autoRotate);
  const sn = $('#snowt'); if (sn) sn.classList.toggle('on', snow.visible);
  updateCursor(); hideGhost();
}
function updateActionButtons() {
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length;
  const rot = selected && selected.userData.data.t === 'candy';
  $('#rotl').disabled = $('#rotr').disabled = !rot; $('#del').disabled = !selected;
}
function updateCursor() {
  let c = 'grab';
  if (phase === 'ice' && tool === 'pipe') c = 'crosshair';
  if (phase === 'decorate' && KINDS[tool]) c = 'copy';
  if (phase === 'decorate' && tool === 'select') c = 'pointer';
  renderer.domElement.style.cursor = c;
}

function setPhase(p) {
  if (p !== 'build' && !allBuilt()) { toast('Finish building the house first (or use “Build it for me”)'); return; }
  const prev = phase; phase = p;
  if (p === 'ice') tool = 'pipe';
  if (p === 'decorate' && !(tool === 'select' || KINDS[tool])) tool = 'gumdrop';
  if (p !== 'decorate') select(null);
  controls.autoRotate = p === 'finish';
  snow.visible = p === 'finish';
  if (p === 'finish') { sfx.chime(); updateNameCard(); }
  if (prev === 'build' && p !== 'build') flyTo(...houseView());
  renderGuide(); renderPanel(); afterChange(); applyViewOffset();
}
function houseView() { const a = camera.aspect, k = a < 1 ? Math.min(2.4, 1.3 / a) : 1; return [new V3(7.2 * k, 6.4 * k, 10.5 * k), new V3(0, 2.1, 0)]; }
function buildView() { const a = camera.aspect, k = a < 1 ? Math.min(2.2, 1.25 / a) : a < 1.4 ? 1.15 : 1; return [new V3(0, 24 * k, 18.5 + 11 * k), new V3(0, 0, 8.4)]; }
function flyTo(pos, target, dur = 1.3) {
  const p0 = camera.position.clone(), t0 = controls.target.clone(); let t = 0;
  tweens.push((dt) => { t = Math.min(1, t + dt / dur); const k = ease(t); camera.position.lerpVectors(p0, pos, k); controls.target.lerpVectors(t0, target, k); return t < 1; });
}
function updateNameCard() {
  const n = $('#name').value.trim();
  document.querySelector('.nc-title').textContent = n ? `${n}'s Gingerbread House` : 'My Gingerbread House';
  document.querySelector('.nc-date').textContent = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

// ---------------- raycasting helpers ----------------
const raycaster = new THREE.Raycaster(), ray2 = new THREE.Raycaster(), ndc = new THREE.Vector2();
function setRay(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera); }
function surfaces() { const a = [snowMesh, boardMesh, seamGroup, decorGroup]; for (const id in pieces) if (pieces[id].placed) a.push(pieces[id].mesh); return a; }
function isUnder(o, root) { while (o) { if (o === root) return true; o = o.parent; } return false; }
function firstHit(rc, exclude) {
  for (const h of rc.intersectObjects(surfaces(), true)) {
    if (exclude && isUnder(h.object, exclude)) continue;
    if (!h.face || h.object.userData.noHit) continue;
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (n.dot(rc.ray.direction) > 0) n.negate();
    return { point: h.point.clone(), normal: n, object: h.object };
  }
  return null;
}
function hitSurface(e, exclude) { setRay(e); return firstHit(raycaster, exclude); }
const overCanvas = (e) => document.elementFromPoint(e.clientX, e.clientY) === renderer.domElement;

// ---------------- assembly ----------------
function canPlace(id) {
  if (pieces[id].def.roof && !WALLS.every(isPlaced)) return 'Stand up all four walls first — the roof needs something to rest on!';
  if (id === 'chimney' && !isPlaced('roofR')) return 'The chimney sits on the right‑hand roof panel — put that on first.';
  return null;
}
function placeInstant(id) {
  const pc = pieces[id]; pc.mesh.position.copy(pc.tP); pc.mesh.quaternion.copy(pc.tQ); pc.placed = true; addSeams(id, false); updateInnerLight();
}
function sendHome(id) {
  const pc = pieces[id], p0 = pc.mesh.position.clone(), q0 = pc.mesh.quaternion.clone(); let t = 0; pc.busy = true;
  tweens.push((dt) => { t = Math.min(1, t + dt / 0.5); const k = ease(t); pc.mesh.position.lerpVectors(p0, pc.homeP, k); pc.mesh.quaternion.slerpQuaternions(q0, pc.homeQ, k); if (t >= 1) { pc.busy = false; return false; } return true; });
}
function snapPiece(id, force = false) {
  const pc = pieces[id]; if (pc.placed) return true;
  const why = force ? null : canPlace(id);
  if (why) { toast(why, 2600); sendHome(id); return false; }
  pc.busy = true;
  const mesh = pc.mesh, p0 = mesh.position.clone(), q0 = mesh.quaternion.clone(); let t = 0;
  const wobAxis = pc.def.roof ? XA : XA;
  tweens.push((dt) => {
    t = Math.min(1, t + dt / 0.75); const k = ease(t);
    mesh.position.lerpVectors(p0, pc.tP, k); mesh.position.y += Math.sin(Math.PI * k) * 1.6;
    mesh.quaternion.slerpQuaternions(q0, pc.tQ, k);
    if (t < 1) return true;
    pc.placed = true; sfx.thunk(); addSeams(id, true); updateInnerLight(); renderGuide();
    toast('Hold steady… the icing is setting', 1700, 1500);
    let w = 0;
    tweens.push((dt2) => {
      w += dt2; const a = 0.06 * Math.exp(-w * 2.4) * Math.sin(w * 15);
      mesh.quaternion.copy(pc.tQ).multiply(new Q().setFromAxisAngle(wobAxis, a));
      if (w < 1.5) return true;
      mesh.quaternion.copy(pc.tQ); pc.busy = false;
      if (allBuilt() && !window.__builtAnnounced) { window.__builtAnnounced = true; sfx.chime(); toast('🎉 Your house is standing! Press “Next” to start icing.', 3500); }
      else toast('Set! ✓', 900);
      afterChange(); return false;
    });
    return false;
  });
  return true;
}
function autoBuild() {
  let i = 0;
  for (const p of PIECES) if (!pieces[p.id].placed && !pieces[p.id].busy) { const id = p.id; setTimeout(() => snapPiece(id, true), i++ * 450); }
  if (!i) toast('Everything is already built!');
}

// ---------------- pointer interaction ----------------
const pointers = new Set();
window.addEventListener('pointerdown', (e) => pointers.add(e.pointerId), true);
const dropPointer = (e) => pointers.delete(e.pointerId);
window.addEventListener('pointerup', dropPointer, true); window.addEventListener('pointercancel', dropPointer, true);
let active = null;
const dragPlane = new THREE.Plane(UP, -0.6), _hp = new V3();

stage.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (e.target !== renderer.domElement || e.button !== 0) return;
  if (pointers.size > 1) { cancelActive(); return; }
  let ok = false;
  if (phase === 'build') ok = startPieceDrag(e);
  else if (phase === 'ice' && tool === 'pipe') ok = startPipe(e);
  else if (phase === 'decorate') {
    if (tool === 'select') ok = startSelect(e);
    else if (KINDS[tool]?.scatter) ok = startScatter(e);
    else if (KINDS[tool]) ok = startStamp(e);
  }
  if (ok) { active.pointerId = e.pointerId; active.sx = e.clientX; active.sy = e.clientY; e.stopPropagation(); e.preventDefault(); }
}, { capture: true });
window.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', () => cancelActive());

function cancelActive() {
  if (!active) return;
  if (active.type === 'pipe') { tempGroup.clear(); sfx.squishStop(); }
  if (active.type === 'scatter') tempGroup.clear();
  if (active.type === 'piece') { sendHome(active.id); targetGhost.visible = false; }
  if (active.type === 'move') { applyCandy(active.obj, active.before); active.obj.userData.data = active.before; refreshSel(); }
  hideGhost(); active = null;
}

function startPieceDrag(e) {
  setRay(e);
  const meshes = PIECES.map((p) => pieces[p.id]).filter((pc) => !pc.placed && !pc.busy).map((pc) => pc.mesh);
  const h = raycaster.intersectObjects(meshes, false)[0]; if (!h) return false;
  const id = h.object.userData.pieceId, pc = pieces[id];
  raycaster.ray.intersectPlane(dragPlane, _hp);
  active = { type: 'piece', id, off: pc.mesh.position.clone().sub(_hp), moved: false };
  targetGhost.geometry = pc.mesh.geometry; targetGhost.position.copy(pc.tP); targetGhost.quaternion.copy(pc.tQ); targetGhost.visible = true;
  sfx.tick();
  return true;
}
function startPipe(e) {
  const h = hitSurface(e); if (!h) return false;
  const rad = TIPS[tip].line;
  active = { type: 'pipe', rad, col: icingColor, first: h, pts: [h.point.clone().addScaledVector(h.normal, rad * 0.45)], dirty: true, lastT: performance.now() };
  sfx.squishStart();
  return true;
}
function rebuildPipePreview() {
  tempGroup.clear();
  if (active.pts.length >= 2) tempGroup.add(icingLine(active.pts, active.rad, active.col));
  else { const m = mk(geom('dollop' + TIPS[tip].dot, () => dollopGeo(TIPS[tip].dot)), icingMat(active.col)); m.position.copy(active.first.point); m.quaternion.setFromUnitVectors(UP, active.first.normal); tempGroup.add(m); }
}
function startStamp(e) {
  const h = hitSurface(e); if (!h) return false;
  active = { type: 'stamp', kind: tool, last: null };
  stampUpdate(h); return true;
}
function stampUpdate(h) {
  const d = h ? candyDataAt(active.kind, h) : null;
  active.last = d; if (d) showGhost(d); else hideGhost();
}
function candyDataAt(kind, hit, keep) {
  const K = KINDS[kind], n = hit.normal;
  let mode = K.mode; if (mode === 'auto') mode = n.y > 0.85 ? 'stand' : 'flat';
  if (K.ground && n.y < 0.7) return null;
  const q = candyQuat(n, mode), p = hit.point.clone().addScaledVector(n, mode === 'stand' ? 0 : -0.006);
  return { t: 'candy', k: kind, v: keep ? keep.v : nextVariant[kind], m: mode, p: p.toArray().map(r3), q: q.toArray().map((x) => Math.round(x * 1e5) / 1e5), r: keep ? keep.r : 0 };
}
function placeCandy(d) {
  commit(addAction(createDecoration(d))); sfx.pop(); reroll(d.k); hideGhost();
}
function startScatter(e) {
  const h = hitSurface(e); if (!h) return false;
  const kind = tool, seed = newSeed();
  const im = scatterMesh(kind, 5000); tempGroup.add(im);
  active = { type: 'scatter', kind, data: { t: 'scatter', k: kind, seed, pts: [], cols: kind === 'sugar' ? null : [] }, im, rng: mulberry(seed), lastP: null };
  scatterAt(h); return true;
}
const _t1 = new V3(), _t2 = new V3();
function scatterAt(h) {
  const a = active; if (a.lastP && a.lastP.distanceTo(h.point) < 0.07) return; a.lastP = h.point.clone();
  const sugar = a.kind === 'sugar', count = sugar ? 14 : 7, R = sugar ? 0.7 : 0.28;
  if (!sugar) { _t1.copy(Math.abs(h.normal.y) < 0.9 ? UP : XA).cross(h.normal).normalize(); _t2.crossVectors(h.normal, _t1); }
  let added = 0;
  for (let i = 0; i < count && a.data.pts.length / 3 < 5000; i++) {
    const ang = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * R;
    let hit;
    if (sugar) { ray2.set(new V3(h.point.x + Math.cos(ang) * rr, h.point.y + 6, h.point.z + Math.sin(ang) * rr), new V3(0, -1, 0)); hit = firstHit(ray2); if (hit) hit.point.y += 0.006; }
    else { const o = h.point.clone().addScaledVector(h.normal, 0.35).addScaledVector(_t1, Math.cos(ang) * rr).addScaledVector(_t2, Math.sin(ang) * rr); ray2.set(o, h.normal.clone().negate()); ray2.far = 0.9; hit = firstHit(ray2); ray2.far = Infinity; if (hit) hit.point.addScaledVector(hit.normal, 0.016); }
    if (!hit) continue;
    const idx = a.data.pts.length / 3, p = hit.point.toArray().map(r3), col = (Math.random() * SPRINKLE.length) | 0;
    a.data.pts.push(...p); if (!sugar) a.data.cols.push(col);
    setScatterInstance(a.im, a.kind, idx, p, a.rng, col); a.im.count = idx + 1; added++;
  }
  if (added) { a.im.instanceMatrix.needsUpdate = true; if (a.im.instanceColor) a.im.instanceColor.needsUpdate = true; a.im.computeBoundingSphere(); sugar ? sfx.shake() : sfx.sprinkle(); }
}
function startSelect(e) {
  setRay(e);
  const h = raycaster.intersectObjects(decorGroup.children, true)[0];
  if (!h) { select(null); return false; }
  let o = h.object; while (o.parent && o.parent !== decorGroup) o = o.parent;
  select(o);
  active = { type: 'move', obj: o, before: o.userData.data, moved: false };
  return true;
}

function onMove(e) {
  if (!active || e.pointerId !== active.pointerId) {
    if (!active && phase === 'decorate' && KINDS[tool] && !KINDS[tool].scatter && e.pointerType === 'mouse' && e.target === renderer.domElement) {
      const h = hitSurface(e); const d = h && candyDataAt(tool, h); d ? showGhost(d) : hideGhost();
    }
    return;
  }
  const moved = Math.hypot(e.clientX - active.sx, e.clientY - active.sy) > 6;
  if (moved) active.moved = true;
  switch (active.type) {
    case 'piece': {
      if (!active.moved) return; setRay(e);
      if (raycaster.ray.intersectPlane(dragPlane, _hp)) { const m = pieces[active.id].mesh; m.position.set(_hp.x + active.off.x, 0.6, _hp.z + active.off.z); }
      break;
    }
    case 'pipe': {
      const h = hitSurface(e); if (!h) return;
      const p = h.point.clone().addScaledVector(h.normal, active.rad * 0.45), last = active.pts[active.pts.length - 1], d = p.distanceTo(last);
      if (d > 1.2) return;
      if (d > active.rad * 0.8) { active.pts.push(p); active.dirty = true; sfx.squishMod(d * 60); }
      break;
    }
    case 'stamp': stampUpdate(hitSurface(e)); break;
    case 'scatter': { const h = hitSurface(e); if (h) scatterAt(h); break; }
    case 'move': {
      if (!active.moved || active.before.t !== 'candy') return;
      const h = hitSurface(e, active.obj); if (!h) return;
      const nd = candyDataAt(active.before.k, h, active.before); if (!nd) return;
      active.obj.userData.data = nd; applyCandy(active.obj, nd); refreshSel(); break;
    }
    case 'tray': {
      if (!active.moved) return;
      if (overCanvas(e)) { const h = hitSurface(e); const d = h && candyDataAt(active.kind, h); active.last = d; d ? showGhost(d) : hideGhost(); }
      else { active.last = null; hideGhost(); }
      break;
    }
  }
}
function onUp(e) {
  if (!active || e.pointerId !== active.pointerId) return;
  const a = active; active = null;
  switch (a.type) {
    case 'piece': {
      targetGhost.visible = false;
      const m = pieces[a.id].mesh, ctr = new THREE.Box3().setFromObject(m).getCenter(new V3());
      if (!a.moved || (Math.abs(ctr.x) < BOARD / 2 + 0.3 && Math.abs(ctr.z) < BOARD / 2 + 0.3)) snapPiece(a.id);
      else { m.position.y = pieces[a.id].homeP.y; pieces[a.id].homeP.copy(m.position); sfx.tick(); }
      break;
    }
    case 'pipe': {
      sfx.squishStop(); tempGroup.clear();
      let d;
      if (a.pts.length < 2) d = { t: 'dot', p: a.first.point.clone().addScaledVector(a.first.normal, -0.01).toArray().map(r3), n: a.first.normal.toArray().map(r3), rad: TIPS[tip].dot, col: a.col };
      else d = { t: 'line', pts: a.pts.flatMap((p) => p.toArray().map(r3)), rad: a.rad, col: a.col };
      commit(addAction(createDecoration(d))); if (d.t === 'dot') sfx.pop();
      break;
    }
    case 'stamp': if (a.last) placeCandy(a.last); else if (KINDS[a.kind].ground) toast('Trees and fences stand in the snowy yard 🌲'); break;
    case 'scatter': {
      tempGroup.remove(a.im);
      if (a.data.pts.length) { const g = new THREE.Group(); g.add(a.im); g.userData.data = a.data; commit(addAction(g)); }
      break;
    }
    case 'move': if (a.moved && a.obj.userData.data !== a.before) commit(changeAction(a.obj, a.before, a.obj.userData.data)); break;
    case 'tray': {
      if (!a.moved) { tool = a.kind; renderPanelState(); toast(`${KINDS[a.kind].label.replace(/\u00ad/g, '')}: click or tap on the house to stick one on`); }
      else if (a.last && overCanvas(e)) placeCandy(a.last);
      else { hideGhost(); if (overCanvas(e) && KINDS[a.kind].ground) toast('Trees and fences stand in the snowy yard 🌲'); }
      break;
    }
  }
}
function trayDown(e, kind) {
  sfx.unlock(); e.preventDefault();
  if (KINDS[kind].scatter) { tool = kind; select(null); renderPanelState(); toast(kind === 'sugar' ? 'Sugar shaker: drag over the yard or roof to dust it with snow' : 'Sprinkles: drag over the house to scatter nonpareils'); return; }
  if (phase !== 'decorate') return;
  active = { type: 'tray', kind, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, last: null };
}

// ghost preview of the candy before you drop it
let ghost = null; const ghostMats = new Map();
function ghostify(m) { if (Array.isArray(m)) return m.map(ghostify); if (!ghostMats.has(m)) { const c = m.clone(); c.transparent = true; c.opacity = 0.62; c.depthWrite = false; ghostMats.set(m, c); } return ghostMats.get(m); }
function showGhost(d) {
  const key = d.k + '|' + d.m + '|' + d.v;
  if (!ghost || ghost.key !== key) { hideGhost(); const obj = KINDS[d.k].build(d.m, d.v); obj.traverse((o) => { if (o.isMesh) { o.material = ghostify(o.material); o.castShadow = false; } }); scene.add(obj); ghost = { key, obj }; }
  applyCandy(ghost.obj, d);
}
function hideGhost() { if (ghost) { scene.remove(ghost.obj); ghost = null; } }

// selection
function select(o) {
  selected = o; if (selBox) { scene.remove(selBox); selBox = null; }
  if (o) { selBox = new THREE.BoxHelper(o, 0xffcc33); selBox.userData.noHit = true; scene.add(selBox); sfx.tick(); }
  updateActionButtons();
}
function refreshSel() { if (selBox && selected) selBox.update(); }
function rotateSel(dir) { if (!selected || selected.userData.data.t !== 'candy') return; const b = selected.userData.data; commit(changeAction(selected, b, { ...b, r: (b.r || 0) + dir * Math.PI / 12 })); sfx.tick(); }
function deleteSel() { if (!selected) return; const o = selected; select(null); commit(removeAction(o)); sfx.tick(); }

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Enter') e.target.blur(); return; }
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (k === 'delete' || k === 'backspace') { if (selected) { e.preventDefault(); deleteSel(); } }
  else if (k === 'q') rotateSel(-1);
  else if (k === 'e' || k === 'r') rotateSel(1);
  else if (k === 'escape') { cancelActive(); select(null); hideGhost(); }
});

// ---------------- photo / reset ----------------
function flash() { const f = document.createElement('div'); f.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:.9;z-index:50;pointer-events:none;transition:opacity .5s'; document.body.appendChild(f); requestAnimationFrame(() => requestAnimationFrame(() => (f.style.opacity = '0'))); setTimeout(() => f.remove(), 600); }
function takePhoto() {
  if (selBox) selBox.visible = false; hideGhost(); targetGhost.visible = false;
  renderer.render(scene, camera);
  const src = renderer.domElement, w = src.width, h = src.height, band = Math.round(Math.max(96, h * 0.13));
  const [c, g] = mkCanvas(w, h + band);
  g.drawImage(src, 0, 0);
  const gr = g.createLinearGradient(0, h, 0, h + band); gr.addColorStop(0, '#fff8ee'); gr.addColorStop(1, '#f1dfc3');
  g.fillStyle = gr; g.fillRect(0, h, w, band);
  const sh = Math.max(6, band * 0.07);
  for (let x = -sh * 2, i = 0; x < w + sh * 2; x += sh * 2, i++) { g.fillStyle = i % 2 ? '#fff' : '#c0392b'; g.beginPath(); g.moveTo(x, h); g.lineTo(x + sh * 2, h); g.lineTo(x + sh * 3, h + sh); g.lineTo(x + sh, h + sh); g.fill(); }
  const name = $('#name').value.trim(), title = name ? `${name}'s Gingerbread House` : 'My Gingerbread House';
  const date = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#7a2a1c'; g.font = `bold ${Math.round(band * 0.34)}px Georgia, "Times New Roman", serif`; g.fillText(title, w / 2, h + band * 0.47, w * 0.94);
  g.fillStyle = '#8b6c55'; g.font = `${Math.round(band * 0.15)}px system-ui, sans-serif`; g.fillText('🍪 Gingerbread Workshop · ' + date, w / 2, h + band * 0.8);
  if (selBox) selBox.visible = true;
  sfx.shutter(); flash();
  const url = c.toDataURL('image/png');
  const fname = `gingerbread-house-${(name || 'mine').replace(/[^\w-]+/g, '-').toLowerCase()}.png`;
  const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
  window.__lastPhoto = { fname, bytes: Math.round(url.length * 0.75), w, h: h + band };
  modal(`<h3>📸 Photo saved!</h3><img src="${url}" alt="Gingerbread house photo"><div class="note">It's in your downloads as <b>${fname}</b>. Share it with everyone!</div>`, [{ label: 'Download again', href: url, download: fname, cls: 'go', keep: true }, { label: 'Close' }]);
}
function doReset() {
  tweens.length = 0; cancelActive(); select(null); hideGhost();
  decorGroup.clear(); tempGroup.clear(); undoStack.length = 0; redoStack.length = 0;
  for (const p of PIECES) { const pc = pieces[p.id]; removeSeams(p.id); pc.placed = false; pc.busy = false; pc.homeP.set(...p.def ? p.def.home : p.home); pc.mesh.position.copy(pc.homeP); pc.mesh.quaternion.copy(pc.homeQ); }
  window.__builtAnnounced = false; updateInnerLight();
  phase = 'build'; tool = 'pipe'; controls.autoRotate = false; snow.visible = false;
  try { localStorage.removeItem(STORE_KEY); } catch { }
  flyTo(...buildView()); renderGuide(); renderPanel(); afterChange(); applyViewOffset();
  toast('Fresh kit unwrapped! 🎁');
}

// ---------------- save / load (files + named slots) ----------------
const SLOTS_KEY = 'gingerbread-house-slots-v1';
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (n) => (n || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my';
const isNums = (a, len) => Array.isArray(a) && (len == null || a.length === len) && a.every((x) => typeof x === 'number' && isFinite(x));
const isNum = (x) => typeof x === 'number' && isFinite(x);
function validateState(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw 'it isn’t a gingerbread house save';
  if (s.app != null && s.app !== 'gingerbread-workshop') throw 'it was made by a different app';
  if (s.v !== 1) throw 'it’s from an unknown version of the workshop';
  if (s.name != null && typeof s.name !== 'string') throw 'the name in it is damaged';
  if (!Array.isArray(s.placed) || !s.placed.every((id) => typeof id === 'string' && pieces[id])) throw 'the house pieces in it are damaged';
  if (!Array.isArray(s.decor)) throw 'the decorations in it are missing';
  if (s.decor.length > 5000) throw 'it has too many decorations';
  s.decor.forEach((d, i) => {
    const ok = d && typeof d === 'object' && ({
      candy: () => KINDS[d.k] && !KINDS[d.k].scatter && isNums(d.p, 3) && isNums(d.q, 4) && (d.m === 'flat' || d.m === 'stand') && (d.r == null || isNum(d.r)) && (d.v == null || isNum(d.v)),
      line: () => isNums(d.pts) && d.pts.length >= 6 && d.pts.length % 3 === 0 && d.pts.length < 60000 && isNum(d.rad) && d.rad > 0 && d.rad < 1 && ICING[d.col],
      dot: () => isNums(d.p, 3) && isNums(d.n, 3) && isNum(d.rad) && d.rad > 0 && d.rad < 1 && ICING[d.col],
      scatter: () => (d.k === 'sprinkles' || d.k === 'sugar') && isNum(d.seed) && isNums(d.pts) && d.pts.length % 3 === 0 && d.pts.length <= 15000 && (d.cols == null || isNums(d.cols)),
      shingles: () => isNum(d.seed),
      drips: () => isNum(d.seed) && (d.col == null || ICING[d.col]),
    }[d.t] || (() => false))();
    if (!ok) throw `decoration #${i + 1} in it is damaged`;
  });
  if (s.decor.length && !REQUIRED.every((id) => s.placed.includes(id))) throw 'it has decorations but no finished house';
}
function applyRaw(s) {
  tweens.length = 0; cancelActive(); select(null); hideGhost();
  decorGroup.clear(); tempGroup.clear(); undoStack.length = 0; redoStack.length = 0;
  for (const p of PIECES) { const pc = pieces[p.id]; removeSeams(p.id); pc.placed = false; pc.busy = false; pc.homeP.set(...p.home); pc.mesh.position.copy(pc.homeP); pc.mesh.quaternion.copy(pc.homeQ); }
  for (const p of PIECES) if (s.placed.includes(p.id)) placeInstant(p.id);
  updateInnerLight();
  for (const d of s.decor) decorGroup.add(createDecoration(d));
  $('#name').value = s.name || '';
  window.__builtAnnounced = allBuilt();
  phase = ORDER.includes(s.phase) && (s.phase === 'build' || allBuilt()) ? s.phase : allBuilt() ? 'ice' : 'build';
  tool = phase === 'decorate' ? 'gumdrop' : 'pipe';
  controls.autoRotate = phase === 'finish'; snow.visible = phase === 'finish';
}
function loadState(s) {
  validateState(s);
  const prev = getState();
  try { applyRaw(s); } catch (e) { console.warn('load failed, restoring', e); applyRaw(prev); throw 'it couldn’t be rebuilt'; }
  flyTo(...(phase === 'build' ? buildView() : houseView()));
  updateNameCard(); renderGuide(); renderPanel(); applyViewOffset(); afterChange();
}
function saveToFile() {
  const st = { ...getState(), savedAt: new Date().toISOString() };
  const fname = `${slug(st.name)}-gingerbread.gingerbread`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(st)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  sfx.chime(); toast(`💾 Saved to your downloads as ${fname}`, 3200);
}
function loadError(fileName, why) {
  window.__lastLoadError = why;
  modal(`<h3>Hmm, that file didn’t work 🍪</h3>We couldn’t open <b>${esc(fileName)}</b> because ${esc(why)}.<br><br>Please choose a <b>.gingerbread</b> file saved with the 💾 Save button. Your current house hasn’t changed.`, [{ label: 'OK', cls: 'go' }]);
}
async function loadFile(f) {
  if (!f) return;
  let s;
  try {
    if (f.size > 25e6) throw 'it’s far too big';
    try { s = JSON.parse(await f.text()); } catch { throw 'it isn’t a gingerbread house save'; }
    loadState(s);
  } catch (err) { loadError(f.name, typeof err === 'string' ? err : 'it looks damaged'); return; }
  window.__lastLoadError = null; $('#modal').hidden = true;
  sfx.chime(); toast(`📂 Opened ${s.name ? s.name + '’s' : 'the'} gingerbread house`, 2600);
}
const fileInput = document.createElement('input');
fileInput.type = 'file'; fileInput.id = 'file-load'; fileInput.accept = '.gingerbread,.json,application/json'; fileInput.hidden = true;
fileInput.onchange = () => { const f = fileInput.files[0]; fileInput.value = ''; loadFile(f); };
document.body.appendChild(fileInput);
let dragDepth = 0;
const hasFiles = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files');
window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; document.body.classList.add('dropping'); });
window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) document.body.classList.remove('dropping'); });
window.addEventListener('drop', (e) => { e.preventDefault(); dragDepth = 0; document.body.classList.remove('dropping'); const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) loadFile(f); });

function getSlots() { try { const a = JSON.parse(localStorage.getItem(SLOTS_KEY) || '[]'); return Array.isArray(a) ? a.filter((x) => x && x.id && x.state) : []; } catch { return []; } }
function putSlots(a) { localStorage.setItem(SLOTS_KEY, JSON.stringify(a)); }
const fmtTime = (iso) => { try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch { return iso; } };
function saveSlot(title) {
  const st = getState(), a = getSlots();
  const slot = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: (title || '').trim().slice(0, 40) || `${st.name ? st.name + '’s' : 'My'} house`, savedAt: new Date().toISOString(), state: st };
  a.unshift(slot);
  try { putSlots(a); } catch { toast('This browser is out of save space — use 💾 Save to download a file instead', 4000); return null; }
  return slot;
}
function openSaves() {
  const slots = getSlots(), nm = $('#name').value.trim();
  const list = slots.length ? slots.map((sl) => `<div class="slot"><div class="slot-info"><b>${esc(sl.title)}</b><small>${esc(fmtTime(sl.savedAt))} · ${sl.state.placed.length}/7 pieces · ${sl.state.decor.length} decorations</small></div><button class="slot-open" data-open="${esc(sl.id)}">Open</button><button class="slot-del" data-del="${esc(sl.id)}" title="Delete this save">🗑</button></div>`).join('') : '<p class="slot-empty">No saves yet — name this one and press “Save as new slot”.</p>';
  modal(`<h3>🗂 My saves</h3><div class="slot-new"><input id="slot-name" maxlength="40" placeholder="Name this save" value="${esc(nm ? nm + '’s house' : 'My house')}"><button id="slot-add" class="primary">💾 Save as new slot</button></div><div class="slots">${list}</div><p class="note">Saves are kept in this browser. Your work also autosaves as you go. To move a house to another computer, use 💾 Save and 📂 Load.</p>`, [{ label: 'Close' }]);
  const body = $('#modal-body');
  $('#slot-add').onclick = () => { const sl = saveSlot($('#slot-name').value); if (sl) { sfx.chime(); toast(`Saved “${sl.title}”`); openSaves(); } };
  body.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => {
    const sl = getSlots().find((x) => x.id === b.dataset.open); if (!sl) return;
    try { loadState(sl.state); } catch (err) { loadError(sl.title, typeof err === 'string' ? err : 'it looks damaged'); return; }
    $('#modal').hidden = true; sfx.chime(); toast(`📂 Opened “${sl.title}”`);
  }));
  body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
    const a = getSlots(), sl = a.find((x) => x.id === b.dataset.del); if (!sl) return;
    try { putSlots(a.filter((x) => x.id !== sl.id)); } catch { }
    sfx.tick(); toast(`Deleted “${sl.title}”`); openSaves();
  }));
}

// ---------------- falling snow (finish) ----------------
const snow = (() => {
  const N = 1400, pos = new Float32Array(N * 3), spd = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = Math.random() * 16; pos[i * 3 + 2] = (Math.random() - 0.5) * 30; spd[i] = 0.4 + Math.random() * 0.7; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const [c, x] = mkCanvas(64, 64); const rg = x.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.4, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, 64, 64);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.13, map: canvasTex(c), transparent: true, depthWrite: false }));
  pts.userData = { spd, noHit: true }; pts.visible = false; scene.add(pts); return pts;
})();
function updateSnow(dt, time) {
  if (!snow.visible) return; const p = snow.geometry.attributes.position.array, s = snow.userData.spd;
  for (let i = 0; i < s.length; i++) { p[i * 3 + 1] -= s[i] * dt; p[i * 3] += Math.sin(time * 0.7 + i) * 0.004; if (p[i * 3 + 1] < 0) p[i * 3 + 1] = 16; }
  snow.geometry.attributes.position.needsUpdate = true;
}

// ---------------- tray thumbnails ----------------
function scatterIcon(kind) {
  const [c, g] = mkCanvas(128, 128);
  if (kind === 'sprinkles') {
    g.fillStyle = '#f4e7d4'; g.beginPath(); g.ellipse(64, 78, 52, 30, 0, 0, 7); g.fill();
    const rng = mulberry(8); for (let i = 0; i < 160; i++) { const a = rng() * 7, r = Math.sqrt(rng()); g.fillStyle = SPRINKLE[i % SPRINKLE.length]; g.beginPath(); g.arc(64 + Math.cos(a) * r * 44, 72 + Math.sin(a) * r * 24, 3.4, 0, 7); g.fill(); }
  } else {
    g.fillStyle = '#e8eef5'; g.beginPath(); g.ellipse(64, 108, 52, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; for (let i = 0; i < 60; i++) { g.globalAlpha = 0.7; g.beginPath(); g.arc(30 + Math.random() * 68, 70 + Math.random() * 36, 1.5, 0, 7); g.fill(); } g.globalAlpha = 1;
    g.save(); g.translate(64, 50); g.rotate(-0.5);
    g.fillStyle = '#d9dee6'; g.fillRect(-20, -34, 40, 12); g.fillStyle = '#9aa3ae'; for (let i = -12; i <= 12; i += 8) { g.beginPath(); g.arc(i, -28, 2, 0, 7); g.fill(); }
    const gr = g.createLinearGradient(-20, 0, 20, 0); gr.addColorStop(0, '#e9eef4'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#cfd6df'); g.fillStyle = gr; g.fillRect(-20, -22, 40, 50);
    g.fillStyle = '#c0392b'; g.fillRect(-20, -2, 40, 12); g.restore();
  }
  return c.toDataURL();
}
function makeThumbs() {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return; }
  r.setSize(128, 128); r.setPixelRatio(1); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping;
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x886655, 1.5));
  const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.set(2, 4, 5); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
  for (const [k, K] of Object.entries(KINDS)) {
    if (K.scatter) { thumbs[k] = scatterIcon(k); continue; }
    const obj = new THREE.Group();
    const mode = K.mode === 'flat' ? 'flat' : 'stand';
    if (K.variants > 1 && K.mode === 'flat') [[-0.2, -0.08, 0], [0.2, -0.08, 0], [0, 0.17, 0.02]].forEach(([x, y, z], i) => { const o = K.build('flat', i * 2 % K.variants); o.position.set(x * (k === 'wafer' ? 1.3 : 1), y, z); obj.add(o); });
    else { const o = K.build(mode, 0); if (k.startsWith('lic')) o.rotation.z = Math.PI / 4; obj.add(o); }
    sc.add(obj);
    const sph = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
    const dir = mode === 'flat' ? new V3(0, -0.35, 1).normalize() : new V3(0.35, 0.3, 1).normalize();
    cam.position.copy(sph.center).addScaledVector(dir, sph.radius / Math.sin((cam.fov * Math.PI) / 360) * 1.02); cam.lookAt(sph.center);
    r.render(sc, cam); thumbs[k] = r.domElement.toDataURL(); sc.remove(obj);
  }
  r.dispose(); r.forceContextLoss?.();
}

// ---------------- main loop ----------------
const isNarrow = () => window.innerWidth <= 820;
function applyViewOffset() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (isNarrow()) camera.setViewOffset(w, h, 0, (phase === 'build' ? -0.06 : 0.05) * h, w, h); else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; applyViewOffset(); }
window.addEventListener('resize', resize);
const clock = new THREE.Clock(); let elapsed = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05); elapsed += dt;
  for (let i = tweens.length - 1; i >= 0; i--) if (!tweens[i](dt)) tweens.splice(i, 1);
  if (active && active.type === 'pipe' && active.dirty) { active.dirty = false; rebuildPipePreview(); }
  if (targetGhost.visible) ghostMat.opacity = 0.18 + 0.14 * Math.sin(elapsed * 5);
  updateSnow(dt, elapsed);
  controls.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---------------- wire up UI & start ----------------
function updateMute() { $('#mute').textContent = sfx.muted ? '🔇' : '🔊'; }
$('#mute').onclick = () => { sfx.unlock(); sfx.muted = !sfx.muted; if (sfx.muted) sfx.squishStop(); updateMute(); afterChange(); };
$('#name').addEventListener('input', () => { updateNameCard(); afterChange(); });
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#rotl').onclick = () => rotateSel(-1); $('#rotr').onclick = () => rotateSel(1);
$('#del').onclick = deleteSel; $('#photo').onclick = takePhoto;
$('#save').onclick = saveToFile; $('#load').onclick = () => fileInput.click(); $('#saves').onclick = openSaves;
$('#reset').onclick = () => modal('<h3>Start over?</h3>This unwraps a fresh kit and clears your house and decorations.', [{ label: 'Keep my house' }, { label: 'Start over', cls: 'go', onClick: doReset }]);
$('#next').onclick = () => { const i = ORDER.indexOf(phase); if (phase === 'finish') takePhoto(); else setPhase(ORDER[i + 1]); };
$('#autobuild').onclick = autoBuild;
$('#guide-toggle').onclick = () => { const g = $('#guide'); g.classList.toggle('collapsed'); $('#guide-toggle').textContent = g.classList.contains('collapsed') ? '+' : '–'; };
document.querySelectorAll('#steps li').forEach((li) => (li.onclick = () => setPhase(li.dataset.step)));
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

function init() {
  if (isNarrow()) { $('#guide').classList.add('collapsed'); $('#guide-toggle').textContent = '+'; }
  resize();
  const s = load();
  if (s) {
    $('#name').value = s.name || ''; sfx.muted = !!s.muted;
    for (const p of PIECES) if ((s.placed || []).includes(p.id)) placeInstant(p.id);
    for (const d of s.decor || []) { try { const o = createDecoration(d); decorGroup.add(o); } catch (err) { console.warn('skip decoration', err); } }
    if (allBuilt()) { window.__builtAnnounced = true; phase = ORDER.includes(s.phase) && s.phase !== 'build' ? s.phase : 'ice'; }
  }
  if (phase === 'ice') tool = 'pipe';
  if (phase === 'decorate') tool = 'gumdrop';
  const [p, t] = phase === 'build' ? buildView() : houseView(); camera.position.copy(p); controls.target.copy(t);
  controls.autoRotate = phase === 'finish'; snow.visible = phase === 'finish';
  applyViewOffset(); makeThumbs(); updateNameCard(); renderGuide(); renderPanel(); updateMute(); updateActionButtons();
  loop();
  setTimeout(() => $('#loading').classList.add('gone'), 150);
  if (s && s.decor && s.decor.length) toast('Welcome back — your house was saved 🏠', 2600);
}

// hooks for automated testing
const toScreen = (v) => { const p = v.clone().project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height }; };
window.GB = {
  get phase() { return phase; }, get tool() { return tool; }, setPhase, autoBuild, allBuilt, undo, redo,
  setTool(t) { tool = t; renderPanelState(); },
  pieceScreen(id) { const b = new THREE.Box3().setFromObject(pieces[id].mesh); return toScreen(b.getCenter(new V3())); },
  boardScreen(x, z) { return toScreen(new V3(x, 0.05, z)); },
  worldScreen(x, y, z) { return toScreen(new V3(x, y, z)); },
  placed() { return PIECES.filter((p) => pieces[p.id].placed).map((p) => p.id); },
  decor() { return decorGroup.children.map((o) => o.userData.data.t + (o.userData.data.k ? ':' + o.userData.data.k : '')); },
  view(px, py, pz, tx, ty, tz) { tweens.length = 0; camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); controls.update(); },
  get lastPhoto() { return window.__lastPhoto; },
  busy() { return tweens.length > 0; },
  state: getState, slots: () => getSlots().map((x) => x.title), get lastLoadError() { return window.__lastLoadError; },
};

init();
