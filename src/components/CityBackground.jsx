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
// vertical parallax travel over a full-page scroll; 0.85 = ~15% slower feel
const SHIFT = (ROOF0 - ROOF1) * 0.85;
const CITY_H = 0.5;      // city band ≈ 50% of viewport
const CITY_BLEED = 0.1; // city extends below the roofline (hidden by balcony)
const CITY_LIFT = 0.97;  // vertical parallax factor shared by city + landmarks
// balcony: railing rises above the rooftop edge; deck fills below
const BAL_TOP = 0.76;    // viewport fraction of the handrail (top of balcony)
const BAL_SPAN = 1.05;   // balcony plane height in viewport units (deck runs off-screen)

// ── COVERAGE GUARANTEE ───────────────────────────────────────────────────────
//  Why the background stays consistent no matter how much UI you add in front:
//  the scene is position:fixed (covers only the viewport) and driven by
//  NORMALISED scroll (0→1 over the whole page), so it always performs exactly
//  ONE pan top→bottom. Adding sections spreads that pan over more scrolling —
//  it never stretches the art and never overshoots its range.
//
//  The constants below make the "no gaps between the models" promise explicit.
//  MAX_LIFT is the largest `lift` any band uses; MAX_TRAVEL is therefore the
//  biggest upward pan (in vh fractions) any layer can make. Every covering band
//  is sized/placed to still fill the screen — with COVER margin to spare — at
//  both scroll extremes. If you tweak the parallax later, keep MAX_LIFT in sync
//  and the dev-time check in Scene() will warn you the moment a gap could open.
const MAX_LIFT = 1.04;                 // biggest `lift` passed to any <Band>
const MAX_TRAVEL = SHIFT * MAX_LIFT;   // largest upward parallax pan (≈0.221 vh)
const COVER = MAX_TRAVEL + 0.06;       // + margin for mouse-sway & rounding
// Sky is the backstop behind everything: make it overhang the screen top & bottom
// by COVER so it fills the viewport across the entire pan (span, centred on 0).
const SKY_SPAN = Math.max(1.12, 1 + 2 * COVER);

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

