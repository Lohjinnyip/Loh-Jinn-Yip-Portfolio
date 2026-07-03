import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
//  FIXED PIXEL-ART BACKGROUND — Katana-Zero-style Kuala Lumpur night skyline.
//
//  Five parallax layers, front → back:
//    1. balcony   2–4. three city layers (short→tall)   5. starry sky
//  Plus three tall KL landmarks (Petronas Twin Towers, Merdeka 118, KL Tower)
//  whose LED façades cycle through RGB colours continuously.
//
//  Each layer's texture is generated to match the viewport, so buildings draw
//  at natural width (no stretching) and stay crisp pixels.
//
//  Scroll pans the whole scene UP: top ≈ sky 35 / city 50 / balcony 15,
//  bottom ≈ sky 10 / city 50 / balcony 40.
// ============================================================================

const PX = 4;            // art-pixel size (screen px per texel) → chunky pixels
const OVER = 1.25;       // horizontal overscan for parallax room
const ROOF0 = 0.85;      // roofline (viewport fraction) at top of page
const ROOF1 = 0.6;       // roofline at bottom of page
const SHIFT = ROOF0 - ROOF1;
const CITY_H = 0.5;      // city band ≈ 50% of viewport
const CITY_BLEED = 0.08; // city extends below the roofline (hidden by balcony)
const CITY_LIFT = 0.97;  // vertical parallax factor shared by city + landmarks

const SKY = { top: "#160f36", mid: "#2a1a55", horizon: "#452a6a", band: "#5f3880" };
const NEON = ["#22d3ee", "#8be9fd", "#f472b6", "#ff5aa8", "#ffcf6b", "#c084fc", "#7dd3fc", "#4dd0e1"];

function makeRng(seed) {
  let s = seed % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function makeTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = Math.max(2, w);
  c.height = Math.max(2, h);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  draw(ctx, c.width, c.height);
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

// ---- white-on-transparent LED helpers (colourised + additive at render) ----
function ledLine(ctx, pts, core = 1.6) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = core + 3;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = core;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}
function ledDot(ctx, x, y, s = 1.4) {
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#fff";
  ctx.fillRect(x - s, y - s, s * 3, s * 3);
  ctx.globalAlpha = 1;
  ctx.fillRect(x, y, s, s);
}

