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
const CITY_H = 0.5;      // city band ≈ 50% of viewport
const CITY_BLEED = 0.1; // city extends below the roofline (hidden by balcony)
const CITY_LIFT = 1.0;   // city + landmarks move rigidly with the balcony (one world)
// balcony: railing rises above the rooftop edge; deck fills below
const BAL_TOP = 0.76;    // viewport fraction of the handrail (top of balcony)
// short deck: studio sits just below the balcony so there is no long dark
// stretch. The 60/40 split comes from easing the scroll (see HOLD below).
const BAL_SPAN = 0.54;

// ---- studio (lower part of the world) --------------------------------------
// Studio sits directly below the balcony deck (studio top == deck bottom).
const STUDIO_TOP0 = BAL_TOP + BAL_SPAN;   // = 1.3
const STUDIO_H = 1.0;                      // one viewport tall → fills the frame
const STUDIO_BOT0 = STUDIO_TOP0 + STUDIO_H;
// full descent that centres the studio at the end of the scroll. Rigid-world
// layers (sky, city, balcony, studio) all use lift 1.0 so they move as one
// solid world; only the far moon/stars parallax slightly.
const DESCENT = (STUDIO_TOP0 + STUDIO_BOT0) / 2 - 0.5;
const SHIFT = DESCENT;
// scroll easing: the city view holds (only a gentle drift) for the first 60%
// of the page, then the camera descends into the studio over the last 40%.
const HOLD = 0.6;
const HOLD_DESCENT = (STUDIO_TOP0 - 1) / DESCENT; // descent fraction reached at HOLD
function descentProgress(p) {
  return p <= HOLD
    ? (p / HOLD) * HOLD_DESCENT
    : HOLD_DESCENT + ((p - HOLD) / (1 - HOLD)) * (1 - HOLD_DESCENT);
}

const SKY = { top: "#160f36", mid: "#2a1a55", horizon: "#452a6a", band: "#5f3880" };
const NEON = ["#22d3ee", "#8be9fd", "#f472b6", "#ff5aa8", "#ffcf6b", "#c084fc", "#7dd3fc", "#4dd0e1"];