function cityDrawer(seed, minF, maxF, palette, density, dim, signs) {
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
    // Video-production signs: draw a controlled host building at each slot and
    // stamp the sign on its ACTUAL rooftop, so every sign is part of the city
    // and sits on a real building (never floats, never a lone skinny tower).
    if (signs)
      for (const s of signs) {
        const fx = Math.round(s.atFrac * W);
        const fw = s.hostW;
        const fh = Math.round(s.hostHFrac * H);
        featureHost(ctx, Math.round(fx - fw / 2), H - fh, fw, fh, cfg, s.film);
        s.sign(ctx, fx, H - fh); // roof top = H - fh
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
    const galL = cx - headW / 2, galR = cx + headW / 2;
    const crown = headTop + 1;

    // 1) flared underside: shaft top curves OUT to the gallery rim (two soft
    //    segments instead of one straight edge, so it reads as a cone, not a "<")
    ledLine(ctx, [[cx - shaftTopW / 2, headBot], [cx - headW * 0.44, gallery + 1.5], [galL, gallery]], 1.1);
    ledLine(ctx, [[cx + shaftTopW / 2, headBot], [cx + headW * 0.44, gallery + 1.5], [galR, gallery]], 1.1);

    // 2) domed crown: the rim wraps up and OVER to a rounded top — this closes
    //    the silhouette into a pod so the two sides no longer look like arrows
    ledLine(ctx, [
      [galL, gallery], [cx - headW * 0.3, crown + 1.5],
      [cx, crown - 2.5], [cx + headW * 0.3, crown + 1.5], [galR, gallery],
    ], 1.1);

    // 3) observation deck: a gently curved ring line + a row of deck lights
    ledLine(ctx, [[galL, gallery + 0.5], [cx, gallery + 2.5], [galR, gallery + 0.5]], 1.0);
    for (let dx = -headW / 2 + 3; dx <= headW / 2 - 3; dx += 3.4) ledDot(ctx, cx + dx, gallery + 1, 1.0);

    // slim antenna accent rising from the crown + the ground line
    ledLine(ctx, [[cx, crown - 2.5], [cx, headTop * 0.5]], 0.6);
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
  // Redesigned: a sleek glass-balustrade rooftop terrace — far less cluttered
  // than before. Same key y-lines so BAL_TOP / BAL_SPAN placement is unchanged.
  const railTop = 11, handH = 5, midY = 27, capY = 42;

  // --- solid parapet + deck (foreground surface) ---
  const fg = ctx.createLinearGradient(0, capY, 0, H);
  fg.addColorStop(0, "#100d20");
  fg.addColorStop(1, "#050409");
  ctx.fillStyle = fg;
  ctx.fillRect(0, capY, W, H - capY);
  // lit concrete cap the railing mounts on
  ctx.fillStyle = "#241f4a";
  ctx.fillRect(0, capY, W, 4);
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#3fe0ff";
  ctx.fillRect(0, capY, W, 1.5);
  ctx.globalAlpha = 1;

  // --- glass balustrade: framed top+bottom rails + regular posts (no open gap) ---
  const glassTop = railTop + handH, glassBot = capY, glassH = glassBot - glassTop;
  ctx.globalAlpha = 0.1; // glass tint — darker/deeper so it reads as smoked glass
  ctx.fillStyle = "#1d4a63";
  ctx.fillRect(0, glassTop, W, glassH);
  ctx.globalAlpha = 1;
  // posts (closer together) + a soft reflection streak on each panel
  for (let x = 8; x < W; x += 18) {
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = "#bfe9ff";
    ctx.fillRect(x + 5, glassTop, 2, glassH);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#15122e";
    ctx.fillRect(x, glassTop, 2, glassH);
    ctx.fillStyle = "#2c2660";
    ctx.fillRect(x, glassTop, 1, glassH);
  }
  // bottom rail — closes the gap just above the cap
  ctx.fillStyle = "#161234";
  ctx.fillRect(0, glassBot - 3, W, 3);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "#3a3470";
  ctx.fillRect(0, glassBot - 3, W, 1);
  ctx.globalAlpha = 1;
  // mid rail
  ctx.fillStyle = "#141130";
  ctx.fillRect(0, midY, W, 2);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#3a3470";
  ctx.fillRect(0, midY, W, 1);
  ctx.globalAlpha = 1;
  // handrail with neon top edge
  ctx.fillStyle = "#0f0d24";
  ctx.fillRect(0, railTop, W, handH);
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "#3fe0ff";
  ctx.fillRect(0, railTop, W, 1.5);
  ctx.globalAlpha = 1;

  // --- string lights strung above the rail (soft multicolour bulbs) ---
  ctx.strokeStyle = "rgba(120,100,70,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const y = 4 + Math.sin((x / W) * Math.PI * 9) * 2.5;
    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  const bulbs = ["#ffd27a", "#7dd3fc", "#ff9ecb", "#c9b6ff"];
  for (let x = 16, i = 0; x < W; x += 40, i++) {
    const y = 6 + Math.sin((x / W) * Math.PI * 9) * 2.5;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = bulbs[i % bulbs.length];
    ctx.fillRect(x - 1.5, y - 1.5, 4, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffe6a8";
    ctx.fillRect(x, y, 2, 2);
  }

  // --- cozy props: four evenly-spaced vignettes on a grounded deck ---------
  // The whole balcony texture is supersampled (see makeTex ss below) so props
  // stay crisp. They're laid out as deliberate little scenes with clear gaps
  // between them (rather than scattered) and every prop rests on `floor`.
  const floor = capY + 5;
  const D = "#171433"; // prop silhouette colour
  const px = (f) => Math.round(W * f);

  // visible deck the props stand on — grounds them so they don't float
  const deck = ctx.createLinearGradient(0, floor, 0, H);
  deck.addColorStop(0, "#1b1738");
  deck.addColorStop(0.4, "#100d24");
  deck.addColorStop(1, "#070512");
  ctx.fillStyle = deck;
  ctx.fillRect(0, floor, W, H - floor);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#39336a";
  ctx.fillRect(0, floor, W, 1);       // lit front edge of the deck
  ctx.globalAlpha = 1;

  const glow = (cx, cy, r) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,214,130,0.62)");
    g.addColorStop(0.45, "rgba(255,176,90,0.28)");
    g.addColorStop(1, "rgba(255,176,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff2cf";
    ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2);
  };
  const shadow = (cx, w) => {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.ellipse(cx, floor + 1, w / 2, 2.5, 0, 0, Math.PI * 2); // grounding pool
    ctx.fill();
    ctx.globalAlpha = 1;
  };
  const plant = (x, hgt, n, col) => {
    const base = floor + 2;
    shadow(x, 16);
    ctx.fillStyle = col;
    for (let i = 0; i < n; i++)
      ctx.fillRect(x + (i - (n - 1) / 2) * 4, base - hgt + Math.abs(i - (n - 1) / 2) * 3, 3, hgt - Math.abs(i - (n - 1) / 2) * 3);
    ctx.fillStyle = "#15112c";
    ctx.fillRect(x - 7, base - 2, 14, 12); // pot
  };
  const hangLantern = (x) => {
    ctx.strokeStyle = "rgba(120,100,70,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 5); ctx.lineTo(x, 17);
    ctx.stroke();
    glow(x, 22, 10);
    ctx.fillStyle = "#ffcf6b"; ctx.fillRect(x - 3, 18, 7, 7);
    ctx.fillStyle = "#ffe6a8"; ctx.fillRect(x - 2, 19, 5, 5);
  };
  const standLantern = (x, col) => {
    shadow(x, 14);
    ctx.fillStyle = D;
    ctx.fillRect(x - 5, floor - 1, 10, 2);   // base
    ctx.fillRect(x - 1, floor - 17, 3, 16);  // post
    ctx.fillStyle = col;
    ctx.fillRect(x - 3, floor - 22, 6, 6);   // lamp
    glow(x, floor - 19, 10);
  };
  const floorLamp = (x) => {
    shadow(x, 16);
    ctx.fillStyle = D;
    ctx.fillRect(x - 5, floor - 1, 10, 2);   // base
    ctx.fillRect(x - 1, floor - 22, 3, 21);  // pole
    ctx.fillStyle = "#241f4a";
    ctx.fillRect(x - 6, floor - 28, 12, 6);  // shade
    glow(x, floor - 25, 11);
  };

  // overhead string-lantern rhythm + corner greenery framing the scenes
  hangLantern(px(0.10));
  hangLantern(px(0.50));
  hangLantern(px(0.90));
  plant(px(0.03), 32, 11, "#0e2416"); // tall palm, far-left corner
  plant(px(0.28), 22, 9, "#0e1c14");  // divider L
  plant(px(0.72), 20, 8, "#0e1c14");  // divider R
  plant(px(0.97), 18, 7, "#0d1a12");  // far-right corner

  // ============ VIGNETTE 1 — coffee lounge (left) ============
  const v1 = px(0.15);
  floorLamp(v1 - 42);
  // bistro table + two chairs + candle
  shadow(v1, 46);
  ctx.fillStyle = D;
  ctx.fillRect(v1 - 20, floor - 14, 3, 15); ctx.fillRect(v1 - 23, floor - 22, 8, 3); // L chair
  ctx.fillRect(v1 + 17, floor - 14, 3, 15); ctx.fillRect(v1 + 15, floor - 22, 8, 3); // R chair
  ctx.fillRect(v1 - 2, floor - 12, 4, 13);  // pedestal
  ctx.fillRect(v1 - 11, floor - 14, 22, 3); // table top
  glow(v1, floor - 18, 5);                  // candle
  ctx.fillStyle = "#ffe6a8"; ctx.fillRect(v1 - 1, floor - 20, 3, 4);
  // stool with a warm mug + steam
  const st = v1 + 42;
  shadow(st, 14);
  ctx.fillStyle = D;
  ctx.fillRect(st - 7, floor - 9, 14, 3); // top
  ctx.fillRect(st - 5, floor - 6, 2, 6); ctx.fillRect(st + 3, floor - 6, 2, 6); // legs
  glow(st, floor - 13, 5);                // mug
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#dfeaff";
  ctx.fillRect(st - 1, floor - 18, 1, 4); ctx.fillRect(st + 2, floor - 20, 1, 4); // steam
  ctx.globalAlpha = 1;

  // ============ VIGNETTE 2 — creative studio (centre-left) ============
  const v2 = px(0.39);
  // easel with a tiny abstract canvas
  const es = v2 - 20;
  shadow(es, 18);
  ctx.strokeStyle = D;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(es - 7, floor); ctx.lineTo(es, floor - 24); // left leg
  ctx.moveTo(es + 7, floor); ctx.lineTo(es, floor - 24); // right leg
  ctx.stroke();
  ctx.fillStyle = "#2a2550"; ctx.fillRect(es - 8, floor - 22, 16, 13); // canvas
  ctx.globalAlpha = 0.6; ctx.fillStyle = "#3fe0ff"; ctx.fillRect(es - 7, floor - 21, 14, 5); ctx.globalAlpha = 1;
  ctx.fillStyle = "#ff9ecb"; ctx.fillRect(es - 7, floor - 15, 14, 4);
  // camera on a tripod
  const cv = v2 + 20;
  shadow(cv, 20);
  ctx.strokeStyle = D;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cv, floor - 16); ctx.lineTo(cv - 8, floor);
  ctx.moveTo(cv, floor - 16); ctx.lineTo(cv + 8, floor);
  ctx.moveTo(cv, floor - 16); ctx.lineTo(cv + 1, floor);
  ctx.stroke();
  ctx.fillStyle = "#1d1940";
  ctx.fillRect(cv - 8, floor - 24, 16, 8); // body
  ctx.fillRect(cv + 7, floor - 22, 4, 4);  // lens
  ctx.fillStyle = "#ff5a5a"; ctx.fillRect(cv - 6, floor - 23, 2, 2); // rec light

  // ============ VIGNETTE 3 — chill nook (centre-right) ============
  const v3 = px(0.61);
  // beanbag / floor cushion
  const bb = v3 - 22;
  shadow(bb, 22);
  ctx.fillStyle = "#2a2550";
  ctx.beginPath(); ctx.ellipse(bb, floor - 3, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#332b5c";
  ctx.beginPath(); ctx.ellipse(bb, floor - 7, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
  // standing lantern
  standLantern(v3, "#ffb347");
  // acoustic guitar leaning
  const gt = v3 + 24;
  shadow(gt, 14);
  ctx.strokeStyle = "#241a10"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(gt - 2, floor - 8); ctx.lineTo(gt - 9, floor - 28); ctx.stroke(); // neck
  ctx.fillStyle = "#5a3a1e";
  ctx.beginPath(); ctx.ellipse(gt, floor - 6, 7, 9, 0, 0, Math.PI * 2); ctx.fill(); // body
  ctx.fillStyle = "#2a1a0e"; ctx.fillRect(gt - 2, floor - 8, 4, 4); // sound hole

  // ============ VIGNETTE 4 — stargazing corner (right) ============
  const v4 = px(0.85);
  // director's chair
  const dc = v4 - 30;
  shadow(dc, 18);
  ctx.strokeStyle = D;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dc - 8, floor); ctx.lineTo(dc + 5, floor - 15);
  ctx.moveTo(dc + 8, floor); ctx.lineTo(dc - 5, floor - 15);
  ctx.stroke();
  ctx.fillStyle = "#241f4a";
  ctx.fillRect(dc - 8, floor - 16, 16, 3); // seat
  ctx.fillRect(dc - 8, floor - 25, 16, 3); // back
  // stack of books beside the chair
  const bk = v4 - 8;
  const books = ["#3b5a86", "#7a3b5a", "#b58a3a"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = books[i];
    ctx.fillRect(bk - 6 + i, floor - 3 - i * 3, 13 - i * 2, 3);
  }
  // telescope on a tripod, pointed at the sky
  const tl = v4 + 22;
  shadow(tl, 16);
  ctx.strokeStyle = D;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tl, floor - 11); ctx.lineTo(tl - 6, floor);
  ctx.moveTo(tl, floor - 11); ctx.lineTo(tl + 6, floor);
  ctx.stroke();
  ctx.strokeStyle = "#3a3470"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(tl - 5, floor - 9); ctx.lineTo(tl + 8, floor - 24); ctx.stroke(); // tube
  ctx.fillStyle = "#2c2660"; ctx.fillRect(tl + 6, floor - 26, 4, 4);
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

