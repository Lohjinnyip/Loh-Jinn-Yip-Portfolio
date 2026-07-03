import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
//  FIXED PIXEL-ART BACKGROUND — Katana-Zero-style Kuala Lumpur night skyline.
//  Composition is locked to viewport fractions (independent of aspect):
//      sky  ≈ top 40%   |   city ≈ 50%   |   balcony ≈ bottom 10%.
//  Layered parallax planes (low-res, nearest-filtered = crisp pixels) driven by
//  three.js: starry purple sky + moon, drifting clouds, neon skyline with the
//  Petronas Twin Towers, Merdeka 118 and KL Tower, and a lady smoking on a
//  rooftop ledge on the right, gazing left across the city.
// ============================================================================

const TW = 640, TH = 360; // texture resolution (16:9) — low res = chunky pixels
const ROOF = 0.88;        // viewport fraction where the skyline/balcony meet

const SKY = { top: "#160f36", mid: "#2a1a55", horizon: "#452a6a", band: "#5f3880" };
const NEON = ["#22d3ee", "#8be9fd", "#f472b6", "#ff5aa8", "#ffcf6b", "#c084fc", "#7dd3fc", "#4dd0e1"];

function makeRng(seed) {
  let s = seed % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function makeTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// lit window with a faint halo (fake bloom)
function win(ctx, x, y, w, h, color) {
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(x, y, w, h);
}

// ---- sky: gradient + moon (upper-right) + stars ----------------------------
function drawSky(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, SKY.top);
  g.addColorStop(0.45, SKY.mid);
  g.addColorStop(0.78, SKY.horizon);
  g.addColorStop(0.9, SKY.band);
  g.addColorStop(1, SKY.mid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // horizon city-glow haze near where the skyline sits
  const hy = H * 0.85;
  const hg = ctx.createRadialGradient(W * 0.5, hy, 10, W * 0.5, hy, W * 0.5);
  hg.addColorStop(0, "rgba(120,80,180,0.35)");
  hg.addColorStop(1, "rgba(120,80,180,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);

  // stars, upper region, pixel squares
  const rng = makeRng(7);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rng() * W);
    const y = Math.floor(rng() * H * 0.7);
    const b = 0.3 + rng() * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${b.toFixed(2)})`;
    const s = rng() > 0.9 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
}

function drawClouds(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const rng = makeRng(42);
  for (let i = 0; i < 22; i++) {
    const x = rng() * W * 1.1 - 30;
    const y = 8 + rng() * H * 0.22;
    const rx = 30 + rng() * 54;
    const ry = 10 + rng() * 15;
    ctx.fillStyle = `rgba(38,26,80,${(0.14 + rng() * 0.16).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(70,50,120,${(0.08 + rng() * 0.1).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - ry * 0.5, rx * 0.7, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// buildings anchored to the BOTTOM of the texture (baseY = H). Heights are
// fractions of H so the plane height alone controls on-screen size.
function drawSkyline(ctx, W, H, cfg) {
  const { minH, maxH, body, side, top, litProb, dim, seed } = cfg;
  const rng = makeRng(seed);
  let x = -14;
  while (x < W + 14) {
    const w = 14 + Math.floor(rng() * 22);
    const h = Math.floor((minH + rng() * (maxH - minH)) * H);
    const y = H - h;
    ctx.fillStyle = body;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = top;
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = side;
    ctx.fillRect(x + w - 3, y, 3, h);
    for (let wy = y + 6; wy < H - 4; wy += 7) {
      for (let wx = x + 3; wx < x + w - 4; wx += 5) {
        if (rng() < litProb) win(ctx, wx, wy, 2, 3, pick(rng, NEON));
        else {
          ctx.globalAlpha = dim;
          ctx.fillStyle = "#20264a";
          ctx.fillRect(wx, wy, 2, 3);
          ctx.globalAlpha = 1;
        }
      }
    }
    x += w + 2 + Math.floor(rng() * 5);
  }
}

// ---- KL landmarks (drawn into the mid layer, anchored at baseY = H) --------
const LM = { body: "#1b2146", side: "#10132e", top: "#2f3a6c", ring: "#22d3ee" };

function petronasTower(ctx, cx, baseY) {
  const bodyTop = baseY - 190, t2 = baseY - 236, t3 = baseY - 268, coneTop = baseY - 292, spireTop = baseY - 322;
  const draw = (w, yTop) => {
    ctx.fillStyle = LM.body;
    ctx.fillRect(cx - w / 2, yTop, w, baseY - yTop);
    ctx.fillStyle = LM.side;
    ctx.fillRect(cx + w / 2 - 3, yTop, 3, baseY - yTop);
    ctx.fillStyle = LM.top;
    ctx.fillRect(cx - w / 2, yTop, w, 2);
  };
  draw(30, bodyTop);
  draw(22, t2);
  draw(15, t3);
  ctx.fillStyle = LM.top;
  ctx.beginPath();
  ctx.moveTo(cx - 7, t3);
  ctx.lineTo(cx + 7, t3);
  ctx.lineTo(cx + 2, coneTop);
  ctx.lineTo(cx - 2, coneTop);
  ctx.fill();
  ctx.fillStyle = "#3a4270";
  ctx.fillRect(cx - 1.5, spireTop, 3, coneTop - spireTop);
  ctx.fillStyle = "#ffb347";
  ctx.fillRect(cx - 2, spireTop - 3, 4, 4);
  ctx.fillStyle = LM.ring;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx - 15, bodyTop, 30, 2);
  ctx.fillRect(cx - 11, t2, 22, 2);
  ctx.globalAlpha = 1;
  const rng = makeRng(cx * 3 + 1);
  for (let wy = bodyTop + 7; wy < baseY - 5; wy += 8)
    for (let c = -1; c <= 1; c++) if (rng() < 0.6) win(ctx, cx + c * 8 - 1, wy, 2, 4, "#bfe9ff");
}
function drawPetronas(ctx, cx, baseY) {
  petronasTower(ctx, cx - 20, baseY);
  petronasTower(ctx, cx + 20, baseY);
  ctx.fillStyle = LM.top;
  ctx.fillRect(cx - 20, baseY - 146, 40, 3);
  ctx.fillRect(cx - 20, baseY - 138, 40, 3);
}

function drawMerdeka(ctx, cx, baseY) {
  const shaftTop = baseY - 300, spireTop = baseY - 348, wb = 34, wt = 10;
  ctx.fillStyle = LM.body;
  ctx.beginPath();
  ctx.moveTo(cx - wb / 2, baseY);
  ctx.lineTo(cx + wb / 2, baseY);
  ctx.lineTo(cx + wt / 2, shaftTop);
  ctx.lineTo(cx - wt / 2, shaftTop);
  ctx.fill();
  ctx.fillStyle = LM.side;
  ctx.beginPath();
  ctx.moveTo(cx + wb / 2 - 4, baseY);
  ctx.lineTo(cx + wb / 2, baseY);
  ctx.lineTo(cx + wt / 2, shaftTop);
  ctx.lineTo(cx + wt / 2 - 3, shaftTop);
  ctx.fill();
  ctx.fillStyle = LM.top;
  ctx.beginPath();
  ctx.moveTo(cx - wt / 2, shaftTop);
  ctx.lineTo(cx + wt / 2, shaftTop);
  ctx.lineTo(cx + 2, spireTop);
  ctx.lineTo(cx - 2, spireTop);
  ctx.fill();
  ctx.fillStyle = "#3a4270";
  ctx.fillRect(cx - 1.5, spireTop - 16, 3, 16);
  ctx.fillStyle = "#ff5a5a";
  ctx.fillRect(cx - 2, spireTop - 19, 4, 4);
  const rng = makeRng(455);
  for (let wy = shaftTop + 10; wy < baseY - 5; wy += 8) {
    const frac = (baseY - wy) / (baseY - shaftTop);
    const half = (wb - (wb - wt) * frac) / 2 - 4;
    for (let wx = cx - half; wx <= cx + half; wx += 6)
      if (rng() < 0.5) win(ctx, wx, wy, 2, 4, rng() > 0.5 ? "#8be9fd" : "#ffcf6b");
  }
}

function drawKLTower(ctx, cx, baseY) {
  const podY = baseY - 190, antTop = baseY - 268;
  ctx.fillStyle = LM.body;
  ctx.beginPath();
  ctx.moveTo(cx - 7, baseY);
  ctx.lineTo(cx + 7, baseY);
  ctx.lineTo(cx + 4, podY);
  ctx.lineTo(cx - 4, podY);
  ctx.fill();
  ctx.fillStyle = LM.side;
  ctx.fillRect(cx + 1, podY, 3, baseY - podY);
  ctx.fillStyle = LM.body;
  ctx.beginPath();
  ctx.ellipse(cx, podY - 8, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LM.top;
  ctx.beginPath();
  ctx.moveTo(cx - 12, podY - 10);
  ctx.quadraticCurveTo(cx, podY - 30, cx + 12, podY - 10);
  ctx.fill();
  ctx.fillStyle = "#ffcf6b";
  ctx.globalAlpha = 0.85;
  ctx.fillRect(cx - 11, podY - 10, 22, 2);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(cx - 8, podY - 4, 16, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#3a4270";
  ctx.fillRect(cx - 1.5, antTop, 3, podY - 18 - antTop);
  ctx.fillStyle = "#ff5a5a";
  ctx.fillRect(cx - 2, antTop - 3, 4, 4);
}

function drawMid(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  drawSkyline(ctx, W, H, { minH: 0.18, maxH: 0.52, body: "#191636", side: "#0f0d24", top: "#2a2650", litProb: 0.5, dim: 0.35, seed: 88 });
  drawMerdeka(ctx, W * 0.5, H);
  drawPetronas(ctx, W * 0.2, H);
  drawKLTower(ctx, W * 0.7, H);
}
function drawFar(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  drawSkyline(ctx, W, H, { minH: 0.12, maxH: 0.34, body: "#241f47", side: "#1a1638", top: "#34406a", litProb: 0.22, dim: 0.25, seed: 21 });
}
function drawNear(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  drawSkyline(ctx, W, H, { minH: 0.22, maxH: 0.6, body: "#100d24", side: "#08060f", top: "#1c1838", litProb: 0.4, dim: 0.3, seed: 303 });
}

// ---- balcony strip: slab + railing + neon sign + AC units ------------------
const BH = 260; // balcony texture height; plane spans viewport 0.80..1.06
function drawBalcony(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const slabY = Math.round(H * 0.31); // = ROOF line within this strip
  ctx.fillStyle = "#08060f";
  ctx.fillRect(0, slabY, W, H - slabY);
  ctx.fillStyle = "#171430";
  ctx.fillRect(0, slabY, W, 3);
  // railing
  for (let x = 4; x < W; x += 16) {
    ctx.fillStyle = "#141130";
    ctx.fillRect(x, slabY - 18, 4, 22);
    ctx.fillStyle = "#221e44";
    ctx.fillRect(x, slabY - 18, 1.5, 22);
  }
  ctx.fillStyle = "#0a0818";
  ctx.fillRect(0, slabY - 18, W, 4);
  ctx.fillStyle = "#0c0a1c";
  ctx.fillRect(0, slabY + 14, W, 5);

  // AC units, right
  ctx.fillStyle = "#14122a";
  for (let i = 0; i < 2; i++) {
    const bx = W - 150 + i * 42;
    ctx.fillRect(bx, slabY - 22, 34, 22);
    ctx.strokeStyle = "#2a2650";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 4, slabY - 17, 26, 12);
  }

  // neon billboard, left (stands on the slab, rises above the roofline).
  // sx is kept right of the 1.4× overscan margin (u≈0.143) so it stays on-screen.
  const sx = 118, sw = 150, sTop = 30, sBot = slabY - 2;
  ctx.fillStyle = "#0c0a18";
  ctx.fillRect(sx, sTop, sw, sBot - sTop);
  ctx.fillStyle = "#1a1730";
  ctx.fillRect(sx, sTop, sw, 3);
  ctx.fillStyle = "#0a0818";
  ctx.fillRect(sx + sw / 2 - 3, sBot, 6, H - sBot); // post
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glow = (text, x, y, color) => {
    ctx.font = "bold 24px 'Space Grotesk', sans-serif";
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f4faff";
    ctx.fillText(text, x, y);
  };
  glow("JINN", sx + sw / 2, sTop + (sBot - sTop) * 0.34, "#22d3ee");
  glow("YIP.", sx + sw / 2, sTop + (sBot - sTop) * 0.7, "#ff5aa8");
}

// ---- the lady, smoking, facing left (detailed feminine silhouette) ---------
const LADY_W = 160, LADY_H = 320;
const MOUTH_U = 0.30, MOUTH_V = 0.17; // cigarette anchor in sprite UV
function drawLady() {
  const c = document.createElement("canvas");
  c.width = LADY_W;
  c.height = LADY_H;
  const ctx = c.getContext("2d");
  const B = "#050409";
  ctx.fillStyle = B;

  // long dress / gown — cinched waist, A-line flare (hourglass silhouette)
  ctx.beginPath();
  ctx.moveTo(56, 300);
  ctx.quadraticCurveTo(58, 232, 66, 168); // left hip/skirt
  ctx.quadraticCurveTo(56, 142, 65, 118); // waist pinch (left)
  ctx.quadraticCurveTo(60, 98, 71, 86);   // bust → shoulder (left)
  ctx.lineTo(85, 86);                      // shoulder line
  ctx.quadraticCurveTo(93, 100, 90, 120);  // right shoulder → waist
  ctx.quadraticCurveTo(97, 144, 95, 168);  // right hip
  ctx.quadraticCurveTo(101, 232, 98, 300); // skirt hem (right)
  ctx.closePath();
  ctx.fill();

  // slender lower legs + heels below the hem
  ctx.fillRect(66, 296, 8, 20);
  ctx.fillRect(84, 296, 8, 20);
  ctx.beginPath();
  ctx.moveTo(60, 316);
  ctx.lineTo(74, 314);
  ctx.lineTo(74, 318);
  ctx.lineTo(62, 320);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(84, 314);
  ctx.lineTo(96, 316);
  ctx.lineTo(94, 320);
  ctx.lineTo(84, 318);
  ctx.fill();

  // neck + head (facing left, small nose profile)
  ctx.fillRect(72, 72, 8, 16);
  ctx.beginPath();
  ctx.arc(75, 54, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(61, 50);
  ctx.lineTo(56, 54);
  ctx.lineTo(61, 58);
  ctx.fill();

  // long flowing hair down the back (right side)
  ctx.beginPath();
  ctx.moveTo(82, 42);
  ctx.bezierCurveTo(104, 54, 102, 132, 88, 192);
  ctx.lineTo(74, 186);
  ctx.bezierCurveTo(88, 132, 86, 66, 73, 44);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(75, 48, 17, Math.PI * 1.02, Math.PI * 2.0);
  ctx.fill();

  // arms: near arm bent to the mouth, far hand resting on the hip
  ctx.strokeStyle = B;
  ctx.lineCap = "round";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(73, 100);
  ctx.lineTo(58, 126);
  ctx.lineTo(60, 60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(87, 100);
  ctx.lineTo(99, 126);
  ctx.lineTo(91, 150);
  ctx.stroke();

  // cool moon/city rim light on the left contour
  ctx.strokeStyle = "rgba(150,195,255,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(56, 300);
  ctx.quadraticCurveTo(58, 232, 66, 168);
  ctx.quadraticCurveTo(56, 142, 65, 118);
  ctx.quadraticCurveTo(60, 98, 71, 86);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(75, 54, 15, Math.PI * 0.55, Math.PI * 1.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(58, 126);
  ctx.lineTo(60, 60);
  ctx.stroke();

  // cigarette + ember at the lips
  ctx.fillStyle = "#e8e8f0";
  ctx.fillRect(49, 54, 8, 2);
  ctx.fillStyle = "#ff8a3d";
  ctx.fillRect(46, 54, 3, 2);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function moonTexture() {
  const S = 160;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const cx = S / 2, cy = S / 2, r = S * 0.26;
  // soft glow
  const gg = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, S * 0.5);
  gg.addColorStop(0, "rgba(253,251,232,0.45)");
  gg.addColorStop(1, "rgba(253,251,232,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, S, S);
  // disc
  ctx.fillStyle = "#fdfbe8";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // craters
  ctx.fillStyle = "#e6e1c6";
  [[-0.35, -0.2, 0.22], [0.3, 0.15, 0.16], [0.1, -0.42, 0.12], [-0.1, 0.36, 0.13]].forEach(([dx, dy, rr]) => {
    ctx.beginPath();
    ctx.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  });
  return new THREE.CanvasTexture(c);
}

function Moon({ x, y, size }) {
  const tex = useMemo(() => moonTexture(), []);
  return (
    <mesh position={[x, y, 0]} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function puffTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(200,200,220,0.9)");
  g.addColorStop(1, "rgba(200,200,220,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

// ============================================================================

const flatMat = (tex) => ({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });

// Full-width parallax band anchored between two viewport fractions (from top).
function Band({ tex, topFrac, botFrac, order, factor, drift = 0, scroll }) {
  const ref = useRef(null);
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const w = vw * 1.4;
  const top = vh * 0.5 - topFrac * vh;
  const bot = vh * 0.5 - botFrac * vh;
  const h = top - bot;
  const cy = (top + bot) / 2;
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const amp = vh * 0.06;
    g.position.y = cy + scroll.current * amp * factor + state.pointer.y * vh * 0.01 * factor;
    let x = state.pointer.x * vw * 0.012 * factor;
    if (drift) x += ((state.clock.elapsedTime * drift) % (w * 0.3)) - w * 0.15;
    g.position.x = x;
  });
  return (
    <mesh ref={ref} renderOrder={order}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial {...flatMat(tex)} />
    </mesh>
  );
}

function Smoke({ origin, size }) {
  const tex = useMemo(() => puffTexture(), []);
  const N = 14;
  const parts = useMemo(
    () => Array.from({ length: N }, (_, i) => ({ phase: i / N, speed: 0.11 + (i % 5) * 0.02 })),
    []
  );
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    parts.forEach((pt, i) => {
      const m = refs.current[i];
      if (!m) return;
      const life = (t * pt.speed + pt.phase) % 1;
      m.position.set(
        origin[0] - life * size * 0.2 + Math.sin(life * 6 + i) * size * 0.04,
        origin[1] + life * size * 1.15,
        1
      );
      const sc = size * (0.05 + life * 0.24);
      m.scale.set(sc, sc, 1);
      m.material.opacity = Math.sin(life * Math.PI) * 0.26;
    });
  });
  return (
    <group renderOrder={30}>
      {parts.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} renderOrder={30}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} opacity={0} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Ember({ pos, size }) {
  const ref = useRef(null);
  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const f = 0.6 + Math.abs(Math.sin(state.clock.elapsedTime * 1.7)) * 0.4;
    m.material.opacity = f;
    const s = size * 0.02 * (0.85 + f * 0.3);
    m.scale.set(s, s, 1);
  });
  return (
    <mesh ref={ref} position={[pos[0], pos[1], 1]} renderOrder={29}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color="#ff8a3d" transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Scene({ scroll }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;

  const tex = useMemo(
    () => ({
      sky: makeTex(TW, TH, drawSky),
      clouds: makeTex(TW, TH, drawClouds),
      far: makeTex(TW, TH, drawFar),
      mid: makeTex(TW, TH, drawMid),
      near: makeTex(TW, TH, drawNear),
      balcony: makeTex(TW, BH, drawBalcony),
      lady: drawLady(),
    }),
    []
  );

  // lady: stands on the roofline, right side, facing left
  const roofY = vh * 0.5 - ROOF * vh;
  const ladyH = vh * 0.33;
  const ladyW = ladyH * (LADY_W / LADY_H);
  const ladyX = vw * 0.37;
  const ladyY = roofY + ladyH / 2;
  const mouthX = ladyX + (MOUTH_U - 0.5) * ladyW;
  const mouthY = ladyY + (0.5 - MOUTH_V) * ladyH;

  return (
    <>
      <color attach="background" args={[SKY.top]} />
      {/* sky ~top 40%, city ~50%, balcony ~bottom 10% */}
      <Band tex={tex.sky} topFrac={-0.05} botFrac={1.05} order={0} factor={0.1} scroll={scroll} />
      <Moon x={vw * 0.33} y={vh * 0.28} size={vh * 0.2} />
      <Band tex={tex.clouds} topFrac={-0.05} botFrac={1.05} order={1} factor={0.25} drift={7} scroll={scroll} />
      <Band tex={tex.far} topFrac={ROOF - 0.44} botFrac={ROOF} order={2} factor={0.45} scroll={scroll} />
      <Band tex={tex.mid} topFrac={ROOF - 0.5} botFrac={ROOF} order={3} factor={0.75} scroll={scroll} />
      <Band tex={tex.near} topFrac={ROOF - 0.5} botFrac={ROOF} order={4} factor={1.0} scroll={scroll} />
      <Band tex={tex.balcony} topFrac={0.8} botFrac={1.06} order={5} factor={1.3} scroll={scroll} />

      <mesh position={[ladyX, ladyY, 0]} renderOrder={20}>
        <planeGeometry args={[ladyW, ladyH]} />
        <meshBasicMaterial {...flatMat(tex.lady)} />
      </mesh>
      <Ember pos={[mouthX - ladyW * 0.03, mouthY]} size={ladyH} />
      <Smoke origin={[mouthX - ladyW * 0.03, mouthY]} size={ladyH} />
    </>
  );
}

export default function CityBackground() {
  const scroll = useRef(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        scroll.current = p;
        doc.style.setProperty("--p", p.toFixed(4)); // still drives CSS (scroll-hint fade)
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="bg-scene" aria-hidden="true">
      <Canvas orthographic camera={{ position: [0, 0, 100], near: 0.1, far: 1000, zoom: 1 }} dpr={[1, 2]}>
        <Scene scroll={scroll} />
      </Canvas>
      <div className="vignette" />
    </div>
  );
}