function makeRng(seed) {
  let s = seed % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// `ss` supersamples the canvas (finer texels → crisper edges) while the draw
// code keeps working in logical w×h units.
function makeTex(w, h, draw, ss = 1) {
  const W = Math.max(2, Math.round(w)), Hh = Math.max(2, Math.round(h));
  const c = document.createElement("canvas");
  c.width = W * ss;
  c.height = Hh * ss;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.scale(ss, ss);
  draw(ctx, W, Hh);
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

// fill helpers (kept as thin wrappers; the `ow` arg is unused now)
const OUTLINE = "#05060d";
function oFill(ctx, fill, ow, path) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
}
function oRect(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
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
    const ow = 1.2;
    // slender concrete shaft
    oFill(ctx, "#4c4767", ow, () => {
      ctx.moveTo(cx - shaftBotW / 2, b);
      ctx.lineTo(cx + shaftBotW / 2, b);
      ctx.lineTo(cx + shaftTopW / 2, headBot);
      ctx.lineTo(cx - shaftTopW / 2, headBot);
      ctx.closePath();
    });
    ctx.fillStyle = "#6b6489";
    ctx.fillRect(cx - 1.5, headBot, 2, b - headBot);
    ctx.fillStyle = "#37324c";
    ctx.fillRect(cx + shaftTopW / 2 - 2, headBot, 2, b - headBot);
    // head: inverted-cone underside → gallery bulge → small dome
    oFill(ctx, "#514c70", ow, () => {
      ctx.moveTo(cx - shaftTopW / 2, headBot);
      ctx.lineTo(cx - headW / 2, gallery);
      ctx.lineTo(cx - headW * 0.34, headTop + 2);
      ctx.quadraticCurveTo(cx, headTop - 3, cx + headW * 0.34, headTop + 2);
      ctx.lineTo(cx + headW / 2, gallery);
      ctx.lineTo(cx + shaftTopW / 2, headBot);
      ctx.closePath();
    });
    // long tapering antenna with collars + red beacon
    oFill(ctx, "#8a84a6", 0.8, () => {
      ctx.moveTo(cx - 1.6, headTop);
      ctx.lineTo(cx + 1.6, headTop);
      ctx.lineTo(cx + 0.6, antTip + 2);
      ctx.lineTo(cx - 0.6, antTip + 2);
      ctx.closePath();
    });
    ctx.fillStyle = "#8a84a6";
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
    oFill(ctx, "#232a4a", 1.3, () => {
      leftEdge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = rightEdge.length - 1; i >= 0; i--) ctx.lineTo(rightEdge[i][0], rightEdge[i][1]);
      ctx.closePath();
    });
    // right-hand facet shade
    ctx.fillStyle = "#1a2038";
    ctx.beginPath();
    ctx.moveTo(cx, b);
    right.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(cx, crownPeak);
    ctx.closePath();
    ctx.fill();
    // long thin needle spire
    oFill(ctx, "#9a94b4", 0.7, () => {
      ctx.moveTo(cx - 1.1, crownPeak);
      ctx.lineTo(cx + 1.1, crownPeak);
      ctx.lineTo(cx + 0.35, spireTip);
      ctx.lineTo(cx - 0.35, spireTip);
      ctx.closePath();
    });
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
    const ow = 1.0;
    oFill(ctx, "#1b2146", ow, () => { // main shaft, gentle taper
      ctx.moveTo(cx - hwShaft, b);
      ctx.lineTo(cx + hwShaft, b);
      ctx.lineTo(cx + hwShaft * 0.96, setBot);
      ctx.lineTo(cx - hwShaft * 0.96, setBot);
      ctx.closePath();
    });
    ctx.fillStyle = "#10132e";
    ctx.fillRect(cx, setBot, hwShaft * 0.96, b - setBot);
    for (let i = tiers - 1; i >= 0; i--) { // stepped setbacks (wide at bottom)
      const hw = tHW(i);
      oRect(ctx, cx - hw, tY(i), hw * 2, tY(i + 1) - tY(i), "#1b2146", ow);
      ctx.fillStyle = "#10132e";
      ctx.fillRect(cx, tY(i), hw, tY(i + 1) - tY(i));
    }
    oFill(ctx, "#2f3a6c", ow, () => // ringball
      ctx.ellipse(cx, ballY, hwSetTop + 2, hwSetTop + 2, 0, 0, Math.PI * 2)
    );
    oFill(ctx, "#9a94b4", 0.7, () => { // pinnacle mast
      ctx.moveTo(cx - 1, ballY);
      ctx.lineTo(cx + 1, ballY);
      ctx.lineTo(cx + 0.4, mastTip);
      ctx.lineTo(cx - 0.4, mastTip);
      ctx.closePath();
    });
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
    oRect(ctx, L, by, R - L, 2.5, "#2f3a6c");
    oRect(ctx, L, by + 5, R - L, 2.5, "#2f3a6c");
    // arch legs
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo((L + R) / 2, apex);
    ctx.lineTo(L, foot);
    ctx.moveTo((L + R) / 2, apex);
    ctx.lineTo(R, foot);
    ctx.strokeStyle = "#2f3a6c";
    ctx.lineWidth = 2;
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
  // layout in art px: handrail near the top, balusters down to the parapet cap,
  // then the solid deck fills the rest (the surface you'd stand on)
  const railTop = 11, handH = 5, midY = 27, capY = 42;

  // --- solid deck / parapet (foreground surface) ---
  // Deck warms from cool balcony blue near the cap down to the studio's exact
  // top colour (#160d06) so the balcony→studio seam is a continuous blend.
  const fg = ctx.createLinearGradient(0, capY, 0, H);
  fg.addColorStop(0, "#100d20");
  fg.addColorStop(0.5, "#0a0810");
  fg.addColorStop(0.82, "#100a08");
  fg.addColorStop(1, "#160d06");
  ctx.fillStyle = fg;
  ctx.fillRect(0, capY, W, H - capY);
  // parapet cap: lit concrete ledge the railing mounts on
  ctx.fillStyle = "#2b2656";
  ctx.fillRect(0, capY, W, 4);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#5a54a0";
  ctx.fillRect(0, capY, W, 1.5);
  ctx.globalAlpha = 1;
  // deck perspective lines for depth
  ctx.strokeStyle = "rgba(74,64,124,0.16)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    const y = capY + 6 + i * ((H - capY) / 8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // --- railing: balusters between handrail and cap, city glows through gaps --
  const balBot = capY;
  for (let x = 9; x < W - 3; x += 14) {
    ctx.fillStyle = "#1a1638";
    ctx.fillRect(x, railTop + handH, 4, balBot - (railTop + handH));
    ctx.fillStyle = "#2c2660"; // baluster highlight edge
    ctx.fillRect(x, railTop + handH, 1.5, balBot - (railTop + handH));
  }
  // mid rail
  ctx.fillStyle = "#141130";
  ctx.fillRect(0, midY, W, 3);
  // handrail
  ctx.fillStyle = "#0f0d24";
  ctx.fillRect(0, railTop, W, handH);
  // neon-lit top edge of the handrail
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#3fe0ff";
  ctx.fillRect(0, railTop, W, 1.5);
  ctx.globalAlpha = 1;

  // --- bistro string lights strung above the handrail ---
  ctx.strokeStyle = "rgba(120,100,70,0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const y = 4 + Math.sin((x / W) * Math.PI * 9) * 2.5;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let x = 18; x < W; x += 44) {
    const y = 6 + Math.sin((x / W) * Math.PI * 9) * 2.5;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(x - 1.5, y - 1.5, 4, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffe6a8";
    ctx.fillRect(x, y, 2, 2);
  }

  // --- props on the deck (in front of the railing) ---
  // potted plant, left
  const px = Math.round(W * 0.15);
  ctx.fillStyle = "#0d1a12";
  for (let i = 0; i < 7; i++) ctx.fillRect(px + (i - 3) * 3, capY - 4 - (3 - Math.abs(i - 3)) * 3, 2, 16);
  ctx.fillStyle = "#15112c";
  ctx.beginPath();
  ctx.moveTo(px - 8, capY + 12);
  ctx.lineTo(px + 8, capY + 12);
  ctx.lineTo(px + 6, capY - 2);
  ctx.lineTo(px - 6, capY - 2);
  ctx.fill();
  // warm glowing lantern on a slim stand (cosy focal point)
  const lx = Math.round(W * 0.31);
  ctx.fillStyle = "#171433";
  ctx.fillRect(lx - 2, capY + 2, 4, 16);
  ctx.fillRect(lx - 6, capY + 16, 12, 3);
  win(ctx, lx - 5, capY - 8, 10, 10, "#ffcf6b");
  // AC condenser units, right
  const ax = Math.round(W * 0.82);
  ctx.fillStyle = "#14122a";
  for (let i = 0; i < 2; i++) {
    const bx = ax + i * 36;
    ctx.fillRect(bx, capY + 2, 30, 18);
    ctx.strokeStyle = "#2a2650";
    ctx.strokeRect(bx + 4, capY + 6, 22, 10);
  }

  // small leafy plant (pot + fronds)
  const plant = (x, base, hgt, n, col) => {
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++)
      ctx.fillRect(x + (i - (n - 1) / 2) * 3, base - hgt + Math.abs(i - (n - 1) / 2) * 2, 2, hgt - Math.abs(i - (n - 1) / 2) * 2);
    ctx.fillStyle = "#15112c";
    ctx.fillRect(x - 5, base - 2, 10, 9);
  };
  plant(Math.round(W * 0.08), capY + 12, 14, 7, "#0d1a12");
  plant(Math.round(W * 0.66), capY + 14, 26, 9, "#0e1c14"); // tall one
  plant(Math.round(W * 0.9), capY + 12, 12, 5, "#0d1a12");

  // bistro table + two chairs + a candle glow
  const tx = Math.round(W * 0.25), td = capY + 17;
  ctx.fillStyle = "#171433";
  ctx.fillRect(tx - 17, td - 12, 3, 14); ctx.fillRect(tx - 18, td - 13, 7, 3); // left chair
  ctx.fillRect(tx + 14, td - 12, 3, 14); ctx.fillRect(tx + 11, td - 13, 7, 3); // right chair
  ctx.fillRect(tx - 2, td - 9, 4, 11);   // table pedestal
  ctx.fillRect(tx - 10, td - 11, 20, 3); // table top
  win(ctx, tx - 1, td - 17, 3, 4, "#ffcf6b"); // candle

  // lounge chair (reclined silhouette)
  const lc = Math.round(W * 0.45), lb = capY + 18;
  ctx.fillStyle = "#171433";
  ctx.beginPath();
  ctx.moveTo(lc - 16, lb);
  ctx.lineTo(lc + 12, lb);
  ctx.lineTo(lc + 12, lb - 4);
  ctx.lineTo(lc - 4, lb - 5);
  ctx.lineTo(lc - 16, lb - 15);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(lc - 15, lb, 3, 6);
  ctx.fillRect(lc + 8, lb, 3, 6);

  // a cat sitting on the handrail
  const kx = Math.round(W * 0.57);
  ctx.fillStyle = "#0a0818";
  ctx.fillRect(kx - 5, railTop - 6, 9, 8);        // body
  ctx.fillRect(kx + 3, railTop - 9, 4, 6);        // head
  ctx.fillRect(kx + 3, railTop - 11, 1.5, 3);     // ear
  ctx.fillRect(kx + 6, railTop - 11, 1.5, 3);     // ear
  ctx.fillRect(kx - 6, railTop - 3, 2, 5);        // tail

  // multicolour fairy-light string draped along the handrail (lively, in view)
  const gcol = ["#ff5aa8", "#ffcf6b", "#22d3ee", "#c084fc", "#7dd3fc", "#4dd0e1"];
  ctx.strokeStyle = "rgba(120,100,70,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 3) {
    const y = railTop + 3 + Math.abs(Math.sin(x / 22)) * 4;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  for (let x = 6, i = 0; x < W; x += 15, i++) {
    const y = railTop + 3 + Math.abs(Math.sin(x / 22)) * 4;
    win(ctx, x - 1, y, 2.5, 2.5, gcol[i % gcol.length]);
  }

  // --- larger props on the deck, aligned on ONE horizontal row (up from the
  //     bottom edge) and spread across the balcony -----------------------------
  const rowY = Math.round(H * 0.74); // shared baseline the props stand on

  // warm outdoor rug centred under the row (grounds the furniture)
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#3a2038";
  ctx.fillRect(Math.round(W * 0.3), rowY - 3, Math.round(W * 0.4), 12);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#5a2f52";
  ctx.fillRect(Math.round(W * 0.3), rowY - 3, Math.round(W * 0.4), 2);
  ctx.globalAlpha = 1;

  // big leafy plant, left
  const fpx = Math.round(W * 0.12), fpb = rowY;
  ctx.fillStyle = "#0e1c14";
  for (let i = 0; i < 11; i++) {
    const fh = 30 - Math.abs(i - 5) * 4;
    ctx.fillRect(fpx + (i - 5) * 3, fpb - 12 - fh, 2.5, fh);
  }
  ctx.fillStyle = "#15112c";                    // pot
  ctx.fillRect(fpx - 10, fpb - 14, 20, 14);
  ctx.fillStyle = "#221a44";
  ctx.fillRect(fpx - 10, fpb - 14, 20, 2);      // pot rim highlight

  // camera on a tripod (videographer's balcony), centre-left
  const cvx = Math.round(W * 0.36), cvb = rowY;
  ctx.strokeStyle = "#0c0a1c"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cvx, cvb - 24); ctx.lineTo(cvx - 9, cvb);
  ctx.moveTo(cvx, cvb - 24); ctx.lineTo(cvx + 9, cvb);
  ctx.moveTo(cvx, cvb - 24); ctx.lineTo(cvx, cvb - 2);
  ctx.stroke();
  ctx.fillStyle = "#0a0818"; ctx.fillRect(cvx - 8, cvb - 33, 15, 9);   // camera body
  ctx.fillStyle = "#171433"; ctx.fillRect(cvx + 6, cvb - 31, 5, 5);    // lens
  win(ctx, cvx + 8, cvb - 30, 2, 2, "#ff5a5a");                        // rec light

  // small quadcopter drone resting on the deck (nod to the descent POV)
  const dx = Math.round(W * 0.64), dyb = rowY;
  ctx.fillStyle = "#14122a";
  ctx.fillRect(dx - 13, dyb - 5, 7, 2); ctx.fillRect(dx + 6, dyb - 5, 7, 2); // arms
  ctx.fillStyle = "#2a2650";
  ctx.fillRect(dx - 14, dyb - 6, 9, 1.5); ctx.fillRect(dx + 5, dyb - 6, 9, 1.5); // rotors
  ctx.fillStyle = "#0a0818"; ctx.fillRect(dx - 6, dyb - 4, 12, 5);     // body
  win(ctx, dx - 1, dyb - 2, 2, 2, "#22d3ee");                          // status LED

  // equipment / pelican case, right
  const qx = Math.round(W * 0.87), qb = rowY;
  ctx.fillStyle = "#14122a"; ctx.fillRect(qx - 13, qb - 17, 26, 17);   // case
  ctx.fillStyle = "#221a44"; ctx.fillRect(qx - 13, qb - 17, 26, 2);    // lid highlight
  ctx.strokeStyle = "#2a2650"; ctx.lineWidth = 1;
  ctx.strokeRect(qx - 9, qb - 12, 18, 9);                              // latch panel
  ctx.fillStyle = "#0c0a1c"; ctx.fillRect(qx - 4, qb - 19, 8, 3);      // handle
}