// ============================================================================
//  VIDEO-PRODUCTION DECOR — "video editor / content creator" cues drawn in the
//  SAME chunky pixel style and on the SAME PX grid as the buildings. The rooftop
//  signs are BAKED INTO the near-city band on controlled host buildings (see
//  cityDrawer), so each one sits on a real rooftop and rides the city parallax —
//  it can never float. Only the thin editing-timeline (with a slow playhead) is a
//  separate mesh. Canvas textures (ss=1, NearestFilter), no new lights, no
//  post-processing. Kept clear of the hero card + the three landmarks.
// ============================================================================

// chunky (non-antialiased) pixel play triangle
function pxPlay(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const tw = Math.round(w * 0.82), px = x + Math.round((w - tw) / 2);
  for (let r = 0; r < h; r++) {
    const f = 1 - Math.abs(r - (h - 1) / 2) / ((h - 1) / 2 || 1);
    ctx.fillRect(px, y + r, Math.max(1, Math.round(f * tw)), 1);
  }
}
// chunky pixel camera outline
function pxCamera(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  const bw = Math.round(w * 0.72), bh = Math.round(h * 0.72), bx = x, by = y + h - bh;
  ctx.fillRect(bx, by, bw, 1);
  ctx.fillRect(bx, by + bh - 1, bw, 1);
  ctx.fillRect(bx, by, 1, bh);
  ctx.fillRect(bx + bw - 1, by, 1, bh);
  ctx.fillRect(bx + 2, by - 1, 3, 1); // viewfinder bump
  ctx.fillRect(bx + Math.round(bw * 0.32), by + Math.round(bh * 0.32), 2, 2); // lens
  ctx.fillRect(bx + bw, by + Math.round(bh * 0.3), 2, Math.max(1, Math.round(bh * 0.4))); // barrel
}

