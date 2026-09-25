/* eslint-disable no-undef, no-unused-vars -- browser-only module; TypeScript covers these */
// PROTOTYPE — low-poly Himachal mountain drive. On-rails car on a closed winding loop,
// signboards along the road for each stop. Lazy-loaded from DriveEasterEgg.astro.
import * as THREE from 'three';

export interface DriveStop {
  kind: 'welcome' | 'about' | 'blog' | 'project' | 'end';
  label: string;
  title: string;
  subtitle: string;
  href?: string;
  external?: boolean;
}

const ROAD_WIDTH = 9;
const FLAT = ROAD_WIDTH / 2 + 3;
const MAX_SPEED = 30;
const TERRAIN_SIZE = 1300;
const TERRAIN_SEGMENTS = 220;

const SIGN_COLORS: Record<DriveStop['kind'], string> = {
  welcome: '#0f766e',
  about: '#1d4ed8',
  blog: '#166534',
  project: '#78350f',
  end: '#0f766e',
};

// ---------- noise ----------
function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function valueNoise(x: number, z: number) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, z: number) {
  let total = 0;
  let amp = 1;
  let freq = 0.006;
  for (let i = 0; i < 4; i++) {
    total += (valueNoise(x * freq, z * freq) - 0.5) * 2 * amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return total;
}
const smoothstep = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

// ---------- road ----------
function roadRadius(a: number) {
  return 290 + 55 * Math.sin(3 * a) + 30 * Math.sin(8 * a + 1.3);
}
function roadY(a: number) {
  return 18 * Math.sin(2 * a + 0.5) + 7 * Math.sin(5 * a);
}
function buildCurve() {
  const pts: THREE.Vector3[] = [];
  const n = 64;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = roadRadius(a);
    pts.push(new THREE.Vector3(Math.cos(a) * r, roadY(a), Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

// ---------- river ----------
// A Sutlej-style river on the valley floor below the parapets, following the road's bends
// with softer meanders and sitting ~40 units below it.
const RIVER_HALF_WIDTH = 10;
function riverRadius(a: number) {
  return 350 + 55 * Math.sin(3 * a) + 12 * Math.sin(8 * a + 1.3);
}
function riverY(a: number) {
  return roadY(a) - 40;
}
function buildRiverCurve() {
  const pts: THREE.Vector3[] = [];
  const n = 160;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = riverRadius(a);
    pts.push(new THREE.Vector3(Math.cos(a) * r, riverY(a), Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

function waterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#3d7f8c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Streaks along the flow (u runs downstream); they scroll to make the water move.
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.strokeStyle = `rgba(224, 242, 254, ${0.12 + Math.random() * 0.3})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 + Math.random() * 50, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function ribbon(
  curve: THREE.CatmullRomCurve3,
  samples: number,
  left: number,
  right: number,
  lift: number,
  keep?: (i: number) => boolean,
  uRepeat = 1
) {
  const pos: number[] = [];
  const uv: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const frames = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const p = curve.getPointAt(u % 1);
    const t = curve.getTangentAt(u % 1);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    frames.push([p.clone().addScaledVector(side, left), p.clone().addScaledVector(side, right)]);
  }
  for (let i = 0; i < samples; i++) {
    if (keep && !keep(i)) continue;
    const [a, b] = frames[i];
    const [c, d] = frames[i + 1];
    pos.push(a.x, a.y + lift, a.z, b.x, b.y + lift, b.z, c.x, c.y + lift, c.z);
    pos.push(b.x, b.y + lift, b.z, d.x, d.y + lift, d.z, c.x, c.y + lift, c.z);
    const u0 = (i / samples) * uRepeat;
    const u1 = ((i + 1) / samples) * uRepeat;
    uv.push(u0, 0, u0, 1, u1, 0, u0, 1, u1, 1, u1, 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// ---------- signs ----------
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '…');
  }
  return lines;
}

function signTexture(stop: DriveStop) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 560;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = SIGN_COLORS[stop.kind];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.roundRect(24, 24, canvas.width - 48, canvas.height - 48, 28);
  ctx.stroke();

  ctx.fillStyle = '#fde68a';
  ctx.font = '600 40px Instrument Sans, sans-serif';
  ctx.fillText(stop.label.toUpperCase(), 70, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px Instrument Sans, sans-serif';
  const titleLines = wrap(ctx, stop.title, 880, 2);
  titleLines.forEach((l, i) => ctx.fillText(l, 70, 190 + i * 76));

  ctx.fillStyle = '#d1fae5';
  ctx.font = '400 34px Instrument Sans, sans-serif';
  wrap(ctx, stop.subtitle, 880, 2).forEach((l, i) => ctx.fillText(l, 70, 210 + titleLines.length * 76 + i * 44));

  if (stop.href) {
    ctx.font = '600 36px Instrument Sans, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(stop.kind === 'project' ? 'Enter ⏎  view repo  →' : 'Enter ⏎  read  →', 70, 490);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function buildSign(stop: DriveStop) {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#475569' });
  const back = new THREE.MeshStandardMaterial({ color: '#94a3b8' });
  const face = new THREE.MeshStandardMaterial({ map: signTexture(stop) });
  const board = new THREE.Mesh(new THREE.BoxGeometry(7.3, 4, 0.2), [back, back, back, back, face, back]);
  board.position.y = 4.6;
  board.castShadow = true;
  group.add(board);
  for (const x of [-2.8, 2.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.6, 6), wood);
    post.position.set(x, 2.3, -0.15);
    post.castShadow = true;
    group.add(post);
  }
  return group;
}

// ---------- car ----------
function buildCar() {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: '#14b8a6', roughness: 0.4, metalness: 0.2, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.1 });
  const tyre = new THREE.MeshStandardMaterial({ color: '#111827' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.65, 4.2), paint);
  body.position.y = 0.75;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.1), glass);
  cabin.position.set(0, 1.35, -0.2);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 1.9), paint);
  roof.position.set(0, 1.68, -0.2);
  // Roof carrier with luggage — a mountain road trip staple.
  const bag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1), new THREE.MeshStandardMaterial({ color: '#f59e0b' }));
  bag.position.set(0, 1.9, -0.3);
  car.add(body, cabin, roof, bag);

  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [
    [-1, 1.35],
    [1, 1.35],
    [-1, -1.35],
    [1, -1.35],
  ]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12), tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    wheels.push(w);
    car.add(w);
  }
  const lights = new THREE.MeshStandardMaterial({ color: '#fef9c3', emissive: '#fef08a', emissiveIntensity: 2 });
  const tail = new THREE.MeshStandardMaterial({ color: '#7f1d1d', emissive: '#ef4444', emissiveIntensity: 1.5 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.05), lights);
    h.position.set(x, 0.85, 2.11);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), tail);
    t.position.set(x, 0.85, -2.11);
    car.add(h, t);
  }
  car.traverse((o) => (o.castShadow = true));
  return { car, wheels };
}

// ---------- main ----------
export function startDrive(root: HTMLElement, stops: DriveStop[], onExit: () => void) {
  root.innerHTML = `
    <div data-canvas class="absolute inset-0"></div>
    <div data-fade class="pointer-events-none absolute inset-0 bg-slate-900 transition-opacity duration-1000"></div>
    <div class="pointer-events-none absolute left-4 top-4 rounded-xl bg-slate-900/70 px-4 py-3 font-mono text-xs text-slate-300 backdrop-blur sm:left-6 sm:top-6">
      <div class="font-semibold uppercase tracking-widest text-teal-300">NH-5 · Himachal</div>
      <div class="mt-1"><span data-speed class="text-lg text-white">0</span> km/h</div>
    </div>
    <button data-exit class="absolute right-4 top-4 rounded-full bg-slate-900/70 px-4 py-2 font-mono text-xs text-slate-200 backdrop-blur hover:bg-slate-900 sm:right-6 sm:top-6">Esc · exit</button>
    <div data-card class="absolute bottom-24 left-1/2 w-[min(92vw,34rem)] -translate-x-1/2 translate-y-4 rounded-2xl bg-slate-900/85 p-5 text-slate-300 opacity-0 shadow-2xl ring-1 ring-teal-400/40 backdrop-blur transition duration-300 sm:bottom-10">
      <div data-card-label class="font-mono text-xs uppercase tracking-widest text-teal-300"></div>
      <div data-card-title class="mt-1 text-lg font-semibold text-white"></div>
      <div data-card-sub class="mt-1 text-sm text-slate-400"></div>
      <a data-card-link class="mt-3 inline-block text-sm font-semibold text-teal-300 hover:underline"></a>
    </div>
    <div class="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 font-mono text-xs text-white/70 sm:block">
      W/↑ drive · S/↓ brake · A/D steer · Enter open · Esc exit
    </div>
    <div class="absolute inset-x-4 bottom-4 flex justify-between sm:hidden">
      <button data-touch="brake" class="size-16 rounded-full bg-slate-900/70 text-xs font-semibold text-white">BRAKE</button>
      <button data-touch="gas" class="size-16 rounded-full bg-teal-500/80 text-xs font-semibold text-slate-900">GAS</button>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const mount = $('[data-canvas]');

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(root.clientWidth, root.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const horizon = new THREE.Color('#f0c79a');
  scene.fog = new THREE.Fog(horizon, 140, 780);

  // Golden-hour sky dome.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#1e293b') }, bottom: { value: horizon } },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
        void main(){ float h = clamp(normalize(vPos).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.7)), 1.0); }`,
    })
  );
  scene.add(sky);

  const camera = new THREE.PerspectiveCamera(60, root.clientWidth / root.clientHeight, 0.5, 4000);

  scene.add(new THREE.HemisphereLight('#fde2c4', '#334155', 1.1));
  const sun = new THREE.DirectionalLight('#ffd7a8', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 300 });
  scene.add(sun, sun.target);
  const sunOffset = new THREE.Vector3(-120, 110, -60);

  // Road
  const curve = buildCurve();
  const length = curve.getLength();
  const roadSamples = 1600;
  const road = new THREE.Mesh(
    ribbon(curve, roadSamples, -ROAD_WIDTH / 2, ROAD_WIDTH / 2, 0.05),
    new THREE.MeshStandardMaterial({ color: '#3f4652', roughness: 0.95 })
  );
  road.receiveShadow = true;
  const paintMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const yellow = new THREE.MeshBasicMaterial({ color: '#facc15' });
  scene.add(
    road,
    new THREE.Mesh(
      ribbon(curve, roadSamples, -0.12, 0.12, 0.08, (i) => Math.floor(i / 3) % 2 === 0),
      yellow
    ),
    new THREE.Mesh(ribbon(curve, roadSamples, -ROAD_WIDTH / 2 + 0.3, -ROAD_WIDTH / 2 + 0.5, 0.08), paintMat),
    new THREE.Mesh(ribbon(curve, roadSamples, ROAD_WIDTH / 2 - 0.5, ROAD_WIDTH / 2 - 0.3, 0.08), paintMat)
  );

  // Black & yellow parapet stones on the valley (outer) side.
  const up = new THREE.Vector3(0, 1, 0);
  const parapetCount = 700;
  const parapets = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.5, 0.7, 1.4),
    new THREE.MeshStandardMaterial({ flatShading: true }),
    parapetCount
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  for (let i = 0; i < parapetCount; i++) {
    const u = i / parapetCount;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    const outward = new THREE.Vector3(p.x, 0, p.z).normalize().dot(side) > 0 ? 1 : -1;
    p.addScaledVector(side, outward * (ROAD_WIDTH / 2 + 0.6));
    p.y += 0.35;
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(t.x, 0, t.z).normalize());
    m.compose(p, q, new THREE.Vector3(1, 1, 1));
    parapets.setMatrixAt(i, m);
    parapets.setColorAt(i, col.set(i % 2 ? '#111827' : '#facc15'));
  }
  parapets.castShadow = true;
  scene.add(parapets);

  // Terrain — flattened under the road, rising inside the loop, dropping to a valley outside,
  // then climbing to snow peaks at the edges.
  const terrainRef = Array.from({ length: 800 }, (_, i) => curve.getPoint(i / 800));
  const heightAt = (x: number, z: number) => {
    const a = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
    const guess = Math.round((a / (Math.PI * 2)) * 800);
    let best = Infinity;
    let ry = 0;
    for (let k = -45; k <= 45; k++) {
      const s = terrainRef[(guess + k + 800) % 800];
      const d = (s.x - x) ** 2 + (s.z - z) ** 2;
      if (d < best) {
        best = d;
        ry = s.y;
      }
    }
    const d = Math.sqrt(best);
    const rv = Math.hypot(x, z);
    const inside = rv < roadRadius(a);
    const t = Math.max(0, d - FLAT);
    // Outside the loop the valley falls away right after the parapets, so the river stays in view.
    const blend = smoothstep(t / (inside ? 30 : 10));
    const n = fbm(x, z);
    const target = inside
      ? ry + t * 0.5 + n * 28 + Math.max(0, 1 - rv / 240) * 110
      : ry - Math.min(t, 45) + Math.max(0, t - 75) * 0.65 + n * (10 + t * 0.2);
    let h = ry - 0.25 + (target - (ry - 0.25)) * blend;
    // Cut the river channel: a flat bed under the water, low banks easing back into the terrain.
    const river = Math.abs(rv - riverRadius(a));
    if (!inside) {
      const wy = riverY(a);
      if (river < RIVER_HALF_WIDTH) h = wy - 2;
      else {
        const bank = wy + 0.6 + (river - RIVER_HALF_WIDTH) * 0.5;
        h = bank + (h - bank) * smoothstep((river - RIVER_HALF_WIDTH) / 28);
      }
    }
    return { h, d, river: inside ? Infinity : river };
  };

  const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  terrainGeo.rotateX(-Math.PI / 2);
  const tp = terrainGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setY(i, heightAt(tp.getX(i), tp.getZ(i)).h);
  const terrainFlat = terrainGeo.toNonIndexed();
  terrainFlat.computeVertexNormals();
  const fp = terrainFlat.attributes.position;
  const fn = terrainFlat.attributes.normal;
  const colors = new Float32Array(fp.count * 3);
  const grass = new THREE.Color('#4d7c4f');
  const grass2 = new THREE.Color('#6b8f4e');
  const rock = new THREE.Color('#6b6f76');
  const snow = new THREE.Color('#f1f5f9');
  const pebbles = new THREE.Color('#a8a29e');
  for (let i = 0; i < fp.count; i += 3) {
    const h = (fp.getY(i) + fp.getY(i + 1) + fp.getY(i + 2)) / 3;
    const steep = fn.getY(i);
    const cx = fp.getX(i);
    const cz = fp.getZ(i);
    const a = (Math.atan2(cz, cx) + Math.PI * 2) % (Math.PI * 2);
    const nearRiver = Math.abs(Math.hypot(cx, cz) - riverRadius(a)) < RIVER_HALF_WIDTH + 4;
    const c =
      h > 78 + hash(cx, cz) * 14
        ? snow
        : nearRiver
          ? pebbles
          : steep < 0.72
            ? rock
            : hash(cx * 0.1, cz * 0.1) > 0.5
              ? grass
              : grass2;
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  terrainFlat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const terrain = new THREE.Mesh(
    terrainFlat,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // River surface — slightly wider than the bed so its edges tuck under the banks.
  const riverCurve = buildRiverCurve();
  const water = waterTexture();
  const riverSurface = new THREE.Mesh(
    ribbon(riverCurve, 900, -RIVER_HALF_WIDTH - 1.5, RIVER_HALF_WIDTH + 1.5, 0, undefined, riverCurve.getLength() / 40),
    new THREE.MeshStandardMaterial({ map: water, roughness: 0.2, metalness: 0.15 })
  );
  riverSurface.receiveShadow = true;
  scene.add(riverSurface);

  // Deodar trees.
  const treeCount = 2200;
  const cones = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.6, 6, 6),
    new THREE.MeshStandardMaterial({ color: '#1f4d3a', flatShading: true }),
    treeCount
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.6, 5),
    new THREE.MeshStandardMaterial({ color: '#57412c' }),
    treeCount
  );
  let placed = 0;
  for (let tries = 0; placed < treeCount && tries < treeCount * 6; tries++) {
    const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.95;
    const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.95;
    const { h, d, river } = heightAt(x, z);
    if (d < FLAT + 2.5 || river < RIVER_HALF_WIDTH + 5 || h > 68) continue;
    const s = 0.7 + Math.random() * 0.9;
    m.compose(new THREE.Vector3(x, h + 0.8 * s + 3 * s, z), q.identity(), new THREE.Vector3(s, s, s));
    cones.setMatrixAt(placed, m);
    m.compose(new THREE.Vector3(x, h + 0.8 * s, z), q.identity(), new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(placed, m);
    placed++;
  }
  cones.count = trunks.count = placed;
  cones.castShadow = true;
  scene.add(cones, trunks);

  // Signs — on the left, since we drive on the left.
  const stopDistances = stops.map((_, i) => ((i + 0.35) / stops.length) * length);
  stops.forEach((stop, i) => {
    const u = stopDistances[i] / length;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    const sign = buildSign(stop);
    sign.position.copy(p).addScaledVector(side, -(ROAD_WIDTH / 2 + 2.2));
    sign.position.y = heightAt(sign.position.x, sign.position.z).h;
    const target = sign.position.clone().addScaledVector(t, -10).addScaledVector(side, 4);
    target.y = sign.position.y;
    sign.lookAt(target);
    scene.add(sign);
  });

  const { car, wheels } = buildCar();
  scene.add(car);

  // ---------- input ----------
  const keys = new Set<string>();
  let activeStop: DriveStop | null = null;
  const openStop = () => {
    if (!activeStop?.href) return;
    if (activeStop.external) window.open(activeStop.href, '_blank', 'noopener');
    else {
      exit();
      window.location.href = activeStop.href;
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') return exit();
    if (e.key === 'Enter') return openStop();
    keys.add(e.key.toLowerCase());
    if (e.key.startsWith('Arrow')) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  const onResize = () => {
    renderer.setSize(root.clientWidth, root.clientHeight);
    camera.aspect = root.clientWidth / root.clientHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
  $('[data-exit]').addEventListener('click', () => exit());
  root.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach((btn) => {
    const key = btn.dataset.touch === 'gas' ? 'w' : 's';
    btn.addEventListener('pointerdown', () => keys.add(key));
    btn.addEventListener('pointerup', () => keys.delete(key));
    btn.addEventListener('pointerleave', () => keys.delete(key));
  });

  // ---------- loop ----------
  const card = $('[data-card]');
  const speedEl = $('[data-speed]');
  let distance = 0;
  let speed = 0;
  let lateral = -ROAD_WIDTH / 4;
  let raf = 0;
  const timer = new THREE.Timer();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  let first = true;

  const showCard = (stop: DriveStop | null) => {
    if (stop === activeStop) return;
    activeStop = stop;
    card.classList.toggle('opacity-0', !stop);
    card.classList.toggle('translate-y-4', !stop);
    if (!stop) return;
    $('[data-card-label]').textContent = stop.label;
    $('[data-card-title]').textContent = stop.title;
    $('[data-card-sub]').textContent = stop.subtitle;
    const link = $<HTMLAnchorElement>('[data-card-link]');
    link.hidden = !stop.href;
    if (stop.href) {
      link.href = stop.href;
      link.target = stop.external ? '_blank' : '_self';
      link.textContent = stop.kind === 'project' ? 'View repo ↗' : 'Read post →';
    }
  };

  const tick = () => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const gas = keys.has('w') || keys.has('arrowup');
    const brake = keys.has('s') || keys.has('arrowdown');
    const steer = (keys.has('a') || keys.has('arrowleft') ? -1 : 0) + (keys.has('d') || keys.has('arrowright') ? 1 : 0);
    if (gas) speed += 12 * dt;
    else if (brake) speed -= 22 * dt;
    else speed -= 4 * dt;
    speed = Math.min(MAX_SPEED, Math.max(0, speed));
    lateral = Math.min(ROAD_WIDTH / 2 - 1.2, Math.max(-ROAD_WIDTH / 2 + 1.2, lateral + steer * 6 * dt));
    distance = (distance + speed * dt) % length;

    const u = distance / length;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(t, up).normalize();
    car.position.copy(p).addScaledVector(side, lateral);
    car.lookAt(
      car.position
        .clone()
        .add(t)
        .addScaledVector(side, steer * 0.08 * Math.min(1, speed / 5))
    );
    wheels.forEach((w) => (w.rotation.x += (speed * dt) / 0.42));
    water.offset.x -= dt * 0.35;

    const flatT = new THREE.Vector3(t.x, 0, t.z).normalize();
    const wantPos = car.position
      .clone()
      .addScaledVector(flatT, -14)
      .add(new THREE.Vector3(0, 10, 0));
    const wantLook = car.position
      .clone()
      .addScaledVector(t, 6)
      .add(new THREE.Vector3(0, 1.2, 0));
    if (first) {
      camPos.copy(wantPos).add(new THREE.Vector3(0, 40, 0));
      camLook.copy(wantLook);
      first = false;
    }
    camPos.lerp(wantPos, 1 - Math.exp(-dt * 3));
    camLook.lerp(wantLook, 1 - Math.exp(-dt * 6));
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    sun.position.copy(car.position).add(sunOffset);
    sun.target.position.copy(car.position);

    let near: DriveStop | null = null;
    stopDistances.forEach((sd, i) => {
      const ahead = (sd - distance + length) % length;
      if (ahead < 70 || ahead > length - 25) near = stops[i];
    });
    showCard(near);
    speedEl.textContent = String(Math.round(speed * 3));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  function exit() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('resize', onResize);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((mat) => {
          mat.map?.dispose();
          mat.dispose();
        });
      }
    });
    renderer.dispose();
    onExit();
  }

  tick();
  requestAnimationFrame(() => $('[data-fade]').classList.add('opacity-0'));
}