// ============================================================================
//  STUDIO — warm pixel-art videography / editing room (lower half of world).
//  Redesigned to be airy, not bulky: lots of warm wall, slim furniture, and a
//  framed window showing a still snapshot of the ACTUAL city art.
// ============================================================================
const STUDIO = {
  ceiling: "#160d06",
  wallTop: "#3a2818",
  wallBot: "#4c3420",
  woodDark: "#3a2614",
  wood: "#5c3e22",
  woodLite: "#744c2c",
  floorTop: "#2c1c0e",
  floorBot: "#160d06",
  screen: "#0b1224",
  metal: "#111119",
  metalLite: "#2a2a34",
  cream: "#ffe7bc",
};

// soft radial glow (warm or cool) painted as a square gradient
function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// A still "snapshot" of the city, composed from the SAME art the live
// background uses (sky + skyline + the three KL landmarks + moon). Returned as
// a canvas so the studio window shows the real city, not a hand-faked skyline.
function makeCityWindow(w, h) {
  const ss = 2;
  const c = document.createElement("canvas");
  c.width = Math.round(w * ss);
  c.height = Math.round(h * ss);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.scale(ss, ss);

  drawSky(ctx, w, h);

  // extra bright stars in the upper sky (so the window reads like the city sky)
  const rs = makeRng(23);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rs() * w), y = Math.floor(rs() * h * 0.58);
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + rs() * 0.6).toFixed(2)})`;
    const s = rs() > 0.85 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }

  // moon with craters + soft glow, upper-right — same look/position as the city
  // sample at pixel centres (+0.5) so there are no single-pixel spikes at the
  // N/E/S/W edges — gives a cleanly rounded pixel disc.
  const disc = (cx, cy, r, col) => {
    ctx.fillStyle = col;
    const R2 = r * r;
    for (let y = -r - 1; y <= r + 1; y++)
      for (let x = -r - 1; x <= r + 1; x++) {
        const dx = x + 0.5, dy = y + 0.5;
        if (dx * dx + dy * dy <= R2) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
      }
  };
  const mx = Math.round(w * 0.8), my = Math.round(h * 0.2), mr = Math.max(4, Math.round(h * 0.11));
  glow(ctx, mx, my, mr * 2.6, "rgba(253,251,232,0.5)");
  disc(mx, my, mr, "#fdfbe8");
  // craters kept well inside the disc so nothing touches the edge
  [[-0.28, -0.12, 0.15], [0.24, 0.1, 0.11], [0.02, -0.26, 0.08]].forEach(([dx, dy, rr]) => disc(mx + dx * mr, my + dy * mr, rr * mr, "#e4dfc2"));

  // skyline (transparent-bg layer stamped over the sky)
  const sky = document.createElement("canvas");
  sky.width = Math.round(w * ss); sky.height = Math.round(h * ss);
  const sctx = sky.getContext("2d"); sctx.imageSmoothingEnabled = false; sctx.scale(ss, ss);
  cityDrawer(88, 0.16, 0.5, { body: "#171334", bodyR: "#0d0a22", edge: "#2a2650", roof: "#3a4270" }, 0.5, 0.32)(sctx, w, h);
  ctx.drawImage(sky, 0, 0, w, h);

  // the three landmarks in their city positions, WITH neon LED glow.
  // renders the dark structure, then the LED mask tinted + added on top.
  const place = (fn, cxFrac, hFrac, aspect, tint) => {
    const lh = h * hFrac, lw = lh * aspect;
    const dx = Math.round(w * cxFrac - lw / 2), dy = Math.round(h - lh - h * 0.05);
    const struct = document.createElement("canvas");
    struct.width = Math.round(lw * ss); struct.height = Math.round(lh * ss);
    const stx = struct.getContext("2d"); stx.imageSmoothingEnabled = false; stx.scale(ss, ss);
    fn(stx, lw, lh, false);
    ctx.drawImage(struct, dx, dy, lw, lh);
    const led = document.createElement("canvas");
    led.width = Math.round(lw * ss); led.height = Math.round(lh * ss);
    const ltx = led.getContext("2d"); ltx.imageSmoothingEnabled = false; ltx.scale(ss, ss);
    fn(ltx, lw, lh, true);
    ltx.globalCompositeOperation = "source-in"; // colourise the white LED mask
    ltx.fillStyle = tint; ltx.fillRect(0, 0, lw, lh);
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; // additive neon glow
    ctx.drawImage(led, dx, dy, lw, lh);
    ctx.restore();
  };
  place(drawMerdeka, 0.10, 0.9, 0.2, "#ff5aa8");
  place(drawPetronas, 0.63, 0.72, 0.78, "#7dd3fc");
  place(drawKLTower, 0.90, 0.76, 0.28, "#c084fc");
  return c;
}

// mini "footage" thumbnails shown on the monitor screens ----------------------
function previewNight(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#0f2150"); g.addColorStop(1, "#3b2a63");
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#f4efd2"; // moon
  ctx.fillRect(Math.round(x + w * 0.8), Math.round(y + h * 0.2), 3, 3);
  ctx.fillStyle = "rgba(255,255,255,0.75)"; // stars
  [[0.2, 0.25], [0.5, 0.16], [0.35, 0.5], [0.68, 0.42], [0.12, 0.6]].forEach(([fx, fy]) =>
    ctx.fillRect(Math.round(x + fx * w), Math.round(y + fy * h), 1, 1));
  const mtn = (cx, mw, mh) => { ctx.beginPath(); ctx.moveTo(cx - mw, y + h); ctx.lineTo(cx, y + h - mh); ctx.lineTo(cx + mw, y + h); ctx.fill(); };
  ctx.fillStyle = "#0c1730";
  mtn(x + w * 0.3, w * 0.3, h * 0.62); mtn(x + w * 0.64, w * 0.36, h * 0.8);
  ctx.fillStyle = "#152244"; ctx.fillRect(x, y + h - 2, w, 2);
}
function previewSunset(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#f5a35a"); g.addColorStop(0.5, "#e2657a"); g.addColorStop(1, "#5b3a6e");
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const sx = x + w * 0.5, sy = y + h * 0.52, sr = Math.max(2, Math.round(h * 0.22)); // sun
  ctx.fillStyle = "#ffe9b0";
  for (let yy = -sr; yy <= sr; yy++)
    for (let xx = -sr; xx <= sr; xx++) if (xx * xx + yy * yy <= sr * sr) ctx.fillRect(Math.round(sx + xx), Math.round(sy + yy), 1, 1);
  ctx.fillStyle = "#3a2350"; // hills
  ctx.beginPath();
  ctx.moveTo(x, y + h); ctx.lineTo(x, y + h - h * 0.22);
  ctx.lineTo(x + w * 0.5, y + h - h * 0.4); ctx.lineTo(x + w, y + h - h * 0.18); ctx.lineTo(x + w, y + h);
  ctx.fill();
}

function drawStudio(ctx, W, H, cityImg) {
  ctx.clearRect(0, 0, W, H);
  const S = STUDIO;
  const ceilH = Math.round(H * 0.05);
  const floorY = Math.round(H * 0.64);

  // back wall (warm) + centred ambient bloom + edge vignette
  const wg = ctx.createLinearGradient(0, ceilH, 0, floorY);
  wg.addColorStop(0, S.wallTop);
  wg.addColorStop(1, S.wallBot);
  ctx.fillStyle = wg;
  ctx.fillRect(0, ceilH, W, floorY - ceilH);
  glow(ctx, W * 0.5, floorY * 0.62, W * 0.42, "rgba(255,176,84,0.16)");
  const sv = ctx.createLinearGradient(0, 0, W, 0);
  sv.addColorStop(0, "rgba(8,5,2,0.5)");
  sv.addColorStop(0.24, "rgba(0,0,0,0)");
  sv.addColorStop(0.76, "rgba(0,0,0,0)");
  sv.addColorStop(1, "rgba(8,5,2,0.5)");
  ctx.fillStyle = sv;
  ctx.fillRect(0, ceilH, W, floorY - ceilH);

  // ceiling / building underside (connects up to the facade + deck)
  ctx.fillStyle = S.ceiling;
  ctx.fillRect(0, 0, W, ceilH);
  ctx.fillStyle = "#24170d";
  ctx.fillRect(0, ceilH - 2, W, 2);

  // floor (wood) + baseboard + small rug
  const fg = ctx.createLinearGradient(0, floorY, 0, H);
  fg.addColorStop(0, S.floorTop);
  fg.addColorStop(1, S.floorBot);
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = "#1a1109";
  ctx.fillRect(0, floorY - 2, W, 3);
  ctx.strokeStyle = "rgba(255,180,90,0.05)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const y = floorY + i * ((H - floorY) / 5);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.fillStyle = "rgba(92,58,30,0.35)";
  ctx.fillRect(Math.round(W * 0.34), H - Math.round(H * 0.10), Math.round(W * 0.32), Math.round(H * 0.07));

  // ---- framed window: still snapshot of the real city ----
  const winW = Math.round(W * 0.34), winH = Math.round(H * 0.34);
  const wx = Math.round(W * 0.5 - winW / 2), wy = ceilH + Math.round(H * 0.05);
  ctx.fillStyle = S.woodDark; ctx.fillRect(wx - 5, wy - 5, winW + 10, winH + 10);
  ctx.fillStyle = S.wood; ctx.fillRect(wx - 3, wy - 3, winW + 6, winH + 6);
  if (cityImg) ctx.drawImage(cityImg, wx, wy, winW, winH);
  else { ctx.fillStyle = "#0d1636"; ctx.fillRect(wx, wy, winW, winH); }
  ctx.fillStyle = "rgba(58,38,20,0.9)"; // mullions
  ctx.fillRect(wx + winW / 2 - 1, wy, 2, winH);
  ctx.fillRect(wx, wy + winH / 2 - 1, winW, 2);
  glow(ctx, wx + winW / 2, wy + winH / 2, winW * 0.7, "rgba(60,110,205,0.12)");

  // ---- shelf w/ books, camera + standing lens (upper right) ----
  const shx = Math.round(W * 0.72), shw = Math.round(W * 0.16);
  const shy = ceilH + Math.round(H * 0.22);
  // wood plank (lit top edge + shadowed front) on two brackets
  ctx.fillStyle = S.wood; ctx.fillRect(shx, shy, shw, 3);
  ctx.fillStyle = S.woodLite; ctx.fillRect(shx, shy, shw, 1);
  ctx.fillStyle = S.woodDark; ctx.fillRect(shx, shy + 3, shw, 2);
  ctx.fillStyle = "#241608";
  ctx.fillRect(shx + 4, shy + 5, 2, 4); ctx.fillRect(shx + shw - 6, shy + 5, 2, 4);
  // leaning stack of colour-spined books (left)
  let bxo = shx + 4;
  [["#3a5f8a", 9], ["#8a4a5e", 8], ["#b0763a", 10], ["#4a6f4a", 7]].forEach(([col, bh]) => {
    ctx.fillStyle = col; ctx.fillRect(bxo, shy - bh, 3, bh);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(bxo, shy - bh, 1, bh);
    ctx.fillStyle = "rgba(255,206,120,0.35)"; ctx.fillRect(bxo, shy - bh, 3, 1); // warm top light
    bxo += 4;
  });
  // camera on the shelf (centre) with lens + rim light + record dot
  const camx = shx + Math.round(shw * 0.48);
  ctx.fillStyle = "#20202a"; ctx.fillRect(camx, shy - 7, 11, 7);
  ctx.fillStyle = "#33333f"; ctx.fillRect(camx, shy - 7, 11, 1);              // top highlight
  ctx.fillStyle = "#15151d"; ctx.fillRect(camx + 3, shy - 9, 5, 2);          // viewfinder hump
  ctx.fillStyle = "#0a0a10"; ctx.fillRect(camx + 4, shy - 5, 4, 4);          // lens
  ctx.fillStyle = "#3a6aa0"; ctx.fillRect(camx + 5, shy - 4, 1, 1);          // glass glint
  ctx.fillStyle = "#e0483a"; ctx.fillRect(camx + 9, shy - 6, 1, 1);          // record dot
  // standing lens (right)
  const lnx = shx + shw - 9;
  ctx.fillStyle = "#15151c"; ctx.fillRect(lnx, shy - 10, 5, 10);
  ctx.fillStyle = "#2a2a34"; ctx.fillRect(lnx, shy - 10, 5, 1);              // top ring
  ctx.fillStyle = "#0a0a10"; ctx.fillRect(lnx + 1, shy - 9, 3, 2);          // front glass
  ctx.fillStyle = "rgba(255,206,120,0.4)"; ctx.fillRect(lnx, shy - 5, 5, 1); // warm rim light

  // ---- slim desk (centred, not full width) ----
  const deskY = Math.round(H * 0.56);
  const deskX0 = Math.round(W * 0.30), deskX1 = Math.round(W * 0.70);
  glow(ctx, W * 0.5, deskY, W * 0.26, "rgba(46,108,255,0.16)");
  ctx.fillStyle = S.wood; ctx.fillRect(deskX0, deskY, deskX1 - deskX0, 3);
  ctx.fillStyle = S.woodLite; ctx.fillRect(deskX0, deskY, deskX1 - deskX0, 1);
  ctx.fillStyle = "#241608";
  ctx.fillRect(deskX0 + 3, deskY + 3, 3, floorY - deskY - 2);
  ctx.fillRect(deskX1 - 6, deskY + 3, 3, floorY - deskY - 2);

  // ---- two compact monitors ----
  const monW = Math.round(W * 0.11), monH = Math.round(H * 0.14), gap = Math.round(W * 0.015);
  [Math.round(W * 0.5 - gap / 2 - monW), Math.round(W * 0.5 + gap / 2)].forEach((mxp, idx) => {
    const myp = deskY - monH;
    ctx.fillStyle = S.metal;
    ctx.fillRect(mxp + monW / 2 - 1, deskY - 4, 3, 4);
    ctx.fillRect(mxp + monW / 2 - 5, deskY - 1, 10, 2);
    ctx.fillStyle = "#08080d"; ctx.fillRect(mxp, myp, monW, monH);
    const b = 2;
    const scx = mxp + b, scy = myp + b, scw = monW - b * 2, sch = monH - b * 2;
    ctx.fillStyle = S.screen; ctx.fillRect(scx, scy, scw, sch);
    // pixel-picture preview (the footage being edited), clipped to its area
    const ph = Math.round(sch * 0.60);
    ctx.save();
    ctx.beginPath(); ctx.rect(scx, scy, scw, ph); ctx.clip();
    if (idx === 0) previewNight(ctx, scx, scy, scw, ph);
    else previewSunset(ctx, scx, scy, scw, ph);
    ctx.restore();
    // dark player strip under the picture
    ctx.fillStyle = "#05070f"; ctx.fillRect(scx, scy + ph, scw, sch - ph);
    const tY = scy + ph + 2; // editing timeline strips
    ["#38bdf8", "#7c5cff", "#34d399"].forEach((c, r) => {
      ctx.fillStyle = c; ctx.globalAlpha = 0.85;
      let x2 = scx + 1;
      while (x2 < scx + scw - 1) { const seg = 3 + ((x2 * (r + 2)) % 6); ctx.fillRect(x2, tY + r * 3, seg, 2); x2 += seg + 2; }
      ctx.globalAlpha = 1;
    });
    glow(ctx, mxp + monW / 2, myp + monH / 2, monW * 0.85, "rgba(56,120,248,0.2)");
  });

  // ---- extra camera gear scattered around the desk ----
  // DSLR body + detached lens standing on the desk (left of the monitors)
  const dlx = Math.round(W * 0.345), dsb = deskY;
  ctx.fillStyle = "#1b1b24"; ctx.fillRect(dlx - 7, dsb - 8, 14, 8);      // body
  ctx.fillStyle = "#2a2a36"; ctx.fillRect(dlx - 7, dsb - 8, 14, 1);      // top highlight
  ctx.fillStyle = "#141019"; ctx.fillRect(dlx - 2, dsb - 11, 6, 3);      // pentaprism hump
  ctx.fillStyle = "#0a0a10"; ctx.fillRect(dlx - 1, dsb - 6, 5, 5);       // lens
  ctx.fillStyle = "#3a6aa0"; ctx.fillRect(dlx, dsb - 5, 1, 1);           // glass glint
  ctx.fillStyle = "#e0483a"; ctx.fillRect(dlx + 5, dsb - 7, 1, 1);       // record dot
  ctx.fillStyle = "#15151c"; ctx.fillRect(dlx + 9, dsb - 13, 5, 13);     // standing lens
  ctx.fillStyle = "#2a2a34"; ctx.fillRect(dlx + 9, dsb - 13, 5, 1);      // top ring
  ctx.fillStyle = "rgba(255,206,120,0.4)"; ctx.fillRect(dlx + 9, dsb - 7, 5, 1); // warm rim light

  // clapperboard leaning on the desk (right of the monitors)
  ctx.save();
  ctx.translate(Math.round(W * 0.64), deskY);
  ctx.rotate(-0.12);
  ctx.fillStyle = "#0e0e14"; ctx.fillRect(-8, -13, 16, 13);              // slate
  ctx.fillStyle = "#e8e8ee"; ctx.fillRect(-8, -16, 16, 3);              // clapper bar
  ctx.fillStyle = "#111118"; for (let i = 0; i < 5; i++) ctx.fillRect(-8 + i * 3.4, -16, 1.7, 3); // stripes
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(-6, -10, 12, 1); ctx.fillRect(-6, -7, 12, 1); ctx.fillRect(-6, -4, 12, 1); // scene lines
  ctx.restore();

  // padded camera bag on the floor (left of the desk)
  const bgx = Math.round(W * 0.26), bgy = Math.round(H * 0.80);
  ctx.fillStyle = "#141019"; ctx.fillRect(bgx - 11, bgy - 12, 22, 12);   // body
  ctx.fillStyle = "#1c1c28"; ctx.fillRect(bgx - 11, bgy - 12, 22, 2);    // top highlight
  ctx.fillStyle = "#0a0a10"; ctx.fillRect(bgx - 6, bgy - 16, 12, 4);     // flap / grab handle
  ctx.strokeStyle = "#2a2650"; ctx.lineWidth = 1; ctx.strokeRect(bgx - 8, bgy - 9, 16, 6); // pocket seam

  // ---- simple office chair (slim silhouette, front) ----
  const cxp = Math.round(W * 0.5);
  ctx.fillStyle = "#0c0c12";
  ctx.fillRect(cxp - Math.round(W * 0.035), Math.round(H * 0.55), Math.round(W * 0.07), Math.round(H * 0.16)); // back
  ctx.fillRect(cxp - Math.round(W * 0.04), Math.round(H * 0.71), Math.round(W * 0.08), Math.round(H * 0.04)); // seat
  ctx.fillRect(cxp - 2, Math.round(H * 0.75), 4, Math.round(H * 0.07)); // post
  ctx.fillRect(cxp - Math.round(W * 0.035), Math.round(H * 0.86), Math.round(W * 0.07), 3); // base
  ctx.fillStyle = "#17171f";
  ctx.fillRect(cxp - Math.round(W * 0.037), Math.round(H * 0.55), 2, Math.round(H * 0.16)); // rim

  // ---- softbox light on a stand (left) — reference-style; aims right + down ----
  const lxp = Math.round(W * 0.19), headY = Math.round(H * 0.42);
  // splayed tripod legs from a hub
  ctx.strokeStyle = "#16161e"; ctx.lineWidth = 2;
  const lHub = Math.round(H * 0.7), lFoot = Math.round(H * 0.9);
  ctx.beginPath();
  ctx.moveTo(lxp, lHub); ctx.lineTo(lxp - Math.round(W * 0.034), lFoot);
  ctx.moveTo(lxp, lHub); ctx.lineTo(lxp + Math.round(W * 0.034), lFoot);
  ctx.moveTo(lxp, lHub); ctx.lineTo(lxp, Math.round(H * 0.87));
  ctx.stroke();
  // two-section center column (highlight edge) + a clamp knob + tilt knuckle
  ctx.fillStyle = "#1a1a22"; ctx.fillRect(lxp - 1, headY, 3, lHub - headY);
  ctx.fillStyle = "#2b2b36"; ctx.fillRect(lxp - 1, headY, 1, lHub - headY);
  ctx.fillStyle = "#0d0d15"; ctx.fillRect(lxp - 2, Math.round((headY + lHub) / 2), 5, 3);
  ctx.fillStyle = "#0d0d15"; ctx.fillRect(lxp - 3, headY - 2, 6, 5);
  // softbox head: compact 3D box (white front panel + dark side faces receding
  // to the back), tilted so the face aims down-right. Front frame AND back
  // frame both have softly rounded corners (no sharp corners). Smaller.
  ctx.save();
  ctx.translate(lxp, headY);
  ctx.rotate(0.42);
  const sw = Math.round(W * 0.05), sh = Math.round(H * 0.2); // smaller
  const bd = Math.max(6, Math.round(W * 0.024));             // box depth (the 3D)
  const oy = -Math.round(sh * 0.5) - 2;
  const L = -sw / 2, R = sw / 2, T = oy - sh / 2, B = oy + sh / 2;
  const cr = Math.max(1, Math.round(sw * 0.1));             // slight corner radius
  const bw = Math.round(sw * 0.5), bh = Math.round(sh * 0.5); // smaller back frame
  const bL = L - bd + (sw - bw) / 2, bT = T - bd + (sh - bh) / 2; // back top-left
  // rounded-rect path helper
  const rr = (x, y, w, h, r) => {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  };
  ctx.fillStyle = "#15151c"; ctx.fillRect(-1.5, B, 3, 4);    // short mount arm
  // back frame (offset up-left, rounded, smaller) → front panel faces down-right
  ctx.fillStyle = "#0a0a12"; rr(bL, bT, bw, bh, cr); ctx.fill();
  // side faces (the 3D depth) — connect the front frame to the smaller back frame
  ctx.fillStyle = "#171721"; // top side face
  ctx.beginPath(); ctx.moveTo(L + cr, T); ctx.lineTo(bL + cr, bT); ctx.lineTo(bL + bw - cr, bT); ctx.lineTo(R - cr, T); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#0f0f18"; // left side face
  ctx.beginPath(); ctx.moveTo(L, T + cr); ctx.lineTo(bL, bT + cr); ctx.lineTo(bL, bT + bh - cr); ctx.lineTo(L, B - cr); ctx.closePath(); ctx.fill();
  // front frame (rounded) + white diffusion face (rounded, inset)
  ctx.fillStyle = "#0b0b11"; rr(L - 2, T - 2, sw + 4, sh + 4, cr + 1); ctx.fill();
  const dg = ctx.createLinearGradient(L, T, R, B);
  dg.addColorStop(0, "#ffffff"); dg.addColorStop(1, "#ecc084");
  ctx.fillStyle = dg; rr(L, T, sw, sh, cr); ctx.fill();
  // hot centre + diffusion seams (cross), clipped to the rounded face
  ctx.save();
  rr(L, T, sw, sh, cr); ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillRect(Math.round(L + sw * 0.25), oy - Math.round(sh * 0.28), Math.round(sw * 0.5), Math.round(sh * 0.5));
  ctx.fillStyle = "rgba(110,80,40,0.4)";
  ctx.fillRect(L, oy - 1, sw, 1); ctx.fillRect(-1, T, 1, sh);
  ctx.restore();
  ctx.restore();
  glow(ctx, lxp + Math.round(W * 0.03), headY - Math.round(H * 0.03), W * 0.3, "rgba(255,206,120,0.32)");

  // ---- cinema camera on a tripod (right, close to the desk) ----
  const txp = Math.round(W * 0.80), tHead = Math.round(H * 0.44);
  const cbw = Math.round(W * 0.056), cbh = Math.round(H * 0.06);
  const cbx = Math.round(txp - cbw / 2), cby = tHead - cbh; // body bottom sits AT tHead
  const plateH = Math.max(2, Math.round(H * 0.018)), colH = Math.round(H * 0.022);
  const apexY = tHead + plateH + colH; // legs converge just under the head
  // tripod legs
  ctx.strokeStyle = "#141019"; ctx.lineWidth = 3;
  const tLeg = Math.round(H * 0.88);
  ctx.beginPath();
  ctx.moveTo(txp, apexY); ctx.lineTo(txp - Math.round(W * 0.035), tLeg);
  ctx.moveTo(txp, apexY); ctx.lineTo(txp + Math.round(W * 0.035), tLeg);
  ctx.moveTo(txp, apexY); ctx.lineTo(txp + 2, Math.round(H * 0.86));
  ctx.stroke();
  // center column + pan-head plate that the body rests on (connects legs→body)
  ctx.fillStyle = "#141019"; ctx.fillRect(txp - 2, tHead + plateH, 4, colH);
  ctx.fillStyle = "#1c1c26"; ctx.fillRect(txp - 6, tHead, 12, plateH);
  ctx.fillStyle = "#2a2a36"; ctx.fillRect(txp - 6, tHead, 12, 1);
  // camera body (bottom edge sits on the plate — no gap)
  ctx.fillStyle = "#20202a"; ctx.fillRect(cbx, cby, cbw, cbh);
  ctx.fillStyle = "#31313d"; ctx.fillRect(cbx, cby, cbw, 2);            // top highlight
  ctx.fillStyle = "#15151d"; ctx.fillRect(cbx + 2, cby - 3, cbw - 6, 3); // top handle
  // lens barrel (left) + glass + glint
  ctx.fillStyle = "#15151c"; ctx.fillRect(cbx - Math.round(W * 0.02), cby + 2, Math.round(W * 0.022), cbh - 4);
  ctx.fillStyle = "#0a0a10"; ctx.fillRect(cbx - Math.round(W * 0.022), cby + 3, 2, cbh - 6);
  ctx.fillStyle = "#3a6aa0"; ctx.fillRect(cbx - Math.round(W * 0.021), cby + 4, 1, 2);
  // flip-out side screen (cool glow) + record light
  ctx.fillStyle = "#0e2842"; ctx.fillRect(cbx + cbw - 3, cby + 2, 3, cbh - 5);
  ctx.fillStyle = "#e0483a"; ctx.fillRect(cbx + cbw - 5, cby + 2, 2, 2);
  glow(ctx, cbx + cbw, cby + cbh / 2, W * 0.05, "rgba(60,120,200,0.14)");
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
function Moon({ x, y, size, scroll, vh, pointer }) {
  const tex = useMemo(() => {
    const t = moonTexture();
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef(null);
  const off = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    if (!ref.current) return;
    const p = pointer?.current || { x: 0, y: 0 };
    off.current.x = THREE.MathUtils.damp(off.current.x, p.x * vh * 0.03, 2.5, dt);
    off.current.y = THREE.MathUtils.damp(off.current.y, p.y * vh * 0.02, 2.5, dt);
    ref.current.position.x = x + off.current.x;
    ref.current.position.y = y + scroll.current * SHIFT * vh * 0.42 + off.current.y;
  });
  return (
    <mesh ref={ref} position={[x, y, 0]} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ---- star field: pixel points that twinkle and orbit (curved motion) -------
function StarField({ scroll, pointer }) {
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
  const off = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uPR.value = state.gl.getPixelRatio();
    if (ref.current) {
      const p = pointer?.current || { x: 0, y: 0 };
      ref.current.rotation.z = state.clock.elapsedTime * 0.022; // slow orbit → curved paths
      // farthest layer → smallest pointer parallax
      off.current.x = THREE.MathUtils.damp(off.current.x, p.x * vw * 0.012, 2, dt);
      off.current.y = THREE.MathUtils.damp(off.current.y, p.y * vh * 0.01, 2, dt);
      ref.current.position.x = off.current.x;
      ref.current.position.y = scroll.current * SHIFT * vh * 0.15 + off.current.y;
    }
  });
  return <points ref={ref} geometry={geom} material={mat} renderOrder={0.5} />;
}

// ============================================================================

const flatMat = (tex) => ({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });

function Band({ tex, top0, bot0, order, lift, sway = 0, drift = 0, scroll, pointer }) {
  const ref = useRef(null);
  const off = useRef({ x: 0, y: 0 }); // damped pointer offset (smooth, weighty)
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const w = vw * OVER;
  const top = vh * 0.5 - top0 * vh;
  const bot = vh * 0.5 - bot0 * vh;
  const cy = (top + bot) / 2;
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const p = pointer?.current || { x: 0, y: 0 };
    // depth parallax: nearer bands (higher sway) shift more with the pointer
    const tx = p.x * vw * 0.032 * sway;
    const ty = p.y * vh * 0.014 * sway;
    off.current.x = THREE.MathUtils.damp(off.current.x, tx, 3.5, dt);
    off.current.y = THREE.MathUtils.damp(off.current.y, ty, 3.5, dt);
    let x = off.current.x;
    if (drift) x += ((state.clock.elapsedTime * drift) % (w * 0.3)) - w * 0.15;
    g.position.x = x;
    g.position.y = cy + scroll.current * SHIFT * vh * lift + off.current.y;
  });
  return (
    <mesh ref={ref} position={[0, cy, 0]} renderOrder={order}>
      <planeGeometry args={[w, top - bot]} />
      <meshBasicMaterial {...flatMat(tex)} />
    </mesh>
  );
}

// A landmark: dark structure + additive LED mask that cycles through RGB hues.
// `ext` is extra height whose legs run BELOW the roofline into the near-city
// (which renders in front and hides them, so the tower reads as rooted, not floating).
function Landmark({ struct, leds, x, w, h, ext = 0, phase, scroll, pointer }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const planeH = h + ext;
  // tower base still sits on the roofline; the ext hangs below it
  const baseY = vh * 0.5 - ROOF0 * vh + h / 2 - ext / 2;
  const gref = useRef(null);
  const lref = useRef(null);
  const off = useRef({ x: 0, y: 0 });
  useFrame((state, dt) => {
    const g = gref.current;
    if (g) {
      const p = pointer?.current || { x: 0, y: 0 };
      // depth 0.85 → parallaxes between the mid (0.72) and near (0.95) bands it sits
      // among. MUST apply the same vertical parallax as those bands, otherwise the
      // towers stay put while the skyline shifts and they look like they float.
      const tx = p.x * vw * 0.032 * 0.85;
      const ty = p.y * vh * 0.014 * 0.85;
      off.current.x = THREE.MathUtils.damp(off.current.x, tx, 3.5, dt);
      off.current.y = THREE.MathUtils.damp(off.current.y, ty, 3.5, dt);
      g.position.y = baseY + scroll.current * SHIFT * vh * CITY_LIFT + off.current.y;
      g.position.x = x + off.current.x;
    }
    if (lref.current) {
      const hue = (state.clock.elapsedTime * 0.07 + phase) % 1;
      lref.current.material.color.setHSL(hue, 0.9, 0.6);
    }
  });
  return (
    <group ref={gref} position={[x, baseY, 0]}>
      <mesh renderOrder={3}>
        <planeGeometry args={[w, planeH]} />
        <meshBasicMaterial {...flatMat(struct)} />
      </mesh>
      <mesh ref={lref} renderOrder={3} position={[0, 0, 0.1]}>
        <planeGeometry args={[w, planeH]} />
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
// fraction of tower height added below the base as "legs" that run into the
// near-city (which renders in front and occludes them → no floating look).
const LM_EXT = 0.16;
const LM_SS = 3; // landmark texture supersample

// clear-colour lerp: cool night-blue at the top → warm tungsten at the studio,
// so any sliver behind the layers reads correctly through the descent.
function BgColor({ scroll }) {
  const { scene } = useThree();
  const cool = useMemo(() => new THREE.Color(SKY.top), []);
  const warm = useMemo(() => new THREE.Color("#1c1207"), []);
  const cur = useMemo(() => new THREE.Color(), []);
  useFrame(() => {
    const t = Math.min(1, Math.max(0, (scroll.current - 0.45) / 0.45));
    scene.background = cur.copy(cool).lerp(warm, t);
  });
  return null;
}

function Scene({ scroll, pointer }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const bw = Math.round(vw / 40) * 40;
  const bh = Math.round(vh / 40) * 40;

  const tex = useMemo(() => {
    const artW = Math.ceil((bw * OVER) / PX);
    const cityH = Math.ceil(((CITY_H + CITY_BLEED) * bh) / PX);
    const skyH = Math.ceil((1.12 * bh) / PX);
    const balH = Math.ceil((BAL_SPAN * bh) / PX);
    const near = { body: "#0e0b22", bodyR: "#070512", edge: "#1c1838", roof: "#3a4270" };
    const mid = { body: "#171334", bodyR: "#0d0a22", edge: "#2a2650", roof: "#3a4270" };
    const far = { body: "#221d46", bodyR: "#181336", edge: "#39457a", roof: "#3a4270" };
    const t = {
      sky: makeTex(artW, skyH, drawSky),
      // shorter buildings (lower max-height fraction = fewer floors, not squashed)
      far: makeTex(artW, cityH, cityDrawer(21, 0.22, 0.58, far, 0.24, 0.24)),
      mid: makeTex(artW, cityH, cityDrawer(88, 0.18, 0.44, mid, 0.5, 0.32)),
      near: makeTex(artW, cityH, cityDrawer(303, 0.14, 0.36, near, 0.42, 0.3)),
      balcony: makeTex(artW, balH, drawBalcony),
      studio: makeTex(
        artW,
        Math.ceil((STUDIO_H * bh) / PX),
        // bake a still city snapshot and hang it in the studio window
        (c, W, Hh) => drawStudio(c, W, Hh, makeCityWindow(Math.round(W * 0.34), Math.round(Hh * 0.34))),
      ),
      lm: {},
    };
    LANDMARKS.forEach((L) => {
      const h = Math.ceil((L.hFrac * bh) / PX);
      const w = Math.ceil(h * L.aspect);
      const extTex = Math.round(h * LM_EXT);
      const htot = h + extTex;
      t.lm[L.key] = {
        struct: makeTex(w, htot, (c, W, Hh) => {
          const th = Hh - extTex; // draw the tower in the top part…
          L.draw(c, W, th, false);
          // …then smear its base row straight down through the extension, so each
          // silhouette's legs (KL shaft, Merdeka base, Petronas' two legs) run down.
          c.drawImage(c.canvas, 0, (th - 1) * LM_SS, W * LM_SS, LM_SS, 0, th, W, extTex);
        }, LM_SS),
        leds: makeTex(w, htot, (c, W, Hh) => L.draw(c, W, Hh - extTex, true), LM_SS),
      };
    });
    return t;
  }, [bw, bh]);

  useEffect(() => () => {
    [tex.sky, tex.far, tex.mid, tex.near, tex.balcony, tex.studio].forEach((t) => t.dispose && t.dispose());
    Object.values(tex.lm).forEach((l) => (l.struct.dispose(), l.leds.dispose()));
  }, [tex]);

  const cityTop = ROOF0 - CITY_H;
  const cityBot = ROOF0 + CITY_BLEED;
  return (
    <>
      <BgColor scroll={scroll} />
      {/* The city→balcony→studio stack moves rigidly (lift 1.0) so it reads as one
          connected world. Only the backmost sky/moon/stars lag on scroll (lift < 1)
          for depth, and every layer parallaxes on the pointer by its `sway` (depth). */}
      <Band tex={tex.sky} top0={-0.06} bot0={1.06} order={0} lift={0.9} sway={0.28} scroll={scroll} pointer={pointer} />
      <StarField scroll={scroll} pointer={pointer} />
      <Moon x={vw * 0.3} y={vh * 0.3} size={vh * 0.2} scroll={scroll} vh={vh} pointer={pointer} />
      <Band tex={tex.far} top0={cityTop} bot0={cityBot} order={1} lift={0.97} sway={0.5} scroll={scroll} pointer={pointer} />
      <Band tex={tex.mid} top0={cityTop} bot0={cityBot} order={2} lift={1.0} sway={0.72} scroll={scroll} pointer={pointer} />
      {LANDMARKS.map((L) => (
        <Landmark
          key={L.key}
          struct={tex.lm[L.key].struct}
          leds={tex.lm[L.key].leds}
          x={vw * L.x}
          w={vh * L.hFrac * L.aspect}
          h={vh * L.hFrac}
          ext={vh * L.hFrac * LM_EXT}
          phase={L.phase}
          scroll={scroll}
          pointer={pointer}
        />
      ))}
      <Band tex={tex.near} top0={cityTop} bot0={cityBot} order={4} lift={1.0} sway={0.95} scroll={scroll} pointer={pointer} />
      <Band tex={tex.balcony} top0={BAL_TOP} bot0={BAL_TOP + BAL_SPAN} order={5} lift={1.0} sway={1.25} scroll={scroll} pointer={pointer} />
      {/* studio sits directly below the deck — same sway so the seam holds */}
      <Band tex={tex.studio} top0={STUDIO_TOP0} bot0={STUDIO_BOT0} order={6} lift={1.0} sway={1.25} scroll={scroll} pointer={pointer} />
    </>
  );
}

export default function CityBackground() {
  const scroll = useRef(0);
  // page-wide pointer in NDC [-1,1]. Driven from a window listener (not R3F's
  // built-in pointer) so the parallax reacts to the mouse ANYWHERE on the page,
  // not only over the bare canvas (the hero card etc. sit on top of it).
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    // gentle device-tilt parallax on phones/tablets (gamma≈left-right, beta≈front-back)
    const onTilt = (e) => {
      if (e.gamma == null) return;
      pointer.current.x = Math.max(-1, Math.min(1, e.gamma / 35));
      pointer.current.y = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        // scene layers read the EASED descent (city holds 60%, then descends);
        // CSS keeps the raw progress for the scroll-hint fade.
        scroll.current = descentProgress(p);
        doc.style.setProperty("--p", p.toFixed(4));
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
        <Scene scroll={scroll} pointer={pointer} />
      </Canvas>
      <div className="vignette" />
    </div>
  );
}
