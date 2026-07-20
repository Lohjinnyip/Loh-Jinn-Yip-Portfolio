import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
//  CINEMATIC SCROLL BACKGROUND  (MILESTONE 4 — shallow pixel-studio stage)
//
//  City hero (wide FOV drone) → crane back through the window → settle on a
//  SHALLOW, front-facing studio STAGE (narrow FOV, flat, no corridor) that
//  holds steady behind Featured Work → Contact.
//
//  The studio is a shallow cutaway "set": back wall + floor + short side
//  returns, NO front wall, NO ceiling. Depth is only ~6 units so the camera
//  looks at it nearly straight-on like a theatrical stage.
//
//  Axis: camera faces -Z. Studio open front z=0, back wall (city window) z=-6.
//  City lives beyond the window (z<-6). Camera settles far in front (~+24) with
//  a NARROW fov so perspective stays flat.
// ============================================================================

const SKY = { top: "#160f36", mid: "#2a1a55", horizon: "#452a6a", band: "#5f3880" };
const NEON = ["#22d3ee", "#8be9fd", "#f472b6", "#ff5aa8", "#ffcf6b", "#c084fc", "#7dd3fc", "#4dd0e1"];
const BODIES = ["#171334", "#141a38", "#1b1640", "#122045", "#201844"];

const COOL_BG = new THREE.Color("#0a0e24");
const STUDIO_BG = new THREE.Color("#4a2f16"); // warm amber-brown (readable, not black)
const CITY_FOG = new THREE.Color("#141a3e");
const MOON_COL = new THREE.Color("#afc4ff");
const WARM_KEY = new THREE.Color("#ffb257");

const FOV_CITY = 52;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const damp = (cur, tgt, l, dt) => cur + (tgt - cur) * (1 - Math.exp(-l * dt));

function makeRng(seed) {
  let s = seed % 233280;
  return () => ((s = (s * 9301 + 49297) % 233280), s / 233280);
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function tex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
function win(ctx, x, y, w, h, color) {
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.globalAlpha = 1;
  ctx.fillRect(x, y, w, h);
}

// ---- textures ---------------------------------------------------------------
function makeSky() {
  const [c, ctx] = makeCanvas(128, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, SKY.top);
  g.addColorStop(0.5, SKY.mid);
  g.addColorStop(0.8, SKY.horizon);
  g.addColorStop(0.9, SKY.band);
  g.addColorStop(1, SKY.mid);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  const rng = makeRng(9);
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(rng() * 128), y = Math.floor(rng() * 175);
    ctx.fillStyle = `rgba(255,255,255,${(0.3 + rng() * 0.6).toFixed(2)})`;
    const s = rng() > 0.85 ? 2 : 1;
    ctx.fillRect(x, y, s, s);
  }
  return tex(c);
}
// Parametric facade — one of several window LAYOUT styles (grid / vertical
// columns / sparse scatter / lit-floor bands) with randomised spacing, window
// size, density and warm-vs-neon mix, so no two buildings read the same.
function makeFacade(seed) {
  const [c, ctx] = makeCanvas(48, 96);
  const rng = makeRng(seed);
  ctx.fillStyle = pick(rng, BODIES);
  ctx.fillRect(0, 0, 48, 96);
  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.fillRect(40, 0, 8, 96); // side shadow → depth
  ctx.fillStyle = "#241f45";
  ctx.fillRect(0, 0, 48, 2); // top cap

  const style = Math.floor(rng() * 4); // 0 grid · 1 columns · 2 sparse · 3 bands
  const gy = 5 + Math.floor(rng() * 3); // floor spacing 5–7
  const gx = 4 + Math.floor(rng() * 3); // column spacing 4–6
  const ww = rng() < 0.5 ? 2 : 3; // window width
  const wh = 2 + Math.floor(rng() * 2); // window height 2–3
  const dens = 0.24 + rng() * 0.38; // base lit density
  const warm = 0.58 + rng() * 0.32; // warm vs neon share
  const litCol = () => (rng() < warm ? "#ffcf6b" : pick(rng, NEON));
  const dark = (x, y) => {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#1a2044";
    ctx.fillRect(x, y, ww, wh);
    ctx.globalAlpha = 1;
  };

  for (let y = 6; y < 92; y += gy) {
    const bandLit = style === 3 && rng() < 0.5;
    for (let x = 4; x < 38; x += gx) {
      let lit;
      if (style === 0) lit = rng() < dens;
      else if (style === 1) {
        const col = Math.floor((x - 4) / gx);
        lit = rng() < (col % 2 === 0 ? dens + 0.34 : dens - 0.14);
      } else if (style === 2) lit = rng() < dens * 0.5;
      else lit = bandLit ? rng() < 0.75 : rng() < 0.1;
      if (lit) win(ctx, x, y, ww, wh, litCol());
      else dark(x, y);
    }
  }
  return tex(c);
}
function makeGround() {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = "#080a1c";
  ctx.fillRect(0, 0, 256, 256);
  const rng = makeRng(3);
  for (let i = 0; i < 44; i++) {
    ctx.globalAlpha = 0.05 + rng() * 0.06;
    ctx.fillStyle = pick(rng, NEON);
    ctx.fillRect(Math.floor(rng() * 256), 128 + Math.floor(rng() * 128), 2, 20 + rng() * 60);
  }
  ctx.globalAlpha = 1;
  return tex(c);
}
function makeTimeline() {
  const [c, ctx] = makeCanvas(160, 100);
  ctx.fillStyle = "#12141f";
  ctx.fillRect(0, 0, 160, 100);
  ctx.fillStyle = "#1c2030";
  ctx.fillRect(0, 0, 160, 10);
  ctx.fillStyle = "#0b1224";
  ctx.fillRect(6, 14, 70, 34);
  const rng = makeRng(5);
  [[54, ["#38bdf8", "#3b82f6"]], [70, ["#f472b6", "#c084fc"]], [86, ["#ffcf6b", "#f59e0b"]]].forEach(([ty, cols]) => {
    let x = 6;
    while (x < 154) {
      const w = 12 + Math.floor(rng() * 26);
      ctx.fillStyle = cols[Math.floor(rng() * cols.length)];
      ctx.fillRect(x, ty, w - 2, 12);
      x += w;
    }
  });
  return tex(c);
}
function makePreview() {
  const [c, ctx] = makeCanvas(160, 100);
  const g = ctx.createLinearGradient(0, 0, 0, 100);
  g.addColorStop(0, "#0f2150");
  g.addColorStop(1, "#3b2a63");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 160, 100);
  ctx.fillStyle = "#f4efd2";
  ctx.fillRect(128, 20, 5, 5);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  [[30, 24], [80, 16], [56, 44], [110, 40]].forEach(([x, y]) => ctx.fillRect(x, y, 2, 2));
  ctx.fillStyle = "#0c1730";
  [[40, 44, 40], [96, 54, 56]].forEach(([cx, mw, mh]) => {
    ctx.beginPath();
    ctx.moveTo(cx - mw, 100);
    ctx.lineTo(cx, 100 - mh);
    ctx.lineTo(cx + mw, 100);
    ctx.fill();
  });
  ctx.fillStyle = "#152244";
  ctx.fillRect(0, 96, 160, 4);
  return tex(c);
}
function makeAcoustic() {
  const [c, ctx] = makeCanvas(64, 64);
  ctx.fillStyle = "#2c1f12";
  ctx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8)
    for (let x = 0; x < 64; x += 8) {
      ctx.fillStyle = ((x / 8 + y / 8) % 2) ? "#3d2c1a" : "#20160c";
      ctx.fillRect(x + 1, y + 1, 6, 6);
    }
  return tex(c);
}
function makePoster(seed) {
  const [c, ctx] = makeCanvas(64, 96);
  const pals = [
    ["#f5a35a", "#e2657a", "#5b3a6e"],
    ["#0f2150", "#3b82f6", "#160f36"],
    ["#22d3ee", "#3b2a63", "#12081f"],
  ];
  const p = pals[seed % pals.length];
  const g = ctx.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, p[0]);
  g.addColorStop(0.5, p[1]);
  g.addColorStop(1, p[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 96);
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(22, 46, 20, 50);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(8, 82, 48, 4);
  ctx.fillRect(8, 89, 30, 3);
  return tex(c);
}