// --- sign faces (texel units, 1px hard neon). `iconCol` lets the play triangle
//     be lighter than its magenta frame. ---
function faceScreen(drawIcon, iconCol) {
  return (ctx, sx, sy, sw, sh, color) => {
    ctx.fillStyle = "#0b0a1a";
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy, sw, 1);
    ctx.fillRect(sx, sy + sh - 1, sw, 1);
    ctx.fillRect(sx, sy, 1, sh);
    ctx.fillRect(sx + sw - 1, sy, 1, sh);
    drawIcon(ctx, sx + 2, sy + 2, sw - 4, sh - 4, iconCol || color);
  };
}
function faceClapper(ctx, sx, sy, sw, sh, color) {
  ctx.fillStyle = "#0e0c20"; // board
  ctx.fillRect(sx, sy + 2, sw, sh - 2);
  ctx.fillStyle = "#e9e6f5"; // stick
  ctx.fillRect(sx, sy, sw, 2);
  ctx.fillStyle = "#1a1730"; // stripes
  for (let i = 0; i < sw; i += 4) ctx.fillRect(sx + i, sy, 2, 2);
  ctx.fillStyle = color; // neon edge
  ctx.fillRect(sx, sy, sw, 1);
  ctx.fillRect(sx, sy + sh - 1, sw, 1);
  ctx.fillRect(sx, sy + 2, 1, sh - 2);
  ctx.fillRect(sx + sw - 1, sy + 2, 1, sh - 2);
  ctx.globalAlpha = 0.5; // board lines
  ctx.fillRect(sx + 2, sy + 5, sw - 4, 1);
  ctx.fillRect(sx + 2, sy + 8, sw - 4, 1);
  ctx.globalAlpha = 1;
}
function faceMini(variant) {
  const pal = variant === 0
    ? { sky: "#243b6b", sun: "#7dd3fc", m: "#3b82f6" }
    : { sky: "#3a1f4d", sun: "#ffcf6b", m: "#ff5aa8" };
  return (ctx, sx, sy, sw, sh, color) => {
    ctx.fillStyle = "#0b0a1a";
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = pal.sky; // sky band
    ctx.fillRect(sx + 1, sy + 1, sw - 2, Math.round(sh * 0.5));
    ctx.fillStyle = pal.sun; // sun
    ctx.fillRect(sx + sw - 4, sy + 2, 2, 2);
    ctx.fillStyle = pal.m; // mountain (stacked rows)
    const mh = Math.round(sh * 0.5);
    for (let r = 0; r < mh; r++) ctx.fillRect(sx + 1, sy + sh - 1 - r, Math.min(sw - 2, r + 2), 1);
    ctx.fillStyle = color; // neon frame
    ctx.fillRect(sx, sy, sw, 1);
    ctx.fillRect(sx, sy + sh - 1, sw, 1);
    ctx.fillRect(sx, sy, 1, sh);
    ctx.fillRect(sx + sw - 1, sy, 1, sh);
  };
}

