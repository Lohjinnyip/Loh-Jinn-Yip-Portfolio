import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
//  FIXED PIXEL-ART BACKGROUND — Katana-Zero-style Kuala Lumpur night skyline.
//  Layered parallax planes (low-res, nearest-filtered = crisp pixels) driven by
//  three.js: starry purple sky + moon, drifting clouds, neon-lit skyline with
//  the Petronas Twin Towers, Merdeka 118 and KL Tower, and a lady smoking on a
//  rooftop ledge on the right, gazing left across the city.
// ============================================================================

const TW = 480, TH = 270; // texture resolution (16:9) — low res = chunky pixels

// palettes
const SKY = { top: "#160f36", mid: "#2a1a55", horizon: "#4a2a6e", band: "#6a3a86" };
const NEON = ["#22d3ee", "#8be9fd", "#f472b6", "#ff5aa8", "#ffcf6b", "#c084fc", "#7dd3fc", "#4dd0e1"];

function makeRng(seed) {
  let s = seed % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// build a CanvasTexture from a draw callback, kept blocky with NearestFilter
function makeTex(draw) {
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// a lit window with a faint halo (fake bloom)
function win(ctx, x, y, w, h, color) {
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(x, y, w, h);
}

// ---- draw: sky (gradient + moon + stars) -----------------------------------
function drawSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, TH);
  g.addColorStop(0, SKY.top);
  g.addColorStop(0.4, SKY.mid);
  g.addColorStop(0.72, SKY.horizon);
  g.addColorStop(0.86, SKY.band);
  g.addColorStop(1, SKY.mid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TW, TH);

  // moon, upper-left-ish (so the lady on the right gazes toward it/the city)
  const mx = 118, my = 58, mr = 20;
  const mg = ctx.createRadialGradient(mx, my, 2, mx, my, mr * 2.6);
  mg.addColorStop(0, "rgba(253,251,232,0.55)");
  mg.addColorStop(1, "rgba(253,251,232,0)");
  ctx.fillStyle = mg;
  ctx.fillRect(mx - mr * 2.6, my - mr * 2.6, mr * 5.2, mr * 5.2);
  ctx.fillStyle = "#fdfbe8";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e6e1c6";
  [[mx - 6, my - 4, 4], [mx + 5, my + 3, 3], [mx + 2, my - 8, 2.5]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // horizon city-glow haze
  const hg = ctx.createRadialGradient(TW * 0.5, TH * 0.82, 10, TW * 0.5, TH * 0.82, TW * 0.5);
  hg.addColorStop(0, "rgba(120,80,180,0.35)");
  hg.addColorStop(1, "rgba(120,80,180,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, TH * 0.45, TW, TH * 0.55);

  // stars (upper region only), pixel squares
  const rng = makeRng(7);
  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rng() * TW);
    const y = Math.floor(rng() * TH * 0.6);
    const b = 0.3 + rng() * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${b.toFixed(2)})`;
    const s = rng() > 0.9 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
}

// ---- draw: cloud band near the top (transparent) ---------------------------
function drawClouds(ctx) {
  ctx.clearRect(0, 0, TW, TH);
  const rng = makeRng(42);
  for (let i = 0; i < 26; i++) {
    const x = rng() * TW * 1.1 - 20;
    const y = 8 + rng() * 70;
    const rx = 34 + rng() * 60;
    const ry = 12 + rng() * 20;
    ctx.fillStyle = `rgba(40,28,84,${(0.35 + rng() * 0.35).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(70,50,120,${(0.18 + rng() * 0.18).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y - ry * 0.5, rx * 0.7, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- draw: a row of buildings across the width -----------------------------
function drawSkyline(ctx, cfg) {
  const { baseY, minH, maxH, body, side, top, litProb, dim, seed } = cfg;
  const rng = makeRng(seed);
  let x = -12;
  while (x < TW + 12) {
    const w = 16 + Math.floor(rng() * 26);
    const h = minH + Math.floor(rng() * (maxH - minH));
    const y = baseY - h;
    // body + top edge + right shade (subtle 3D)
    ctx.fillStyle = body;
    ctx.fillRect(x, y, w, baseY - y);
    ctx.fillStyle = top;
    ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = side;
    ctx.fillRect(x + w - 3, y, 3, baseY - y);
    // windows
    for (let wy = y + 5; wy < baseY - 3; wy += 6) {
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

// ---- KL landmarks (drawn into the mid layer) -------------------------------
const LM = { body: "#1b2146", side: "#10132e", top: "#2f3a6c", ring: "#22d3ee" };

function petronasTower(ctx, cx, baseY) {
  const bodyTop = baseY - 96, t2 = baseY - 122, t3 = baseY - 140, coneTop = baseY - 152, spireTop = baseY - 168;
  const draw = (w, yTop) => {
    ctx.fillStyle = LM.body;
    ctx.fillRect(cx - w / 2, yTop, w, baseY - yTop);
    ctx.fillStyle = LM.side;
    ctx.fillRect(cx + w / 2 - 2, yTop, 2, baseY - yTop);
    ctx.fillStyle = LM.top;
    ctx.fillRect(cx - w / 2, yTop, w, 2);
  };
  draw(22, bodyTop);
  draw(16, t2);
  draw(11, t3);
  // cone + spire + ember
  ctx.fillStyle = LM.top;
  ctx.beginPath();
  ctx.moveTo(cx - 5, t3);
  ctx.lineTo(cx + 5, t3);
  ctx.lineTo(cx + 1.5, coneTop);
  ctx.lineTo(cx - 1.5, coneTop);
  ctx.fill();
  ctx.fillStyle = "#3a4270";
  ctx.fillRect(cx - 1, spireTop, 2, coneTop - spireTop);
  ctx.fillStyle = "#ffb347";
  ctx.fillRect(cx - 1.5, spireTop - 2, 3, 3);
  // setback rings + windows
  ctx.fillStyle = LM.ring;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx - 11, bodyTop, 22, 1.5);
  ctx.fillRect(cx - 8, t2, 16, 1.5);
  ctx.globalAlpha = 1;
  const rng = makeRng(cx * 3 + 1);
  for (let wy = bodyTop + 5; wy < baseY - 4; wy += 6)
    for (let c = -1; c <= 1; c++) if (rng() < 0.6) win(ctx, cx + c * 6 - 1, wy, 2, 3, "#bfe9ff");
}
function drawPetronas(ctx, cx, baseY) {
  petronasTower(ctx, cx - 15, baseY);
  petronasTower(ctx, cx + 15, baseY);
  // skybridge
  ctx.fillStyle = LM.top;
  ctx.fillRect(cx - 15, baseY - 74, 30, 2);
  ctx.fillRect(cx - 15, baseY - 69, 30, 2);
}

function drawMerdeka(ctx, cx, baseY) {
  const shaftTop = baseY - 152, spireTop = baseY - 190, wb = 26, wt = 8;
  ctx.fillStyle = LM.body;
  ctx.beginPath();
  ctx.moveTo(cx - wb / 2, baseY);
  ctx.lineTo(cx + wb / 2, baseY);
  ctx.lineTo(cx + wt / 2, shaftTop);
  ctx.lineTo(cx - wt / 2, shaftTop);
  ctx.fill();
  ctx.fillStyle = LM.side;
  ctx.beginPath();
  ctx.moveTo(cx + wb / 2 - 3, baseY);
  ctx.lineTo(cx + wb / 2, baseY);
  ctx.lineTo(cx + wt / 2, shaftTop);
  ctx.lineTo(cx + wt / 2 - 2, shaftTop);
  ctx.fill();
  // crown spire + ember
  ctx.fillStyle = LM.top;
  ctx.beginPath();
  ctx.moveTo(cx - wt / 2, shaftTop);
  ctx.lineTo(cx + wt / 2, shaftTop);
  ctx.lineTo(cx + 1.5, spireTop);
  ctx.lineTo(cx - 1.5, spireTop);
  ctx.fill();
  ctx.fillStyle = "#3a4270";
  ctx.fillRect(cx - 1, spireTop - 12, 2, 12);
  ctx.fillStyle = "#ff5a5a";
  ctx.fillRect(cx - 1.5, spireTop - 14, 3, 3);
  // faceted window columns
  const rng = makeRng(455);
  for (let wy = shaftTop + 8; wy < baseY - 4; wy += 6) {
    const frac = (baseY - wy) / (baseY - shaftTop);
    const half = (wb - (wb - wt) * frac) / 2 - 3;
    for (let wx = cx - half; wx <= cx + half; wx += 5)
      if (rng() < 0.5) win(ctx, wx, wy, 2, 3, rng() > 0.5 ? "#8be9fd" : "#ffcf6b");
  }
}

function drawKLTower(ctx, cx, baseY) {
  const podY = baseY - 96, antTop = baseY - 138;
  ctx.fillStyle = LM.body;
  ctx.beginPath();
  ctx.moveTo(cx - 5, baseY);
  ctx.lineTo(cx + 5, baseY);
  ctx.lineTo(cx + 3, podY);
  ctx.lineTo(cx - 3, podY);
  ctx.fill();
  ctx.fillStyle = LM.side;
  ctx.fillRect(cx + 1, podY, 2, baseY - podY);
  // bulb pod
  ctx.fillStyle = LM.body;
  ctx.beginPath();
  ctx.ellipse(cx, podY - 6, 9, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LM.top;
  ctx.beginPath();
  ctx.moveTo(cx - 9, podY - 8);
  ctx.quadraticCurveTo(cx, podY - 22, cx + 9, podY - 8);
  ctx.fill();
  // pod lit bands
  ctx.fillStyle = "#ffcf6b";
  ctx.globalAlpha = 0.85;
  ctx.fillRect(cx - 8, podY - 8, 16, 1.5);
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(cx - 6, podY - 3, 12, 1.5);
  ctx.globalAlpha = 1;
  // antenna + ember
  ctx.fillStyle = "#3a4270";
  ctx.fillRect(cx - 1, antTop, 2, podY - 14 - antTop);
  ctx.fillStyle = "#ff5a5a";
  ctx.fillRect(cx - 1.5, antTop - 2, 3, 3);
}

function drawMid(ctx) {
  ctx.clearRect(0, 0, TW, TH);
  const baseY = 202;
  drawSkyline(ctx, { baseY, minH: 30, maxH: 96, body: "#191636", side: "#0f0d24", top: "#2a2650", litProb: 0.5, dim: 0.35, seed: 88 });
  drawMerdeka(ctx, 232, baseY);
  drawPetronas(ctx, 128, baseY);
  drawKLTower(ctx, 312, baseY);
}

function drawFar(ctx) {
  ctx.clearRect(0, 0, TW, TH);
  drawSkyline(ctx, { baseY: 176, minH: 20, maxH: 64, body: "#241f47", side: "#1a1638", top: "#34406a", litProb: 0.22, dim: 0.25, seed: 21 });
}

function drawNear(ctx) {
  ctx.clearRect(0, 0, TW, TH);
  drawSkyline(ctx, { baseY: 226, minH: 40, maxH: 110, body: "#100d24", side: "#08060f", top: "#1c1838", litProb: 0.4, dim: 0.3, seed: 303 });
}

// ---- foreground: rooftop + ledge + neon sign + AC units --------------------
function drawForeground(ctx) {
  ctx.clearRect(0, 0, TW, TH);
  const roofY = 232;
  // rooftop slab
  ctx.fillStyle = "#08060f";
  ctx.fillRect(0, roofY, TW, TH - roofY);
  ctx.fillStyle = "#171430";
  ctx.fillRect(0, roofY, TW, 2);
  // low ledge / railing posts across the front
  ctx.fillStyle = "#0c0a1c";
  ctx.fillRect(0, roofY + 10, TW, 4);
  for (let x = 4; x < TW; x += 12) {
    ctx.fillStyle = "#141130";
    ctx.fillRect(x, roofY - 6, 3, 16);
    ctx.fillStyle = "#221e44";
    ctx.fillRect(x, roofY - 6, 1, 16);
  }
  ctx.fillStyle = "#0a0818";
  ctx.fillRect(0, roofY - 6, TW, 3);

  // AC units on the far right
  ctx.fillStyle = "#14122a";
  for (let i = 0; i < 2; i++) {
    const bx = 420 + i * 30;
    ctx.fillRect(bx, roofY - 14, 24, 14);
    ctx.strokeStyle = "#2a2650";
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 3, roofY - 11, 18, 8);
  }

  // neon sign box on the left
  const sx = 30, sy = 150, sw = 120, sh = 60;
  ctx.fillStyle = "#0c0a18";
  ctx.fillRect(sx, sy, sw, sh);
  ctx.fillStyle = "#1a1730";
  ctx.fillRect(sx, sy, sw, 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const glow = (text, x, y, font, color) => {
    ctx.font = font;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#f4faff";
    ctx.fillText(text, x, y);
  };
  glow("JINN", sx + sw / 2, sy + 22, "bold 20px 'Space Grotesk', sans-serif", "#22d3ee");
  glow("YIP.", sx + sw / 2, sy + 44, "bold 20px 'Space Grotesk', sans-serif", "#ff5aa8");
}

// ---- the lady, smoking, facing left ----------------------------------------
const LADY_W = 120, LADY_H = 210;
function drawLady() {
  const c = document.createElement("canvas");
  c.width = LADY_W;
  c.height = LADY_H;
  const ctx = c.getContext("2d");
  const S = "#050409"; // silhouette
  ctx.fillStyle = S;
  // long coat / dress (flared at hem), facing left
  ctx.beginPath();
  ctx.moveTo(46, LADY_H);
  ctx.bezierCurveTo(34, 150, 44, 96, 58, 60);
  ctx.bezierCurveTo(62, 50, 78, 50, 82, 62);
  ctx.bezierCurveTo(94, 100, 98, 152, 88, LADY_H);
  ctx.closePath();
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(62, 44, 13, 0, Math.PI * 2);
  ctx.fill();
  // hair falling down the back (right side, since she faces left)
  ctx.beginPath();
  ctx.moveTo(70, 34);
  ctx.bezierCurveTo(84, 44, 84, 90, 74, 116);
  ctx.lineTo(64, 112);
  ctx.bezierCurveTo(72, 84, 70, 52, 62, 36);
  ctx.closePath();
  ctx.fill();
  // near arm bent up to the mouth (cigarette hand)
  ctx.lineWidth = 8;
  ctx.strokeStyle = S;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(60, 78);
  ctx.lineTo(48, 66);
  ctx.lineTo(52, 50);
  ctx.stroke();

  // rim light on the left edge (city/moon glow)
  ctx.strokeStyle = "rgba(140,180,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(50, 56);
  ctx.bezierCurveTo(40, 96, 34, 150, 46, LADY_H);
  ctx.stroke();
  ctx.fillStyle = "rgba(150,200,255,0.4)";
  ctx.beginPath();
  ctx.arc(51, 42, 12, Math.PI * 0.6, Math.PI * 1.35);
  ctx.stroke();

  // cigarette + ember at the mouth
  ctx.fillStyle = "#d8d8e0";
  ctx.fillRect(44, 49, 6, 2);
  ctx.fillStyle = "#ff8a3d";
  ctx.fillRect(42, 49, 2, 2);

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
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

function coverSize(vw, vh, over = 1.25) {
  const ta = TW / TH;
  let w = vh * ta, h = vh;
  if (w < vw) {
    w = vw;
    h = vw / ta;
  }
  return { w: w * over, h: h * over };
}

const flatMat = (tex) => ({
  map: tex,
  transparent: true,
  depthTest: false,
  depthWrite: false,
  toneMapped: false,
});

// a single full-screen parallax plane
function Layer({ tex, w, h, order, factor, drift = 0, scroll }) {
  const ref = useRef(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const p = scroll.current;
    const amp = h * 0.08;
    const px = state.pointer.x, py = state.pointer.y;
    g.position.y = p * amp * factor + py * h * 0.012 * factor;
    let x = px * w * 0.012 * factor;
    if (drift) x += ((state.clock.elapsedTime * drift) % (w * 0.4)) - w * 0.2;
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
    () => Array.from({ length: N }, (_, i) => ({ phase: i / N, speed: 0.12 + (i % 5) * 0.02, sway: 6 + (i % 4) * 3 })),
    []
  );
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    parts.forEach((pt, i) => {
      const m = refs.current[i];
      if (!m) return;
      const life = (t * pt.speed + pt.phase) % 1;
      const rise = size * 1.4;
      m.position.set(
        origin[0] - life * size * 0.25 + Math.sin(life * 6 + i) * size * 0.03 * pt.sway * 0.1,
        origin[1] + life * rise,
        1
      );
      const sc = size * (0.05 + life * 0.22);
      m.scale.set(sc, sc, 1);
      m.material.opacity = Math.sin(life * Math.PI) * 0.28;
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
  const { w, h } = coverSize(viewport.width, viewport.height);

  const tex = useMemo(
    () => ({
      sky: makeTex(drawSky),
      clouds: makeTex(drawClouds),
      far: makeTex(drawFar),
      mid: makeTex(drawMid),
      near: makeTex(drawNear),
      fg: makeTex(drawForeground),
      lady: drawLady(),
    }),
    []
  );

  // lady placement: standing on the rooftop line, right side, facing left.
  // X is anchored to the *visible viewport* (not the overscanned cover) so she
  // never clips off-screen.
  const roofTopY = -h / 2 + h * (1 - 232 / TH); // world-Y of rooftop top edge
  const ladyH = h * 0.28;
  const ladyW = ladyH * (LADY_W / LADY_H);
  const ladyX = viewport.width * 0.32;
  const ladyY = roofTopY + ladyH / 2 - h * 0.01;
  // mouth / cigarette anchor (sprite faces left → mouth toward left)
  const mouthX = ladyX - ladyW * 0.14;
  const mouthY = ladyY + ladyH * 0.24;

  return (
    <>
      <color attach="background" args={[SKY.top]} />
      <Layer tex={tex.sky} w={w} h={h} order={0} factor={0.15} scroll={scroll} />
      <Layer tex={tex.clouds} w={w} h={h} order={1} factor={0.3} drift={6} scroll={scroll} />
      <Layer tex={tex.far} w={w} h={h} order={2} factor={0.5} scroll={scroll} />
      <Layer tex={tex.mid} w={w} h={h} order={3} factor={0.8} scroll={scroll} />
      <Layer tex={tex.near} w={w} h={h} order={4} factor={1.1} scroll={scroll} />
      <Layer tex={tex.fg} w={w} h={h} order={5} factor={1.35} scroll={scroll} />

      <mesh position={[ladyX, ladyY, 0]} renderOrder={20}>
        <planeGeometry args={[ladyW, ladyH]} />
        <meshBasicMaterial {...flatMat(tex.lady)} />
      </mesh>
      <Ember pos={[mouthX - ladyW * 0.1, mouthY]} size={ladyH} />
      <Smoke origin={[mouthX - ladyW * 0.1, mouthY]} size={ladyH} />
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