// ---- SHALLOW room + window --------------------------------------------------
//  Tall + wide back wall so it OVERFILLS the frame (studio covers the whole
//  background behind the lower sections), but still only ~6 units deep.
const ROOM = { w: 26, h: 18, front: 0, back: -6 };
const WIN = { cx: 0, cy: 10, w: 18, h: 9, z: ROOM.back }; // large central window

const _v = new THREE.Vector3();
function samplePath(keys, scroll, outP, outL) {
  let i = 0;
  while (i < keys.length - 2 && scroll > keys[i + 1].t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const u = smooth(k0.t, k1.t, scroll);
  outP.fromArray(k0.p).lerp(_v.fromArray(k1.p), u);
  outL.fromArray(k0.l).lerp(_v.fromArray(k1.l), u);
}

// ---- moon texture — same as the 2.5D city: blocky PIXEL disc + baked soft
//      glow + pixel craters (glow is IN the texture, so no extra glow meshes) --
function makeMoon() {
  const S = 64;
  const [c, ctx] = makeCanvas(S, S);
  ctx.clearRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2, r = S * 0.3;
  // soft glow behind
  const gg = ctx.createRadialGradient(cx, cy, r, cx, cy, S * 0.5);
  gg.addColorStop(0, "rgba(253,251,232,0.5)");
  gg.addColorStop(1, "rgba(253,251,232,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, S, S);
  const inDisc = (x, y, ccx, ccy, rr) => {
    const dx = x + 0.5 - ccx, dy = y + 0.5 - ccy;
    return dx * dx + dy * dy <= rr * rr;
  };
  // hard pixel disc
  ctx.fillStyle = "#fdfbe8";
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inDisc(x, y, cx, cy, r)) ctx.fillRect(x, y, 1, 1);
  // pixel craters
  ctx.fillStyle = "#e4dfc2";
  [[-0.34, -0.18, 0.16], [0.28, 0.12, 0.12], [0.06, -0.4, 0.09], [-0.06, 0.34, 0.1]].forEach(([dx, dy, rr]) => {
    const ccx = cx + dx * r, ccy = cy + dy * r, cr = rr * r;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inDisc(x, y, ccx, ccy, cr)) ctx.fillRect(x, y, 1, 1);
  });
  return tex(c);
}

// hero sky animation: slowly rotates the star disc (curved left→right orbit)
// while the hero city is on screen; parks (stops invalidating) once scrolled
// into the studio so demand-render resumes.
function SkyAnim({ starsRef, scroll, reduced }) {
  const { invalidate } = useThree();
  useFrame((state) => {
    if (reduced || document.hidden || scroll.current > 0.42) return;
    if (starsRef.current) starsRef.current.rotation.z = -state.clock.elapsedTime * 0.02; // orbit L→R
    invalidate();
  });
  return null;
}