// subtle sprocket-hole film strip made of tiny illuminated windows (item 4)
function createFilmWindowColumn(ctx, x, y, h) {
  for (let yy = y; yy < y + h; yy += 4) {
    ctx.globalAlpha = 0.8; // sprocket holes
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(x, yy, 1, 1);
    ctx.fillRect(x + 4, yy, 1, 1);
    ctx.globalAlpha = 1;
    win(ctx, x + 1, yy, 2, 2, "#8be9fd"); // frame cell
  }
}

// plain flat-roof host building (clean roof for a sign) with windows + optional
// film-strip column. Drawn in the band's own texel units → 1:1 with the city.
function featureHost(ctx, x, y, w, h, cfg, film) {
  const shade = Math.max(3, Math.round(w * 0.16));
  ctx.fillStyle = cfg.body;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = cfg.bodyR;
  ctx.fillRect(x + w - shade, y, shade, h);
  ctx.fillStyle = cfg.edge;
  ctx.fillRect(x, y, w, 2);
  for (let wy = y + 5; wy < y + h - 3; wy += 6)
    for (let wx = x + 3; wx < x + w - 4; wx += 5)
      if (cfg.rng() < 0.5) win(ctx, wx, wy, 2, 3, pick(cfg.rng, NEON));
  if (film) createFilmWindowColumn(ctx, x + 3, y + 10, h - 18);
}