// ---- sky: gradient + faint clouds + stars ----------------------------------
function drawSky(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, SKY.top);
  g.addColorStop(0.5, SKY.mid);
  g.addColorStop(0.78, SKY.horizon);
  g.addColorStop(0.86, SKY.band);
  g.addColorStop(1, SKY.mid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const hy = H * 0.82;
  const hg = ctx.createRadialGradient(W * 0.5, hy, 4, W * 0.5, hy, W * 0.5);
  hg.addColorStop(0, "rgba(120,80,180,0.30)");
  hg.addColorStop(1, "rgba(120,80,180,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);

  const crng = makeRng(42);
  for (let i = 0; i < 9; i++) {
    const x = crng() * W;
    const y = H * (0.06 + crng() * 0.2);
    const rx = W * (0.04 + crng() * 0.06);
    ctx.fillStyle = `rgba(40,28,82,${(0.06 + crng() * 0.07).toFixed(2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // stars are their own rotating layer now (see StarField)
}

// ---- one upgraded (non-boxy) building --------------------------------------
function building(ctx, x, y, w, h, cfg) {
  const { body, bodyR, edge, roof, dim, density, rng } = cfg;
  const H = y + h;
  const shade = Math.max(3, Math.round(w * 0.16));
  // themed towers: sometimes all windows share one neon colour
  const themed = rng() < 0.3 ? pick(rng, NEON) : null;
  const winCol = () => themed || pick(rng, NEON);

  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = bodyR;
  ctx.fillRect(x + w - shade, y, shade, h);
  ctx.fillStyle = edge;
  ctx.fillRect(x, y, w, 2);

  // roof feature — breaks the flat box silhouette
  const rt = rng();
  if (rt < 0.24) {
    // stepped penthouse (may add a 2nd step for tall ones)
    let cw = w, cy = y;
    const steps = h > 60 ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      const pw = Math.round(cw * (0.5 + rng() * 0.18));
      const px = x + Math.round((w - pw) / 2 + (cw - pw) * 0.1);
      const ph = 7 + Math.floor(rng() * 12);
      ctx.fillStyle = body;
      ctx.fillRect(px, cy - ph, pw, ph);
      ctx.fillStyle = bodyR;
      ctx.fillRect(px + pw - shade, cy - ph, shade, ph);
      ctx.fillStyle = edge;
      ctx.fillRect(px, cy - ph, pw, 2);
      cw = pw;
      cy -= ph;
    }
    ctx.fillStyle = roof;
    ctx.fillRect(x + Math.round(w / 2) - 1, cy - 8, 2, 8);
  } else if (rt < 0.44) {
    ctx.fillStyle = body; // water tank + vent
    ctx.fillRect(x + Math.round(w * 0.18), y - 7, Math.round(w * 0.28), 7);
    ctx.fillStyle = roof;
    ctx.fillRect(x + Math.round(w * 0.62), y - 5, 3, 5);
  } else if (rt < 0.58) {
    ctx.fillStyle = roof; // antenna mast + red aircraft light
    ctx.fillRect(x + Math.round(w / 2) - 1, y - 15, 2, 15);
    ctx.fillStyle = "#ff5a5a";
    ctx.fillRect(x + Math.round(w / 2) - 1, y - 17, 3, 3);
  } else if (rt < 0.68) {
    ctx.fillStyle = SKY.top; // clipped/slanted corner
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.round(w * 0.4), y);
    ctx.lineTo(x, y + Math.round(h * 0.12));
    ctx.closePath();
    ctx.fill();
  }

  // rooftop billboard sign
  if (rng() < 0.14 && w > 22) {
    const bw = Math.round(w * 0.6), bx = x + Math.round((w - bw) / 2), by = y - 12;
    ctx.fillStyle = "#0c0a18";
    ctx.fillRect(bx, by, bw, 9);
    win(ctx, bx + 2, by + 2, bw - 4, 5, pick(rng, NEON));
  }

  // vertical neon accent on an edge
  if (rng() < 0.16) {
    ctx.fillStyle = winCol();
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + 1, y + 4, 1.5, h - 6);
    ctx.globalAlpha = 1;
  }

  // windows
  for (let wy = y + 5; wy < H - 3; wy += 6) {
    const fullFloor = rng() < 0.1;
    for (let wx = x + 3; wx < x + w - 4; wx += 5) {
      if (fullFloor) win(ctx, wx, wy, 3, 3, winCol());
      else if (rng() < density) win(ctx, wx, wy, 2, 3, winCol());
      else {
        ctx.globalAlpha = dim;
        ctx.fillStyle = "#20264a";
        ctx.fillRect(wx, wy, 2, 3);
        ctx.globalAlpha = 1;
      }
    }
  }
  if (rng() < 0.4) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ffcf6b";
    ctx.fillRect(x + 2, H - 5, w - 4, 3);
    ctx.globalAlpha = 1;
  }
}

function cityDrawer(seed, minF, maxF, palette, density, dim) {
  return (ctx, W, H) => {
    ctx.clearRect(0, 0, W, H);
    const cfg = { rng: makeRng(seed), minF, maxF, density, dim, ...palette };
    let x = -18;
    while (x < W + 18) {
      const w = 16 + Math.floor(cfg.rng() * 24);
      const h = Math.round((minF + cfg.rng() * (maxF - minF)) * H);
      building(ctx, x, H - h, w, h, cfg);
      x += w + 1 + Math.floor(cfg.rng() * 4);
    }
  };
}

// ============================================================================
//  KL LANDMARKS — each draws a dark STRUCTURE (led=false) or a white LED MASK
//  (led=true). The mask is rendered additively with an animated cycling hue.
// ============================================================================

function profHalf(prof, y) {
  for (let i = 0; i < prof.length - 1; i++) {
    const [y1, f1] = prof[i], [y2, f2] = prof[i + 1];
    if (y <= y1 && y >= y2) return f1 + (f2 - f1) * ((y1 - y) / (y1 - y2));
  }
  return prof[prof.length - 1][1];
}

// ---- KL Tower (Menara KL): long slender shaft, compact head, long antenna --
function drawKLTower(ctx, W, H, led) {
  const cx = W / 2, b = H;
  const antTip = H * 0.0, headTop = H * 0.34, gallery = H * 0.4, headBot = H * 0.46;
  const shaftTopW = W * 0.28, shaftBotW = W * 0.38, headW = W * 0.72;
  if (!led) {
    // slender concrete shaft
    ctx.fillStyle = "#4c4767";
    ctx.beginPath();
    ctx.moveTo(cx - shaftBotW / 2, b);
    ctx.lineTo(cx + shaftBotW / 2, b);
    ctx.lineTo(cx + shaftTopW / 2, headBot);
    ctx.lineTo(cx - shaftTopW / 2, headBot);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6b6489";
    ctx.fillRect(cx - 1.5, headBot, 2, b - headBot);
    ctx.fillStyle = "#37324c";
    ctx.fillRect(cx + shaftTopW / 2 - 2, headBot, 2, b - headBot);
    // head: inverted-cone underside → gallery bulge → small dome
    ctx.fillStyle = "#514c70";
    ctx.beginPath();
    ctx.moveTo(cx - shaftTopW / 2, headBot);
    ctx.lineTo(cx - headW / 2, gallery);
    ctx.lineTo(cx - headW * 0.34, headTop + 2);
    ctx.quadraticCurveTo(cx, headTop - 3, cx + headW * 0.34, headTop + 2);
    ctx.lineTo(cx + headW / 2, gallery);
    ctx.lineTo(cx + shaftTopW / 2, headBot);
    ctx.closePath();
    ctx.fill();
    // long tapering antenna with collars + red beacon
    ctx.fillStyle = "#8a84a6";
    ctx.beginPath();
    ctx.moveTo(cx - 1.6, headTop);
    ctx.lineTo(cx + 1.6, headTop);
    ctx.lineTo(cx + 0.6, antTip + 2);
    ctx.lineTo(cx - 0.6, antTip + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cx - 2.5, headTop * 0.66, 5, 2);
    ctx.fillRect(cx - 2, headTop * 0.4, 4, 2);
    ctx.fillStyle = "#ff5a5a";
    ctx.fillRect(cx - 1, antTip, 2, 3);
  } else {
    ctx.fillStyle = "#fff";
    for (let dx = -headW / 2 + 2; dx <= headW / 2 - 2; dx += 3.2) ledDot(ctx, cx + dx, gallery, 1.1);
    ledLine(ctx, [[cx - shaftTopW / 2, headBot], [cx - headW / 2, gallery], [cx - headW * 0.34, headTop + 2]], 1.1);
    ledLine(ctx, [[cx + shaftTopW / 2, headBot], [cx + headW / 2, gallery], [cx + headW * 0.34, headTop + 2]], 1.1);
    ledLine(ctx, [[cx - headW / 2, gallery + 2], [cx + headW / 2, gallery + 2]], 1.0);
    ledLine(ctx, [[cx - shaftBotW / 2, b - 2], [cx + shaftBotW / 2, b - 2]], 1.2);
  }
}

// ---- Merdeka 118: ultra-slender faceted shaft + jagged crown + long needle -
function drawMerdeka(ctx, W, H, led) {
  const cx = W / 2, b = H, spireTip = 0, crownPeak = H * 0.24, bodyTop = H * 0.36;
  const prof = [[b, 0.46], [H * 0.72, 0.42], [H * 0.54, 0.32], [H * 0.44, 0.23], [bodyTop, 0.15]];
  const left = prof.map(([y, f]) => [cx - f * W, y]);
  const right = prof.map(([y, f]) => [cx + f * W, y]);
  // faceted crown (bodyTop → peak), deliberately asymmetric like the real tower
  const crownL = [[cx - 0.15 * W, bodyTop], [cx - 0.1 * W, H * 0.31], [cx - 0.045 * W, H * 0.285], [cx, crownPeak]];
  const crownR = [[cx, crownPeak], [cx + 0.06 * W, H * 0.3], [cx + 0.12 * W, H * 0.315], [cx + 0.15 * W, bodyTop]];
  const leftEdge = [...left, ...crownL.slice(1)];
  const rightEdge = [...right, ...crownR.slice(0, -1).reverse()];
  if (!led) {
    ctx.fillStyle = "#232a4a";
    ctx.beginPath();
    leftEdge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = rightEdge.length - 1; i >= 0; i--) ctx.lineTo(rightEdge[i][0], rightEdge[i][1]);
    ctx.closePath();
    ctx.fill();
    // right-hand facet shade
    ctx.fillStyle = "#1a2038";
    ctx.beginPath();
    ctx.moveTo(cx, b);
    right.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(cx, crownPeak);
    ctx.closePath();
    ctx.fill();
    // long thin needle spire
    ctx.fillStyle = "#9a94b4";
    ctx.beginPath();
    ctx.moveTo(cx - 1.1, crownPeak);
    ctx.lineTo(cx + 1.1, crownPeak);
    ctx.lineTo(cx + 0.35, spireTip);
    ctx.lineTo(cx - 0.35, spireTip);
    ctx.closePath();
    ctx.fill();
    const rng = makeRng(455);
    for (let y = bodyTop + 8; y < b - 6; y += 7) {
      const hw = profHalf(prof, y) * W - 3;
      for (let wx = cx - hw; wx <= cx + hw; wx += 6) if (rng() < 0.35) win(ctx, wx, y, 2, 3, "#cfe0ff");
    }
  } else {
    ctx.fillStyle = "#fff";
    ledLine(ctx, leftEdge, 1.2);
    ledLine(ctx, rightEdge, 1.2);
    ledLine(ctx, [[cx, b], [cx, crownPeak]], 0.9);            // central facet seam
    ledLine(ctx, [[cx - profHalf(prof, H * 0.54) * W, H * 0.54], [cx, H * 0.44]], 0.7); // diamond facets
    ledLine(ctx, [[cx + profHalf(prof, H * 0.54) * W, H * 0.54], [cx, H * 0.44]], 0.7);
    ledLine(ctx, [[cx, crownPeak], [cx, spireTip]], 1.3);     // spire
    ledDot(ctx, cx, spireTip, 1.2);
  }
}

// ---- Petronas Twin Towers: slender ringed towers, upper setbacks, arch -----
function petronasTower(ctx, cx, W, H, led) {
  const b = H, mastTip = 0, ballY = H * 0.15, setTop = H * 0.17, setBot = H * 0.37;
  const hwShaft = W * 0.08, hwSetTop = W * 0.03, tiers = 5;
  const tY = (i) => setTop + ((setBot - setTop) * i) / tiers;
  const tHW = (i) => hwSetTop + (hwShaft - hwSetTop) * (i / tiers);
  if (!led) {
    ctx.fillStyle = "#1b2146";
    ctx.beginPath(); // main shaft, gentle taper
    ctx.moveTo(cx - hwShaft, b);
    ctx.lineTo(cx + hwShaft, b);
    ctx.lineTo(cx + hwShaft * 0.96, setBot);
    ctx.lineTo(cx - hwShaft * 0.96, setBot);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#10132e";
    ctx.fillRect(cx, setBot, hwShaft * 0.96, b - setBot);
    for (let i = tiers - 1; i >= 0; i--) { // stepped setbacks (wide at bottom)
      const hw = tHW(i);
      ctx.fillStyle = "#1b2146";
      ctx.fillRect(cx - hw, tY(i), hw * 2, tY(i + 1) - tY(i));
      ctx.fillStyle = "#10132e";
      ctx.fillRect(cx, tY(i), hw, tY(i + 1) - tY(i));
    }
    ctx.fillStyle = "#2f3a6c"; // ringball
    ctx.beginPath();
    ctx.ellipse(cx, ballY, hwSetTop + 2, hwSetTop + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9a94b4"; // pinnacle mast
    ctx.beginPath();
    ctx.moveTo(cx - 1, ballY);
    ctx.lineTo(cx + 1, ballY);
    ctx.lineTo(cx + 0.4, mastTip);
    ctx.lineTo(cx - 0.4, mastTip);
    ctx.closePath();
    ctx.fill();
    const rng = makeRng(Math.round(cx) * 5 + 9);
    for (let y = setBot + 4; y < b - 5; y += 6) {
      const hw = hwShaft - 2;
      for (let wx = cx - hw; wx <= cx + hw; wx += 4) if (rng() < 0.5) win(ctx, wx, y, 2, 3, "#bfe9ff");
    }
  } else {
    ctx.fillStyle = "#fff";
    for (let y = b - 5; y > setBot; y -= 5) ledLine(ctx, [[cx - hwShaft * 0.98, y], [cx + hwShaft * 0.98, y]], 0.9);
    for (let i = 0; i <= tiers; i++) {
      const hw = tHW(Math.min(i, tiers - 1));
      ledLine(ctx, [[cx - hw, tY(i)], [cx + hw, tY(i)]], 0.9);
    }
    ledDot(ctx, cx, ballY, 1.2);
    ledDot(ctx, cx, mastTip + 2, 1.0);
  }
}
function drawPetronas(ctx, W, H, led) {
  const g = W * 0.22, L = W * 0.5 - g, R = W * 0.5 + g;
  petronasTower(ctx, L, W, H, led);
  petronasTower(ctx, R, W, H, led);
  const by = H * 0.6, apex = by + 7, foot = H * 0.72; // skybridge ~41st floor + ∧ arch
  if (!led) {
    ctx.fillStyle = "#2f3a6c";
    ctx.fillRect(L, by, R - L, 2.5);
    ctx.fillRect(L, by + 5, R - L, 2.5);
    ctx.strokeStyle = "#2f3a6c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo((L + R) / 2, apex);
    ctx.lineTo(L, foot);
    ctx.moveTo((L + R) / 2, apex);
    ctx.lineTo(R, foot);
    ctx.stroke();
  } else {
    ledLine(ctx, [[L, by + 1], [R, by + 1]], 1.0);
    ledLine(ctx, [[(L + R) / 2, apex], [L, foot]], 0.8);
    ledLine(ctx, [[(L + R) / 2, apex], [R, foot]], 0.8);
  }
}

// ---- balcony: railing + props + string lights, long dark floor -------------
function drawBalcony(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const floorY = 34, railTop = 6;
  const fg = ctx.createLinearGradient(0, floorY, 0, H);
  fg.addColorStop(0, "#0b0917");
  fg.addColorStop(1, "#050409");
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = "#171430";
  ctx.fillRect(0, floorY, W, 2);
  ctx.strokeStyle = "rgba(60,50,110,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = floorY + i * ((H - floorY) / 6);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // railing
  ctx.fillStyle = "#0a0818";
  ctx.fillRect(0, railTop, W, 5);
  ctx.fillStyle = "#2a2456";
  ctx.globalAlpha = 0.6;
  ctx.fillRect(0, railTop, W, 1.5);
  ctx.globalAlpha = 1;
  ctx.fillRect(0, floorY - 6, W, 3);
  for (let x = 8; x < W; x += 16) {
    ctx.fillStyle = "#12102a";
    ctx.fillRect(x, railTop + 4, 3, floorY - railTop - 8);
  }
  // bistro string lights
  ctx.strokeStyle = "rgba(120,100,70,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const y = 6 + Math.sin((x / W) * Math.PI * 8) * 2;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let x = 20; x < W; x += 46) {
    const y = 8 + Math.sin((x / W) * Math.PI * 8) * 2;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(x - 1.5, y - 1.5, 4, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffe6a8";
    ctx.fillRect(x, y, 2, 2);
  }
  // potted plant, left
  const px = Math.round(W * 0.12);
  ctx.fillStyle = "#0d1a12";
  for (let i = 0; i < 7; i++) ctx.fillRect(px + (i - 3) * 3, floorY - 20 - (3 - Math.abs(i - 3)) * 3, 2, 20);
  ctx.fillStyle = "#14102a";
  ctx.beginPath();
  ctx.moveTo(px - 7, floorY);
  ctx.lineTo(px + 7, floorY);
  ctx.lineTo(px + 5, floorY - 8);
  ctx.lineTo(px - 5, floorY - 8);
  ctx.fill();
  // AC units + vent pipe, right
  const ax = Math.round(W * 0.8);
  ctx.fillStyle = "#14122a";
  for (let i = 0; i < 2; i++) {
    const bx = ax + i * 34;
    ctx.fillRect(bx, floorY - 20, 28, 20);
    ctx.strokeStyle = "#2a2650";
    ctx.strokeRect(bx + 4, floorY - 16, 20, 12);
  }
  ctx.fillStyle = "#100e22";
  ctx.fillRect(ax - 12, floorY - 30, 5, 30);
  ctx.fillRect(ax - 12, floorY - 30, 14, 4);
}

// ---- moon: blocky PIXEL disc (per-pixel circle) + soft glow ----------------
function moonTexture() {
  const S = 44; // low-res grid → chunky pixel edge under NearestFilter
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const cx = S / 2, cy = S / 2, r = S * 0.3;
  // soft glow behind
  const gg = ctx.createRadialGradient(cx, cy, r, cx, cy, S * 0.5);
  gg.addColorStop(0, "rgba(253,251,232,0.4)");
  gg.addColorStop(1, "rgba(253,251,232,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, S, S);
  // hard pixel disc
  const inDisc = (x, y, rr) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    return dx * dx + dy * dy <= rr * rr;
  };
  ctx.fillStyle = "#fdfbe8";
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) if (inDisc(x, y, r)) ctx.fillRect(x, y, 1, 1);
  // pixel craters
  ctx.fillStyle = "#e4dfc2";
  [[-0.34, -0.18, 0.16], [0.28, 0.12, 0.12], [0.06, -0.4, 0.09], [-0.06, 0.34, 0.1]].forEach(([dx, dy, rr]) => {
    const ccx = cx + dx * r, ccy = cy + dy * r, cr = rr * r;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const ex = x + 0.5 - ccx, ey = y + 0.5 - ccy;
        if (ex * ex + ey * ey <= cr * cr) ctx.fillRect(x, y, 1, 1);
      }
  });
  return new THREE.CanvasTexture(c);
}
function Moon({ x, y, size, scroll, vh }) {
  const tex = useMemo(() => {
    const t = moonTexture();
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef(null);
  useFrame(() => {
    if (ref.current) ref.current.position.y = y + scroll.current * SHIFT * vh * 0.5;
  });
  return (
    <mesh ref={ref} position={[x, y, 0]} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ---- star field: pixel points that twinkle and orbit (curved motion) -------
function StarField({ scroll }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  // a disc of stars covering the viewport corners so rotation never reveals gaps
  const R = 0.72 * Math.hypot(vw, vh);
  const key = Math.round(R / 30);
  const { geom, mat } = useMemo(() => {
    const N = 900;
    const rng = makeRng(7);
    const pos = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const phase = new Float32Array(N);
    const bright = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const r = R * Math.sqrt(rng());
      const a = rng() * Math.PI * 2;
      pos[3 * i] = Math.cos(a) * r;
      pos[3 * i + 1] = Math.sin(a) * r;
      pos[3 * i + 2] = 0;
      size[i] = (rng() < 0.82 ? 1 : rng() < 0.7 ? 2 : 3) * PX * 0.7;
      phase[i] = rng() * 6.2832;
      bright[i] = 0.35 + rng() * 0.65;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aBright", new THREE.BufferAttribute(bright, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPR: { value: 1 } },
      vertexShader: `
        attribute float aSize; attribute float aPhase; attribute float aBright;
        uniform float uTime; uniform float uPR; varying float vA;
        void main() {
          float tw = 0.5 + 0.5 * sin(uTime * 1.8 + aPhase);
          vA = aBright * (0.35 + 0.65 * tw);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPR;
        }`,
      fragmentShader: `
        varying float vA;
        void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vA); }`,
    });
    return { geom: g, mat: m };
  }, [key]);

  useEffect(() => () => (geom.dispose(), mat.dispose()), [geom, mat]);

  const ref = useRef(null);
  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uPR.value = state.gl.getPixelRatio();
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.022; // slow orbit → curved paths
      ref.current.position.y = scroll.current * SHIFT * vh * 0.15 + state.pointer.y * vh * 0.004;
      ref.current.position.x = state.pointer.x * vw * 0.006;
    }
  });
  return <points ref={ref} geometry={geom} material={mat} renderOrder={0.5} />;
}

// ============================================================================

const flatMat = (tex) => ({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });

function Band({ tex, top0, bot0, order, lift, sway = 0, drift = 0, scroll }) {
  const ref = useRef(null);
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const w = vw * OVER;
  const top = vh * 0.5 - top0 * vh;
  const bot = vh * 0.5 - bot0 * vh;
  const cy = (top + bot) / 2;
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    g.position.y = cy + scroll.current * SHIFT * vh * lift + state.pointer.y * vh * 0.008 * sway;
    let x = state.pointer.x * vw * 0.01 * sway;
    if (drift) x += ((state.clock.elapsedTime * drift) % (w * 0.3)) - w * 0.15;
    g.position.x = x;
  });
  return (
    <mesh ref={ref} position={[0, cy, 0]} renderOrder={order}>
      <planeGeometry args={[w, top - bot]} />
      <meshBasicMaterial {...flatMat(tex)} />
    </mesh>
  );
}

// A landmark: dark structure + additive LED mask that cycles through RGB hues.
function Landmark({ struct, leds, x, w, h, phase, scroll }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const baseY = vh * 0.5 - ROOF0 * vh + h / 2; // base sits on the roofline
  const gref = useRef(null);
  const lref = useRef(null);
  useFrame((state) => {
    const g = gref.current;
    if (g) {
      g.position.y = baseY + scroll.current * SHIFT * vh * CITY_LIFT;
      g.position.x = x + state.pointer.x * vw * 0.01 * 0.7;
    }
    if (lref.current) {
      const hue = (state.clock.elapsedTime * 0.07 + phase) % 1;
      lref.current.material.color.setHSL(hue, 0.9, 0.6);
    }
  });
  return (
    <group ref={gref} position={[x, baseY, 0]}>
      <mesh renderOrder={3}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial {...flatMat(struct)} />
      </mesh>
      <mesh ref={lref} renderOrder={3} position={[0, 0, 0.1]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={leds} transparent depthTest={false} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

const LANDMARKS = [
  { key: "merdeka", draw: drawMerdeka, hFrac: 0.78, aspect: 0.2, x: -0.4, phase: 0.0 },
  { key: "petronas", draw: drawPetronas, hFrac: 0.56, aspect: 0.78, x: 0.14, phase: 0.36 },
  { key: "kltower", draw: drawKLTower, hFrac: 0.6, aspect: 0.28, x: 0.4, phase: 0.7 },
];

function Scene({ scroll }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const bw = Math.round(vw / 40) * 40;
  const bh = Math.round(vh / 40) * 40;

  const tex = useMemo(() => {
    const artW = Math.ceil((bw * OVER) / PX);
    const cityH = Math.ceil(((CITY_H + CITY_BLEED) * bh) / PX);
    const skyH = Math.ceil((1.12 * bh) / PX);
    const balH = Math.ceil((0.95 * bh) / PX);
    const near = { body: "#0e0b22", bodyR: "#070512", edge: "#1c1838", roof: "#3a4270" };
    const mid = { body: "#171334", bodyR: "#0d0a22", edge: "#2a2650", roof: "#3a4270" };
    const far = { body: "#221d46", bodyR: "#181336", edge: "#39457a", roof: "#3a4270" };
    const t = {
      sky: makeTex(artW, skyH, drawSky),
      far: makeTex(artW, cityH, cityDrawer(21, 0.3, 0.82, far, 0.24, 0.24)),
      mid: makeTex(artW, cityH, cityDrawer(88, 0.22, 0.55, mid, 0.5, 0.32)),
      near: makeTex(artW, cityH, cityDrawer(303, 0.15, 0.42, near, 0.42, 0.3)),
      balcony: makeTex(artW, balH, drawBalcony),
      lm: {},
    };
    LANDMARKS.forEach((L) => {
      const h = Math.ceil((L.hFrac * bh) / PX);
      const w = Math.ceil(h * L.aspect);
      t.lm[L.key] = {
        struct: makeTex(w, h, (c, W, Hh) => L.draw(c, W, Hh, false)),
        leds: makeTex(w, h, (c, W, Hh) => L.draw(c, W, Hh, true)),
      };
    });
    return t;
  }, [bw, bh]);

  useEffect(() => () => {
    [tex.sky, tex.far, tex.mid, tex.near, tex.balcony].forEach((t) => t.dispose && t.dispose());
    Object.values(tex.lm).forEach((l) => (l.struct.dispose(), l.leds.dispose()));
  }, [tex]);

  const cityTop = ROOF0 - CITY_H;
  const cityBot = ROOF0 + CITY_BLEED;
  return (
    <>
      <color attach="background" args={[SKY.top]} />
      <Band tex={tex.sky} top0={-0.06} bot0={1.06} order={0} lift={0.15} sway={0.3} scroll={scroll} />
      <StarField scroll={scroll} />
      <Moon x={vw * 0.3} y={vh * 0.3} size={vh * 0.2} scroll={scroll} vh={vh} />
      <Band tex={tex.far} top0={cityTop} bot0={cityBot} order={1} lift={0.9} sway={0.5} scroll={scroll} />
      <Band tex={tex.mid} top0={cityTop} bot0={cityBot} order={2} lift={0.97} sway={0.7} scroll={scroll} />
      {LANDMARKS.map((L) => (
        <Landmark
          key={L.key}
          struct={tex.lm[L.key].struct}
          leds={tex.lm[L.key].leds}
          x={vw * L.x}
          w={vh * L.hFrac * L.aspect}
          h={vh * L.hFrac}
          phase={L.phase}
          scroll={scroll}
        />
      ))}
      <Band tex={tex.near} top0={cityTop} bot0={cityBot} order={4} lift={1.04} sway={0.9} scroll={scroll} />
      <Band tex={tex.balcony} top0={ROOF0} bot0={ROOF0 + 0.95} order={5} lift={1.0} sway={1.1} scroll={scroll} />
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