// rooftop silhouettes (dark, no windows) — varies the skyline top edge:
// small boxes, water tanks, antennas, stepped setbacks. Reuses the building's
// own dark roof material (b.mats[2]) so nothing glows up top.
function RoofBits({ b }) {
  const r = b.roof;
  if (!r || r.type === "flat") return null;
  const [w, , d] = b.size;
  const cx = b.pos[0], cz = b.pos[2], top = b.pos[1] * 2;
  const m = b.mats[2];
  if (r.type === "box")
    return <mesh position={[cx + r.ox, top + r.bh / 2, cz]} material={m}><boxGeometry args={[w * r.bw, r.bh, d * 0.6]} /></mesh>;
  if (r.type === "twin")
    return (
      <group>
        <mesh position={[cx - w * 0.22, top + 0.9, cz]} material={m}><boxGeometry args={[w * 0.3, 1.8, d * 0.5]} /></mesh>
        <mesh position={[cx + w * 0.2, top + 0.7, cz]} material={m}><boxGeometry args={[w * 0.26, 1.4, d * 0.5]} /></mesh>
      </group>
    );
  if (r.type === "tank")
    return (
      <group position={[cx + r.ox, top, cz]}>
        <mesh position={[0, 0.15, 0]} material={m}><boxGeometry args={[w * 0.34, 0.3, d * 0.4]} /></mesh>
        <mesh position={[0, 1.2, 0]} material={m}><cylinderGeometry args={[w * 0.15, w * 0.15, 2, 8]} /></mesh>
      </group>
    );
  if (r.type === "antenna")
    return (
      <group position={[cx + r.ox, top, cz]}>
        <mesh position={[0, 0.5, 0]} material={m}><boxGeometry args={[w * 0.32, 1, d * 0.4]} /></mesh>
        <mesh position={[0, r.ah / 2 + 1, 0]} material={m}><boxGeometry args={[0.28, r.ah, 0.28]} /></mesh>
      </group>
    );
  if (r.type === "stepped")
    return <mesh position={[cx, top + r.sh / 2, cz]} material={m}><boxGeometry args={[w * 0.62, r.sh, d * 0.62]} /></mesh>;
  return null;
}

// ---- EXTERIOR (city seen through the window) --------------------------------
//  Distant skyline / sky / moon / landmarks. No foreground geometry.
function Exterior({ count, scroll, reduced }) {
  const starsRef = useRef();
  const a = useMemo(() => {
    // many facade variants → far less repetition than the old 6
    const facades = Array.from({ length: 16 }, (_, i) => makeFacade(21 + i * 13));
    const roofsOn = count >= 20; // skip rooftop detail on mobile (perf)
    const rng = makeRng(21);
    // 6-material box: windowed facade on the 4 SIDES, flat dark on TOP+BOTTOM
    // so rooftops never show glowing windows. Order: px,nx,py(top),ny,pz,nz.
    const mkMats = (facade, dim) => {
      const side = new THREE.MeshBasicMaterial({ map: facade, color: new THREE.Color(dim, dim, dim), toneMapped: false });
      const roof = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05 * dim, 0.055 * dim, 0.11 * dim), toneMapped: false });
      return [side, side, roof, roof, side, side];
    };
    const buildings = [];
    // Rows at FIXED depths (no per-building z jitter → no messy clipping).
    // Heights are randomised per building (wide min→max) but capped low so the
    // skyline stays varied without towering. The FIRST row is a continuous
    // edge-to-edge backdrop (gap 0) that plugs every hole so no dark sky shows
    // through; the front rows are x-offset so their gaps land over solid mass.
    const LAYERS = [
      { z: -156, dim: 0.34, hMin: 18, hMax: 30, wMin: 12, wMax: 20, gap: 0, jg: 0, off: 5, sp: 150 },
      { z: -60, dim: 1.0, hMin: 11, hMax: 25, wMin: 6, wMax: 12, gap: 0.7, jg: 1.4, off: 0 },
      { z: -86, dim: 0.72, hMin: 14, hMax: 27, wMin: 7, wMax: 12, gap: 0.7, jg: 1.4, off: 9 },
      { z: -112, dim: 0.52, hMin: 17, hMax: 29, wMin: 8, wMax: 13, gap: 0.6, jg: 1.2, off: 4 },
      { z: -138, dim: 0.42, hMin: 20, hMax: 32, wMin: 9, wMax: 15, gap: 0.4, jg: 1.0, off: 14 },
    ];
    const spread = count < 20 ? 78 : 108;
    LAYERS.forEach((L) => {
      const sp = L.sp || spread;
      let x = -sp + L.off;
      while (x < sp) {
        const w = L.wMin + rng() * (L.wMax - L.wMin);
        const h = L.hMin + rng() * (L.hMax - L.hMin);
        const mats = mkMats(facades[Math.floor(rng() * facades.length)], L.dim);
        // rooftop feature — taller buildings lean antenna/stepped, shorter get
        // boxes/tanks; the far backdrop stays flat and clean.
        let roof = { type: "flat" };
        if (roofsOn && L.z > -150) {
          const rr = rng();
          const tall = h > L.hMax - 4;
          const type = tall
            ? rr < 0.4 ? "antenna" : rr < 0.72 ? "stepped" : "box"
            : rr < 0.34 ? "flat" : rr < 0.54 ? "box" : rr < 0.7 ? "tank" : rr < 0.85 ? "twin" : "stepped";
          roof = { type, ox: (rng() - 0.5) * w * 0.4, bw: 0.28 + rng() * 0.24, bh: 1 + rng() * 1.4, ah: 3 + rng() * 4.5, sh: 1.6 + rng() * 1.8 };
        }
        buildings.push({ pos: [x + w / 2, h / 2, L.z], size: [w, h, w * 0.85], mats, roof });
        x += w + L.gap + rng() * L.jg;
      }
    });
    return { buildings, sky: makeSky(), moon: makeMoon() };
  }, [count]);

  const stars = useMemo(() => {
    // a full DISC of stars centred on the view axis so it can slowly rotate
    // (curved left→right orbit, like the 2.5D sky). Stars sit far behind the
    // near skyline, so buildings occlude the lower half → only the sky shows.
    const rng = makeRng(88);
    const n = 340;
    const R = 160;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = R * Math.sqrt(rng());
      const ang = rng() * Math.PI * 2;
      pos[i * 3] = Math.cos(ang) * r;
      pos[i * 3 + 1] = Math.sin(ang) * r;
      pos[i * 3 + 2] = -115 - rng() * 55;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  return (
    <group>
      <mesh position={[0, 34, -180]}>
        <planeGeometry args={[480, 260]} />
        <meshBasicMaterial map={a.sky} toneMapped={false} depthWrite={false} />
      </mesh>
      <points ref={starsRef} geometry={stars} renderOrder={1}>
        <pointsMaterial size={3.4} sizeAttenuation={false} color="#ffffff" transparent opacity={0.95} depthWrite={false} />
      </points>
      {/* moon — pushed to the very back (just in front of the sky plane, behind
          the stars + whole skyline); scaled up so it still reads upper-RIGHT */}
      {/* 2.5D moon — fog={false} so being at the very back doesn't dim/blue it */}
      <mesh position={[71, 62, -178]} renderOrder={1}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial map={a.moon} transparent fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* skyline dropped on Y so the city sits lower → more open sky.
          Landmarks add +6 back (below) so THEY stay put while buildings drop. */}
      <group position={[0, -24, 0]}>
        {a.buildings.map((b, i) => (
          <group key={i}>
            <mesh position={b.pos} material={b.mats}>
              <boxGeometry args={b.size} />
            </mesh>
            <RoofBits b={b} />
          </group>
        ))}
      </group>
      {/* (KL landmarks removed) */}
      <SkyAnim starsRef={starsRef} scroll={scroll} reduced={reduced} />
      {/* (balcony removed — no foreground platform between hero and studio) */}
    </group>
  );
}