// returns a stamp fn that draws a small sign face + support post + chunky halo,
// resting its bottom on the given rooftop y (texel units)
function stampSign(sw, sh, col, drawFace) {
  return (ctx, cx, roofY) => {
    const x = Math.round(cx - sw / 2), y = Math.round(roofY - sh - 2);
    ctx.fillStyle = "#0c0a18"; // short support post onto the roof
    ctx.fillRect(Math.round(cx) - 1, y + sh, 2, 3);
    ctx.globalAlpha = 0.15; // chunky pixel halo (no soft gradient)
    ctx.fillStyle = col;
    ctx.fillRect(x - 2, y - 1, sw + 4, sh + 3);
    ctx.globalAlpha = 1;
    drawFace(ctx, x, y, sw, sh, col);
  };
}

// Near-band sign slots. atFrac = x across the band texture; hostHFrac = host
// building height (band fraction) → controls the rooftop height; film = add a
// film-strip column to that host's face. Positions dodge the card + landmarks.
const SIGN_SLOTS = [
  { id: "play", atFrac: 0.745, hostW: 30, hostHFrac: 0.44, film: true,
    sign: stampSign(15, 11, "#ff3ea5", faceScreen(pxPlay, "#ffd6ec")) }, // Petronas–KL gap
  { id: "camera", atFrac: 0.885, hostW: 26, hostHFrac: 0.38, film: true,
    sign: stampSign(13, 10, "#22d3ee", faceScreen(pxCamera, "#bdf3ff")) }, // right of KL Tower
  { id: "clapper", atFrac: 0.11, hostW: 24, hostHFrac: 0.24,
    sign: stampSign(13, 11, "#c084fc", faceClapper) }, // far left, low
  { id: "miniA", atFrac: 0.04, hostW: 26, hostHFrac: 0.22,
    sign: stampSign(16, 11, "#7dd3fc", faceMini(0)) }, // far lower-left
  { id: "miniB", atFrac: 0.955, hostW: 26, hostHFrac: 0.22,
    sign: stampSign(16, 11, "#ffcf6b", faceMini(1)) }, // far lower-right
];
// mobile: keep only the play billboard (item 6)
const MOBILE_SLOTS = SIGN_SLOTS.filter((s) => s.id === "play");