// ---- STUDIO: shallow front-facing stage -------------------------------------
function Studio({ groupRef, softboxRef }) {
  const t = useMemo(
    () => ({ timeline: makeTimeline(), preview: makePreview(), poster1: makePoster(0), poster2: makePoster(1) }),
    []
  );
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8c6338", roughness: 1 }), []); // warm amber (brighter)
  const wallSide = useMemo(() => new THREE.MeshStandardMaterial({ color: "#734d27", roughness: 1 }), []);
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b4a28", roughness: 0.82 }), []);
  const woodDark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a2614", roughness: 0.9 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c1c24", roughness: 0.6 }), []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2a34", metalness: 0.35, roughness: 0.5 }), []);
  // muted mid-dark for the edge framing props (softbox stand + camera) so they
  // read as soft silhouettes, lower contrast, not stark black shapes
  const edge = useMemo(() => new THREE.MeshStandardMaterial({ color: "#332d38", roughness: 0.85 }), []);
  const frame = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5c3e22", roughness: 0.85 }), []);
  const leaf = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f5e3a", roughness: 0.9, side: THREE.DoubleSide }), []);

  const HW = ROOM.w / 2;
  const RET = 4; // side-return depth (short, so no tunnel)
  const retZ = ROOM.back + RET / 2; // -4
  const left = WIN.cx - WIN.w / 2, right = WIN.cx + WIN.w / 2;
  const bot = WIN.cy - WIN.h / 2, top = WIN.cy + WIN.h / 2;

  const Plant = ({ scale = 1 }) => (
    <group scale={scale}>
      <mesh position={[0, 0.6, 0]} material={woodDark}>
        <cylinderGeometry args={[0.7, 0.5, 1.2, 10]} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.5, 2, Math.sin(a) * 0.5]} rotation={[0.5 * Math.cos(a), -a, 0.5 * Math.sin(a)]} material={leaf}>
            <planeGeometry args={[0.9, 2.4]} />
          </mesh>
        );
      })}
    </group>
  );

  return (
    <group ref={groupRef}>
      {/* shallow floor + short side returns (NO front wall, NO ceiling) */}
      <mesh position={[0, 0, retZ]} rotation={[-Math.PI / 2, 0, 0]} material={wood}>
        <planeGeometry args={[ROOM.w, RET + 1.5]} />
      </mesh>
      <mesh position={[-HW, ROOM.h / 2, retZ]} rotation={[0, Math.PI / 2, 0]} material={wallSide}>
        <planeGeometry args={[RET, ROOM.h]} />
      </mesh>
      <mesh position={[HW, ROOM.h / 2, retZ]} rotation={[0, -Math.PI / 2, 0]} material={wallSide}>
        <planeGeometry args={[RET, ROOM.h]} />
      </mesh>

      {/* back wall (faces camera straight on) with the big city window */}
      <group position={[0, 0, ROOM.back]}>
        <mesh position={[(-HW + left) / 2, ROOM.h / 2, 0]} material={wall}>
          <planeGeometry args={[HW + left, ROOM.h]} />
        </mesh>
        <mesh position={[(HW + right) / 2, ROOM.h / 2, 0]} material={wall}>
          <planeGeometry args={[HW - right, ROOM.h]} />
        </mesh>
        <mesh position={[0, (top + ROOM.h) / 2, 0]} material={wall}>
          <planeGeometry args={[WIN.w, ROOM.h - top]} />
        </mesh>
        <mesh position={[0, bot / 2, 0]} material={wall}>
          <planeGeometry args={[WIN.w, bot]} />
        </mesh>
        {/* slim window frame (no tinted glass overlay → clear city view) */}
        <group position={[0, WIN.cy, 0.12]}>
          <mesh position={[0, WIN.h / 2, 0]} material={frame}><boxGeometry args={[WIN.w + 0.5, 0.35, 0.35]} /></mesh>
          <mesh position={[0, -WIN.h / 2, 0]} material={frame}><boxGeometry args={[WIN.w + 0.5, 0.35, 0.35]} /></mesh>
          <mesh position={[-WIN.w / 2, 0, 0]} material={frame}><boxGeometry args={[0.35, WIN.h, 0.35]} /></mesh>
          <mesh position={[WIN.w / 2, 0, 0]} material={frame}><boxGeometry args={[0.35, WIN.h, 0.35]} /></mesh>
        </group>
        {/* (acoustic-foam side panels removed — clean warm side walls) */}
        {/* framed posters on the wall below the window, beside the desk */}
        {[[-8, 2.8, t.poster1], [8, 2.8, t.poster2]].map(([x, y, map], i) => (
          <group key={i} position={[x, y, 0.16]}>
            <mesh material={frame}><planeGeometry args={[2.6, 3.6]} /></mesh>
            <mesh position={[0, 0, 0.03]}><planeGeometry args={[2.2, 3.2]} /><meshBasicMaterial map={map} toneMapped={false} /></mesh>
          </group>
        ))}
      </group>

      {/* small rug */}
      <mesh position={[0, 0.03, -2.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[15, 4.5]} />
        <meshStandardMaterial color="#3a2038" roughness={1} />
      </mesh>

      {/* ===== desk (deeper now, so every accessory sits fully on it) ===== */}
      <mesh position={[0, 3.9, -4.5]} material={wood}><boxGeometry args={[15, 0.3, 2.9]} /></mesh>
      <mesh position={[-6.9, 1.9, -4.5]} material={wood}><boxGeometry args={[0.3, 3.8, 2.4]} /></mesh>
      <mesh position={[6.9, 1.9, -4.5]} material={wood}><boxGeometry args={[0.3, 3.8, 2.4]} /></mesh>

      {/* two monitors on stands whose FEET rest on the desk top (no sinking) */}
      <group position={[0, 6.35, -4.4]}>
        <mesh position={[-2.9, 0, 0]} material={dark}><boxGeometry args={[4.8, 2.8, 0.3]} /></mesh>
        <mesh position={[-2.9, 0, 0.18]}><planeGeometry args={[4.4, 2.5]} /><meshBasicMaterial map={t.timeline} toneMapped={false} /></mesh>
        <mesh position={[2.9, 0, 0]} material={dark}><boxGeometry args={[4.8, 2.8, 0.3]} /></mesh>
        <mesh position={[2.9, 0, 0.18]}><planeGeometry args={[4.4, 2.5]} /><meshBasicMaterial map={t.preview} toneMapped={false} /></mesh>
        <mesh position={[-2.9, -1.85, -0.1]} material={dark}><boxGeometry args={[0.4, 1, 0.4]} /></mesh>
        <mesh position={[2.9, -1.85, -0.1]} material={dark}><boxGeometry args={[0.4, 1, 0.4]} /></mesh>
        <mesh position={[-2.9, -2.32, -0.1]} material={dark}><boxGeometry args={[1.3, 0.16, 0.9]} /></mesh>
        <mesh position={[2.9, -2.32, -0.1]} material={dark}><boxGeometry args={[1.3, 0.16, 0.9]} /></mesh>
      </group>

      {/* warm bias-light bar behind the setup + subtle cool screen-spill on desk */}
      <mesh position={[0, 4.32, -5.0]}><boxGeometry args={[9, 0.16, 0.3]} /><meshBasicMaterial color="#ff9f52" toneMapped={false} /></mesh>
      <mesh position={[0, 4.07, -3.85]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.5, 2.0]} />
        <meshBasicMaterial color="#3f74ab" transparent opacity={0.09} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* desk mat + keyboard + mouse (fully on the desk) */}
      <mesh position={[-0.4, 4.06, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 1.5]} />
        <meshStandardMaterial color="#161620" roughness={1} />
      </mesh>
      <mesh position={[-0.6, 4.13, -3.9]} material={dark}><boxGeometry args={[3.4, 0.15, 1]} /></mesh>
      <mesh position={[2.4, 4.13, -3.9]} material={dark}><boxGeometry args={[0.6, 0.2, 0.9]} /></mesh>

      {/* notebook + pen (tidy, left of the keyboard) */}
      <group position={[-4.7, 4.11, -3.8]} rotation={[0, 0.22, 0]}>
        <mesh material={frame}><boxGeometry args={[1.5, 0.14, 1.9]} /></mesh>
        <mesh position={[0, 0.09, 0.05]}><boxGeometry args={[1.2, 0.02, 1.5]} /><meshStandardMaterial color="#d8cdb4" roughness={1} /></mesh>
        <mesh position={[0.15, 0.13, -0.1]} rotation={[0, 0, 0.5]} material={metal}><cylinderGeometry args={[0.05, 0.05, 1.2, 8]} /></mesh>
      </group>

      {/* studio speakers flanking the monitors (rest on desk, clear of screens) */}
      {[-6.2, 6.2].map((x, i) => (
        <group key={i} position={[x, 5.2, -4.5]} rotation={[0, x > 0 ? 0.25 : -0.25, 0]}>
          <mesh material={woodDark}><boxGeometry args={[1.4, 2.2, 1]} /></mesh>
          <mesh position={[0, 0.3, 0.52]} material={dark}><circleGeometry args={[0.45, 20]} /></mesh>
          <mesh position={[0, -0.6, 0.52]} material={dark}><circleGeometry args={[0.22, 16]} /></mesh>
        </group>
      ))}

      {/* mug (right, seated on the desk top) */}
      <mesh position={[4.2, 4.35, -3.8]}>
        <cylinderGeometry args={[0.28, 0.24, 0.6, 12]} />
        <meshStandardMaterial color="#c85a3c" roughness={0.8} />
      </mesh>

      {/* floor plant (left, between desk and softbox) — decor without desk clutter */}
      <group position={[-9, 0, -3.4]}><Plant scale={0.95} /></group>

      {/* warm practical light grazing the back wall behind the monitors → depth */}
      <pointLight color="#ffb267" intensity={3.4} distance={17} decay={1.6} position={[0, 8, -5.2]} />

      {/* office chair (below centre, back toward camera) */}
      <group position={[0, 0, -1.8]}>
        <mesh position={[0, 2.4, 0]} material={dark}><boxGeometry args={[2.4, 0.5, 2]} /></mesh>
        <mesh position={[0, 3.7, -0.9]} material={dark}><boxGeometry args={[2.4, 2.6, 0.4]} /></mesh>
        <mesh position={[0, 1.4, 0]} material={metal}><cylinderGeometry args={[0.16, 0.16, 2, 10]} /></mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.9, 0.35, Math.sin(a) * 0.9]} rotation={[0, -a, 0]} material={dark}>
              <boxGeometry args={[1.6, 0.2, 0.24]} />
            </mesh>
          );
        })}
      </group>

      {/* LED SOFTBOX on a stand — LEFT edge. Scaled down, pushed outward and
          dimmed so it frames the page instead of drawing the eye. */}
      <group position={[-12.4, 0, -3.2]} scale={0.82}>
        {/* 3-leg tripod base */}
        {[0, 2.09, 4.19].map((ang, i) => (
          <mesh key={i} position={[Math.cos(ang) * 0.75, 0.95, Math.sin(ang) * 0.75]} rotation={[0.3 * Math.sin(ang), -ang, -0.3 * Math.cos(ang)]} material={edge}>
            <cylinderGeometry args={[0.07, 0.05, 2.7, 6]} />
          </mesh>
        ))}
        {/* riser pole */}
        <mesh position={[0, 5.4, 0]} material={metal}><cylinderGeometry args={[0.1, 0.1, 9, 10]} /></mesh>
        {/* tilting softbox head, angled at the desk */}
        <group position={[0, 9.6, 0]} rotation={[0.16, 0.55, 0]}>
          <mesh position={[0, 0, -0.35]} material={edge}><boxGeometry args={[3.2, 3.2, 0.6]} /></mesh>
          <mesh ref={softboxRef} position={[0, 0, 0.02]}><planeGeometry args={[2.7, 2.7]} /><meshBasicMaterial color="#ffe6b0" toneMapped={false} /></mesh>
          {/* thin outer frame + grid cross → reads as a softbox */}
          <mesh position={[0, 1.45, 0.04]} material={edge}><boxGeometry args={[3.0, 0.18, 0.12]} /></mesh>
          <mesh position={[0, -1.45, 0.04]} material={edge}><boxGeometry args={[3.0, 0.18, 0.12]} /></mesh>
          <mesh position={[-1.45, 0, 0.04]} material={edge}><boxGeometry args={[0.18, 3.0, 0.12]} /></mesh>
          <mesh position={[1.45, 0, 0.04]} material={edge}><boxGeometry args={[0.18, 3.0, 0.12]} /></mesh>
          <mesh position={[0, 0, 0.05]} material={edge}><boxGeometry args={[0.09, 2.7, 0.06]} /></mesh>
          <mesh position={[0, 0, 0.05]} material={edge}><boxGeometry args={[2.7, 0.09, 0.06]} /></mesh>
        </group>
      </group>

      {/* CINEMA CAMERA on a tripod — RIGHT edge. Scaled down, pushed outward,
          low-contrast silhouette so it frames without distracting. */}
      <group position={[12.4, 0, -3.2]} scale={0.82}>
        {/* 3-leg tripod */}
        {[0, 2.09, 4.19].map((ang, i) => (
          <mesh key={i} position={[Math.cos(ang) * 0.85, 2.9, Math.sin(ang) * 0.85]} rotation={[0.26 * Math.sin(ang), -ang, -0.26 * Math.cos(ang)]} material={edge}>
            <cylinderGeometry args={[0.09, 0.07, 6, 6]} />
          </mesh>
        ))}
        {/* centre column + fluid head */}
        <mesh position={[0, 5.7, 0]} material={metal}><cylinderGeometry args={[0.12, 0.12, 1.2, 8]} /></mesh>
        <mesh position={[0, 6.3, 0]} material={edge}><boxGeometry args={[0.8, 0.5, 0.8]} /></mesh>
        {/* camera body + lens + handle + flip screen (lens faces the desk) */}
        <group position={[0, 6.8, 0]}>
          <mesh material={edge}><boxGeometry args={[1.7, 1.3, 1.1]} /></mesh>
          <mesh position={[-1.0, -0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={edge}><cylinderGeometry args={[0.34, 0.34, 0.7, 14]} /></mesh>
          <mesh position={[-1.45, -0.05, 0]} rotation={[0, 0, Math.PI / 2]} material={edge}><cylinderGeometry args={[0.44, 0.36, 0.5, 14]} /></mesh>
          <mesh position={[0.1, 0.85, 0]} material={edge}><boxGeometry args={[1.1, 0.14, 0.24]} /></mesh>
          <mesh position={[-0.4, 0.6, 0]} material={edge}><boxGeometry args={[0.14, 0.4, 0.24]} /></mesh>
          <mesh position={[0.6, 0.6, 0]} material={edge}><boxGeometry args={[0.14, 0.4, 0.24]} /></mesh>
          <mesh position={[0.55, 0.05, 0.62]} material={edge}><boxGeometry args={[0.9, 0.6, 0.06]} /></mesh>
          <mesh position={[0.9, 0.35, 0.56]}><circleGeometry args={[0.06, 12]} /><meshBasicMaterial color="#e5484d" toneMapped={false} /></mesh>
        </group>
      </group>
    </group>
  );
}

// ---- RIG --------------------------------------------------------------------
function Rig({ scroll, reduced, moonRef, warmRef, deskRef, softboxRef, planRef, debug, isMobile }) {
  const { camera, scene, invalidate, size } = useThree();
  const posRef = useRef(new THREE.Vector3(0, 7, -18));
  const lookRef = useRef(new THREE.Vector3(0, 4.8, -60));
  const tP = useRef(new THREE.Vector3());
  const tL = useRef(new THREE.Vector3());

  const build = () => {
    const range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const norm = (id) => {
      const el = document.getElementById(id);
      return el ? clamp01(el.offsetTop / range) : null;
    };
    const sections = {
      home: norm("home") ?? 0,
      work: norm("work") ?? 0.22,
      gallery: norm("gallery") ?? 0.55,
      about: norm("about") ?? 0.78,
      contact: norm("contact") ?? 0.92,
    };
    const anchor = clamp(sections.work, 0.14, 0.45);

    // ---- frame the tall back wall so it OVERFILLS the frame (studio covers
    //      the whole background). Narrow FOV → flat, straight-on stage. ----
    const aspect = size.width / size.height;
    const fovStudio = aspect < 1 ? 42 : 32;
    const vFov = (fovStudio * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    // distance so the wall (width ROOM.w) is ~3% wider than the frame → no side gaps
    const ddW = (ROOM.w * 0.97) / 2 / Math.tan(hFov / 2);
    // ...but also close enough that the wall height overfills the frame height
    const ddH = (ROOM.h * 0.97) / 2 / Math.tan(vFov / 2);
    const dd = Math.min(ddW, ddH);
    const camZ = ROOM.back + dd;

    // LEVEL-HORIZON path: every target is a far-forward point (z=FAR) whose Y
    // just tracks the camera Y, so the pitch stays ~level throughout. The
    // camera cranes back+up past the balcony WITHOUT ever aiming down at it,
    // and the flat straight-on wall view falls out naturally at the end.
    const FAR = -60; // far-forward target → distant skyline, level horizon
    const show = { p: [0, 7.2, camZ], l: [0, 6.5, FAR] };
    const drift = { p: [0.5, 7.5, camZ + 0.5], l: [-0.3, 6.2, FAR] };
    // wide establishing shot: pulled back + up, slight look-down over the
    // balcony at the distant skyline (sky above, skyline mid, balcony below)
    const hero = { p: [0, 7, -18], l: [0, 4.8, FAR] };
    const heroEnd = { p: [0, 8, -9], l: [0, 6.0, FAR] };
    const arc = { p: [0, 9, -2], l: [0, 7.6, FAR] };

    const t3 = clamp(anchor - 0.01, 0.12, 0.5);
    const t2 = clamp(anchor - 0.07, 0.06, t3 - 0.02);
    const t1 = clamp(anchor - 0.15, 0.03, t2 - 0.02);

    planRef.current = {
      sections, anchor, fovStudio,
      keys: [
        { t: 0, p: hero.p, l: hero.l },
        { t: t1, p: heroEnd.p, l: heroEnd.l },
        { t: t2, p: arc.p, l: arc.l },
        { t: t3, p: show.p, l: show.l },
        { t: 1, p: drift.p, l: drift.l },
      ],
    };
    invalidate();
  };

  useEffect(() => {
    scene.fog = new THREE.Fog(CITY_FOG.getHex(), 30, 210);
    scene.background = COOL_BG.clone();
    scroll.invalidate = invalidate;
    build();
    const timers = [200, 600, 1500].map((ms) => setTimeout(build, ms));
    const onResize = () => build();
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, invalidate, size.width, size.height]);

  useFrame((_, dt) => {
    if (document.hidden) return;
    const plan = planRef.current;
    if (!plan) return;
    const p = reduced ? plan.anchor + 0.05 : scroll.current;
    samplePath(plan.keys, p, tP.current, tL.current);
    const d = Math.min(dt, 0.05);
    const l = reduced ? 999 : 4.2;
    posRef.current.set(damp(posRef.current.x, tP.current.x, l, d), damp(posRef.current.y, tP.current.y, l, d), damp(posRef.current.z, tP.current.z, l, d));
    lookRef.current.set(damp(lookRef.current.x, tL.current.x, l, d), damp(lookRef.current.y, tL.current.y, l, d), damp(lookRef.current.z, tL.current.z, l, d));
    camera.position.copy(posRef.current);
    camera.lookAt(lookRef.current);

    // narrow the FOV as we settle → flat stage (no corridor)
    const fovFactor = smooth(plan.anchor - 0.13, plan.anchor - 0.01, p);
    const targetFov = FOV_CITY + (plan.fovStudio - FOV_CITY) * fovFactor;
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov = damp(camera.fov, targetFov, l, d);
      camera.updateProjectionMatrix();
    }

    const interior = smooth(plan.anchor - 0.16, plan.anchor - 0.02, p);
    scene.background.copy(COOL_BG).lerp(STUDIO_BG, interior);
    // fog stays COOL always → the city seen through the window reads clear, not
    // hazed orange. Studio warmth comes from walls + lights, not fog tint.
    scene.fog.color.copy(CITY_FOG);
    if (moonRef.current) moonRef.current.intensity = 0.6 + 0.2 * (1 - interior);
    if (warmRef.current) warmRef.current.intensity = 2.0 + interior * 4.4;
    if (deskRef.current) deskRef.current.intensity = 1.0 + smooth(0.55, 0.98, p) * 3.0;
    if (softboxRef.current) softboxRef.current.material.color.setRGB(1, 0.89, 0.68).multiplyScalar(0.32 + interior * 0.3);

    if (debug && debug.current) {
      const zone = p < plan.keys[1].t ? "CITY" : p < plan.keys[3].t ? "TRANSITION" : "STUDIO";
      const s = plan.sections;
      debug.current.textContent =
        `scroll p:    ${p.toFixed(3)}\n` +
        `zone:        ${zone}\n` +
        `fov:         ${camera.fov.toFixed(1)}\n` +
        `anchor(work):${plan.anchor.toFixed(3)}\n` +
        `cam pos:     ${posRef.current.x.toFixed(1)}, ${posRef.current.y.toFixed(1)}, ${posRef.current.z.toFixed(1)}\n` +
        `cam target:  ${lookRef.current.x.toFixed(1)}, ${lookRef.current.y.toFixed(1)}, ${lookRef.current.z.toFixed(1)}\n` +
        `sections →   home ${s.home.toFixed(2)} work ${s.work.toFixed(2)} gallery ${s.gallery.toFixed(2)} about ${s.about.toFixed(2)} contact ${s.contact.toFixed(2)}`;
    }

    const settled =
      posRef.current.distanceToSquared(tP.current) < 1e-4 &&
      lookRef.current.distanceToSquared(tL.current) < 1e-4 &&
      Math.abs(camera.fov - targetFov) < 0.03;
    if (!settled && !reduced) invalidate();
  });

  return null;
}