// --- thin editing timeline (a light rail at the cityline) + its playhead ---
function drawTimelineStrip(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const tH = 4, tY = H - tH; // thin track at the bottom of the texture
  ctx.fillStyle = "#0e0c20";
  ctx.fillRect(0, tY, W, tH);
  ctx.globalAlpha = 0.45; // faint lit top edge
  ctx.fillStyle = "#3fe0ff";
  ctx.fillRect(0, tY, W, 1);
  ctx.globalAlpha = 1;
  // fill the full width with varied clip blocks (occasional small yellow section)
  const cols = ["#22d3ee", "#3b82f6", "#c084fc", "#ff5aa8"];
  const rng = makeRng(20);
  let x = 0, i = 0;
  while (x < W) {
    const yellow = i % 9 === 4;
    const bw = yellow ? 4 + Math.floor(rng() * 4) : 10 + Math.floor(rng() * 22);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = yellow ? "#ffcf6b" : cols[i % cols.length];
    ctx.fillRect(x + 1, tY + 1, Math.min(bw, W - x - 2), tH - 1);
    ctx.globalAlpha = 1;
    x += bw + 2;
    i++;
  }
}
function drawPlayheadDown(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const cx = Math.round(W / 2);
  ctx.fillStyle = "#ffffff";
  for (let r = 0; r < 3; r++) ctx.fillRect(cx - (2 - r), r, (2 - r) * 2 + 1, 1); // ▼ marker
  ctx.fillRect(cx, 3, 1, H - 3); // thin vertical line
}

// timeline: screen height fraction + width fraction (>1 = full-bleed past edges)
const TL_YF = 0.745, TL_WFRAC = 1.3;