// ----------------------------------------------------------------------------
export default function CinematicBackground() {
  const scroll = useRef(0);
  const studioRef = useRef();
  const moonRef = useRef();
  const warmRef = useRef();
  const deskRef = useRef();
  const softboxRef = useRef();
  const planRef = useRef(null);
  const debugRef = useRef(null);

  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
  const debugOn = typeof window !== "undefined" && (window.location.search.includes("debug") || window.location.hash.includes("debug"));
  const count = isMobile ? 14 : 34;

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? clamp01(window.scrollY / max) : 0;
        scroll.current = p;
        doc.style.setProperty("--p", p.toFixed(4));
        const a = planRef.current ? planRef.current.anchor : 0.22;
        const pass = Math.min(smooth(a - 0.11, a - 0.06, p), 1 - smooth(a - 0.04, a + 0.01, p));
        doc.style.setProperty("--pass", pass.toFixed(3));
        scroll.invalidate && scroll.invalidate();
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const onVis = () => scroll.invalidate && scroll.invalidate();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div className="bg-scene" aria-hidden="true">
      <Canvas
        frameloop="demand"
        camera={{ fov: FOV_CITY, near: 0.1, far: 600, position: [0, 7, -18] }}
        dpr={isMobile ? 1 : [1, 2]}
        gl={{ antialias: !isMobile, powerPreference: "high-performance" }}
      >
        <Rig
          scroll={scroll}
          reduced={reduced}
          moonRef={moonRef}
          warmRef={warmRef}
          deskRef={deskRef}
          softboxRef={softboxRef}
          planRef={planRef}
          debug={debugOn ? debugRef : null}
          isMobile={isMobile}
        />

        <ambientLight color={"#9a7a54"} intensity={1.55} />
        <directionalLight ref={moonRef} color={MOON_COL} intensity={0.6} position={[12, 24, -30]} />
        {/* front-centre warm wash so the whole tall wall reads warm + even */}
        <pointLight ref={warmRef} color={WARM_KEY} intensity={0.9} position={[0, 13, 6]} distance={110} decay={1.0} />
        <pointLight ref={deskRef} color={"#ffd9a0"} intensity={0.4} position={[0, 8, -2]} distance={30} decay={1.4} />

        <Exterior count={count} scroll={scroll} reduced={reduced} />
        <Studio groupRef={studioRef} softboxRef={softboxRef} />
      </Canvas>

      <div className="vignette" />
      <div className="bg-pass" />
      {debugOn && (
        <pre
          ref={debugRef}
          style={{
            position: "fixed", top: 80, left: 12, zIndex: 60, margin: 0, padding: "10px 12px",
            font: "11px/1.5 ui-monospace, monospace", color: "#7dd3fc",
            background: "rgba(5,8,20,0.82)", border: "1px solid rgba(125,211,248,0.3)",
            borderRadius: 8, pointerEvents: "none", whiteSpace: "pre",
          }}
        />
      )}
    </div>
  );
}