// Thin editing-timeline light rail near the cityline + a slow playhead. Anchored
// in world coordinates, riding the near-city parallax. Hidden on small screens.
function EditingTimeline({ scroll }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const bw = Math.round(vw / 40) * 40;
  const mobile = vw < 700;
  const pxW = (vw * OVER) / Math.ceil((bw * OVER) / PX); // 1:1 with city texels

  const reduced = useMemo(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    []
  );

  const railTex = useMemo(() => {
    const w = Math.max(60, Math.round((bw * TL_WFRAC) / PX));
    return makeTex(w, 6, drawTimelineStrip, 1);
  }, [bw]);
  const phTex = useMemo(() => makeTex(5, 9, drawPlayheadDown, 1), []);
  useEffect(() => () => (railTex.dispose(), phTex.dispose()), [railTex, phTex]);

  const tlRef = useRef(null);
  const phRef = useRef(null);
  const railW = railTex.image.width * pxW;
  const railH = railTex.image.height * pxW;
  const cy = vh * 0.5 - TL_YF * vh - railH / 2;
  const phW = phTex.image.width * pxW;
  const phH = phTex.image.height * pxW;

  useFrame((state) => {
    const sy = scroll.current * SHIFT * vh * 1.02; // ride the lower city
    const px = state.pointer.x * vw * 0.01 * 0.9;
    if (tlRef.current) {
      tlRef.current.position.x = px;
      tlRef.current.position.y = cy + sy;
    }
    if (phRef.current) {
      const half = railW * 0.5 - pxW;
      const frac = reduced ? 0.3 : (state.clock.elapsedTime * 0.045) % 1; // ~22s loop
      phRef.current.position.x = -half + frac * half * 2;
    }
  });

  if (mobile) return null; // simplify on phones

  return (
    <group ref={tlRef} position={[0, cy, 0]}>
      <mesh renderOrder={4.5}>
        <planeGeometry args={[railW, railH]} />
        <meshBasicMaterial map={railTex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={phRef} renderOrder={4.55} position={[0, 0, 0.1]}>
        <planeGeometry args={[phW, phH]} />
        <meshBasicMaterial map={phTex} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Scene({ scroll }) {
  const { viewport } = useThree();
  const vw = viewport.width, vh = viewport.height;
  const bw = Math.round(vw / 40) * 40;
  const bh = Math.round(vh / 40) * 40;
  const mobile = vw < 700; // fewer baked signs on phones

  // Landmarks are sized by viewport HEIGHT but positioned by viewport WIDTH.
  // On desktop (wide) that's fine; on a tall/narrow phone the towers stay big
  // yet bunch together and overlap. So ONLY on mobile: shrink them (narrower
  // screens shrink a touch more) and widen their spread. Desktop is untouched.
  const lmScale = mobile
    ? Math.max(0.42, Math.min(0.6, (vw / vh) * 0.95))
    : 1;
  const lmSpread = mobile ? 1.2 : 1;

  const tex = useMemo(() => {
    const artW = Math.ceil((bw * OVER) / PX);
    const cityH = Math.ceil(((CITY_H + CITY_BLEED) * bh) / PX);
    const skyH = Math.ceil((SKY_SPAN * bh) / PX);
    const balH = Math.ceil((BAL_SPAN * bh) / PX);
    const near = { body: "#0e0b22", bodyR: "#070512", edge: "#1c1838", roof: "#3a4270" };
    const mid = { body: "#171334", bodyR: "#0d0a22", edge: "#2a2650", roof: "#3a4270" };
    const far = { body: "#221d46", bodyR: "#181336", edge: "#39457a", roof: "#3a4270" };
    const t = {
      sky: makeTex(artW, skyH, drawSky),
      // shorter buildings (lower max-height fraction = fewer floors, not squashed)
      far: makeTex(artW, cityH, cityDrawer(21, 0.22, 0.58, far, 0.24, 0.24)),
      mid: makeTex(artW, cityH, cityDrawer(88, 0.18, 0.44, mid, 0.5, 0.32)),
      near: makeTex(artW, cityH, cityDrawer(303, 0.14, 0.36, near, 0.42, 0.3, mobile ? MOBILE_SLOTS : SIGN_SLOTS)),
      balcony: makeTex(artW, balH, drawBalcony, 3),
      lm: {},
    };
    LANDMARKS.forEach((L) => {
      const h = Math.ceil((L.hFrac * bh) / PX);
      const w = Math.ceil(h * L.aspect);
      t.lm[L.key] = {
        struct: makeTex(w, h, (c, W, Hh) => L.draw(c, W, Hh, false), 3),
        leds: makeTex(w, h, (c, W, Hh) => L.draw(c, W, Hh, true), 3),
      };
    });
    return t;
  }, [bw, bh, mobile]);

  useEffect(() => () => {
    [tex.sky, tex.far, tex.mid, tex.near, tex.balcony].forEach((t) => t.dispose && t.dispose());
    Object.values(tex.lm).forEach((l) => (l.struct.dispose(), l.leds.dispose()));
  }, [tex]);

  const cityTop = ROOF0 - CITY_H;
  const cityBot = ROOF0 + CITY_BLEED;

  // Dev-only guard: verify the two coverage invariants that keep the scene
  // gap-free as you add UI / retune parallax. Fires once; silent in production.
  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    const warn = (m) => console.warn(`[CityBackground coverage] ${m}`);
    // 1) Balcony must overlap the city band (so no sky gap appears above the deck),
    //    even after the two layers drift apart across a full scroll.
    const balCityOverlap = cityBot - BAL_TOP - SHIFT * (MAX_LIFT - 1.0);
    if (balCityOverlap <= 0)
      warn(`balcony no longer overlaps the city (overlap ${balCityOverlap.toFixed(3)}vh ≤ 0). ` +
        `Lower BAL_TOP or raise CITY_BLEED so BAL_TOP < ROOF0 + CITY_BLEED.`);
    // 2) Sky (the backstop) must still fill the screen top→bottom at the pan extreme.
    if (SKY_SPAN / 2 < 0.5 + SHIFT * 0.15)
      warn(`sky no longer covers the viewport at full scroll — increase SKY_SPAN.`);
  }, []);

  return (
    <>
      <color attach="background" args={[SKY.top]} />
      <Band tex={tex.sky} top0={-(SKY_SPAN - 1) / 2} bot0={1 + (SKY_SPAN - 1) / 2} order={0} lift={0.15} sway={0.3} scroll={scroll} />
      <StarField scroll={scroll} />
      <Moon x={vw * 0.3} y={vh * 0.3} size={vh * 0.2} scroll={scroll} vh={vh} />
      <Band tex={tex.far} top0={cityTop} bot0={cityBot} order={1} lift={0.9} sway={0.5} scroll={scroll} />
      <Band tex={tex.mid} top0={cityTop} bot0={cityBot} order={2} lift={0.97} sway={0.7} scroll={scroll} />
      {LANDMARKS.map((L) => (
        <Landmark
          key={L.key}
          struct={tex.lm[L.key].struct}
          leds={tex.lm[L.key].leds}
          x={vw * L.x * lmSpread}
          w={vh * L.hFrac * L.aspect * lmScale}
          h={vh * L.hFrac * lmScale}
          phase={L.phase}
          scroll={scroll}
        />
      ))}
      <Band tex={tex.near} top0={cityTop} bot0={cityBot} order={4} lift={1.04} sway={0.9} scroll={scroll} />
      <EditingTimeline scroll={scroll} />
      <Band tex={tex.balcony} top0={BAL_TOP} bot0={BAL_TOP + BAL_SPAN} order={5} lift={1.0} sway={1.1} scroll={scroll} />
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
