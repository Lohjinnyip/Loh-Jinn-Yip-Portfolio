import { useEffect, useMemo, useRef } from "react";

// ============================================================================
//  FIXED BACKGROUND SCENE — Kuala Lumpur skyline, 3D-shaded, scroll parallax.
//  Landmarks: Petronas Twin Towers, Merdeka 118, KL Tower (Menara KL).
//
//  ▶ USE YOUR OWN PIXEL ART: put an image in /public and set BG_IMAGE.
// ============================================================================
const BG_IMAGE = ""; // e.g. "/background.png"

const WINDOW_COLORS = ["#f9d67a", "#ffcf6b", "#22d3ee", "#8be9fd", "#f472b6", "#c084fc", "#7dd3fc"];

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// depth palettes: distant = lighter/hazier, near = darker
const FAR = { front: "#242a56", side: "#1a2046", top: "#2c3468", dim: 0.5 };
const NEAR = { front: "#12162f", side: "#0a0d1f", top: "#1a1f40", dim: 0.85 };
const MARK = { front: "#171d3e", side: "#0d1228", top: "#232a52" };

// generate a row of extruded-box buildings across the width
function genLayer(seed, cfg) {
  const rng = makeRng(seed);
  const { groundY, minH, maxH, minW, maxW, depth, gap, colors } = cfg;
  const list = [];
  let x = -50;
  while (x < 1490) {
    const w = minW + Math.round(rng() * (maxW - minW));
    const h = minH + Math.round(rng() * (maxH - minH));
    const y = groundY - h;
    const wins = [];
    const cols = Math.max(1, Math.floor((w - 8) / 11));
    const rows = Math.max(1, Math.floor((h - 10) / 15));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() < 0.55) {
          wins.push({
            x: x + 6 + c * 11,
            y: y + 8 + r * 15,
            c: WINDOW_COLORS[Math.floor(rng() * WINDOW_COLORS.length)],
            lit: rng() > 0.42,
          });
        }
      }
    }
    list.push({ x, y, w, h, d: depth, colors, wins });
    x += w + gap + Math.round(rng() * gap);
  }
  return list;
}

// one extruded box building (roof + right side + front = 3D)
function Building({ x, y, w, h, d, colors, wins }) {
  const dx = d, dy = d * 0.55;
  const top = `${x},${y} ${x + w},${y} ${x + w + dx},${y - dy} ${x + dx},${y - dy}`;
  const side = `${x + w},${y} ${x + w + dx},${y - dy} ${x + w + dx},${y - dy + h} ${x + w},${y + h}`;
  return (
    <g>
      <polygon points={top} fill={colors.top} />
      <polygon points={side} fill={colors.side} />
      <rect x={x} y={y} width={w} height={h} fill={colors.front} />
      {wins.map((wn, i) => (
        <rect key={i} x={wn.x} y={wn.y} width="5" height="8" fill={wn.c} opacity={wn.lit ? colors.dim : 0.12} />
      ))}
    </g>
  );
}

// ---- LANDMARKS --------------------------------------------------------------

function PetronasTower({ cx, groundY }) {
  const d = 9, dy = 5;
  const bodyTop = groundY - 300;
  const t2 = groundY - 370;
  const t3 = groundY - 414;
  const coneTop = groundY - 450;
  const spireTop = groundY - 540;
  const rng = makeRng(Math.round(cx) * 13 + 7);
  const wins = [];
  for (let r = 0; r < 18; r++) {
    const yy = groundY - 16 - r * 15;
    if (yy < bodyTop) break;
    for (let c = -2; c <= 2; c++) {
      if (rng() < 0.55) wins.push({ x: cx + c * 11 - 2, y: yy, lit: rng() > 0.4 });
    }
  }
  return (
    <g>
      {/* depth side of main body */}
      <polygon points={`${cx + 30},${groundY} ${cx + 30 + d},${groundY - dy} ${cx + 30 + d},${bodyTop - dy} ${cx + 30},${bodyTop}`} fill={MARK.side} />
      {/* stacked tiers */}
      <rect x={cx - 30} y={bodyTop} width="60" height={groundY - bodyTop} fill={MARK.front} />
      <rect x={cx - 24} y={t2} width="48" height={bodyTop - t2} fill={MARK.front} />
      <rect x={cx - 17} y={t3} width="34" height={t2 - t3} fill={MARK.front} />
      {/* cone + pinnacle */}
      <polygon points={`${cx - 17},${t3} ${cx + 17},${t3} ${cx + 4},${coneTop} ${cx - 4},${coneTop}`} fill={MARK.top} />
      <rect x={cx - 1.5} y={spireTop} width="3" height={coneTop - spireTop} fill="#3a4270" />
      <circle cx={cx} cy={spireTop} r="2.5" fill="#ffd27a" className="ember" />
      {/* setback light rings */}
      <rect x={cx - 30} y={bodyTop - 3} width="60" height="3" fill="#8be9fd" opacity="0.5" />
      <rect x={cx - 24} y={t2 - 3} width="48" height="3" fill="#8be9fd" opacity="0.5" />
      {wins.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="4" height="9" fill="#bfe9ff" opacity={w.lit ? 0.85 : 0.15} />
      ))}
    </g>
  );
}

function Petronas({ cx, groundY }) {
  const gap = 78;
  const l = cx - gap / 2;
  const r = cx + gap / 2;
  const by = groundY - 200; // bridge height
  return (
    <g>
      <PetronasTower cx={l} groundY={groundY} />
      <PetronasTower cx={r} groundY={groundY} />
      {/* skybridge: two decks + angled support legs */}
      <rect x={l + 17} y={by} width={r - l - 34} height="5" fill="#39406e" />
      <rect x={l + 17} y={by + 12} width={r - l - 34} height="5" fill="#39406e" />
      <line x1={cx} y1={by + 17} x2={l + 20} y2={by + 70} stroke="#2c3260" strokeWidth="3" />
      <line x1={cx} y1={by + 17} x2={r - 20} y2={by + 70} stroke="#2c3260" strokeWidth="3" />
    </g>
  );
}

function Merdeka({ cx, groundY }) {
  const d = 10, dy = 6;
  const wb = 66, wt = 22;
  const shaftTop = groundY - 560;
  const spireTop = groundY - 700;
  const crownStart = groundY - 470;
  const rng = makeRng(455);
  const wins = [];
  for (let r = 0; r < 34; r++) {
    const yy = groundY - 18 - r * 16;
    const frac = (groundY - yy) / 560;
    const halfW = (wb - (wb - wt) * frac) / 2 - 6;
    for (let c = -3; c <= 3; c++) {
      const wx = cx + c * (halfW / 3);
      if (Math.abs(wx - cx) <= halfW && rng() < 0.5) wins.push({ x: wx - 2, y: yy, lit: rng() > 0.4 });
    }
  }
  return (
    <g>
      <polygon points={`${cx + wb / 2},${groundY} ${cx + wb / 2 + d},${groundY - dy} ${cx + wt / 2 + d},${shaftTop - dy} ${cx + wt / 2},${shaftTop}`} fill={MARK.side} />
      <polygon points={`${cx - wb / 2},${groundY} ${cx + wb / 2},${groundY} ${cx + wt / 2},${shaftTop} ${cx - wt / 2},${shaftTop}`} fill={MARK.front} />
      {[0, 1, 2, 3, 4].map((i) => {
        const yy = crownStart - i * 20;
        const frac = (groundY - yy) / 560;
        const halfW = (wb - (wb - wt) * frac) / 2;
        return <polyline key={i} points={`${cx - halfW},${yy} ${cx},${yy - 12} ${cx + halfW},${yy}`} fill="none" stroke="#3b4472" strokeWidth="1.5" opacity="0.8" />;
      })}
      <polygon points={`${cx - wt / 2},${shaftTop} ${cx + wt / 2},${shaftTop} ${cx + 2},${spireTop} ${cx - 2},${spireTop}`} fill={MARK.top} />
      <rect x={cx - 1} y={spireTop - 40} width="2" height="40" fill="#3a4270" />
      <circle cx={cx} cy={spireTop - 40} r="2.5" fill="#ff6b6b" className="ember" />
      {wins.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="4" height="8" fill="#cfe9ff" opacity={w.lit ? 0.8 : 0.14} />
      ))}
    </g>
  );
}

function KLTower({ cx, groundY }) {
  const d = 7, dy = 4;
  const sw = 18;
  const podY = groundY - 360;
  const antTop = groundY - 470;
  return (
    <g>
      <polygon points={`${cx + sw / 2},${groundY} ${cx + sw / 2 + d},${groundY - dy} ${cx + sw / 2 - 2 + d},${podY - dy} ${cx + sw / 2 - 2},${podY}`} fill={MARK.side} />
      <polygon points={`${cx - sw / 2},${groundY} ${cx + sw / 2},${groundY} ${cx + sw / 2 - 2},${podY} ${cx - sw / 2 + 2},${podY}`} fill={MARK.front} />
      <rect x={cx - 14} y={podY - 4} width="28" height="6" rx="3" fill={MARK.top} />
      <ellipse cx={cx} cy={podY - 20} rx="20" ry="16" fill={MARK.front} />
      <path d={`M ${cx - 20} ${podY - 22} Q ${cx} ${podY - 54} ${cx + 20} ${podY - 22} Z`} fill={MARK.top} />
      <rect x={cx - 15} y={podY - 22} width="30" height="3" fill="#ffd27a" opacity="0.8" />
      <rect x={cx - 12} y={podY - 14} width="24" height="3" fill="#8be9fd" opacity="0.7" />
      <rect x={cx - 1.5} y={antTop} width="3" height={podY - 36 - antTop} fill="#3a4270" />
      <circle cx={cx} cy={antTop} r="2.5" fill="#ff6b6b" className="ember" />
    </g>
  );
}

function Stars({ count = 70 }) {
  const stars = useMemo(() => {
    const rng = makeRng(99);
    return Array.from({ length: count }, (_, i) => {
      const size = rng() * 2 + 0.6;
      return {
        key: i, left: `${rng() * 100}%`, top: `${rng() * 55}%`,
        width: `${size}px`, height: `${size}px`,
        "--dur": `${2 + rng() * 3}s`, animationDelay: `${rng() * 3}s`,
      };
    });
  }, [count]);
  return (
    <div className="starfield">
      {stars.map(({ key, ...style }) => <span key={key} className="star" style={style} />)}
    </div>
  );
}

export default function CityBackground() {
  const GROUND = 820;
  const scene = useMemo(() => ({
    far: genLayer(21, { groundY: GROUND, minH: 120, maxH: 300, minW: 34, maxW: 60, depth: 7, gap: 8, colors: FAR }),
    near: genLayer(88, { groundY: GROUND, minH: 150, maxH: 340, minW: 48, maxW: 92, depth: 16, gap: 14, colors: NEAR }),
  }), []);

  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
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

  if (BG_IMAGE) {
    return <div className="bg-scene bg-image" style={{ backgroundImage: `url(${BG_IMAGE})` }} aria-hidden="true" />;
  }

  return (
    <div className="bg-scene" ref={ref} aria-hidden="true">
      <div className="layer sky" />
      <div className="layer cloud cloud-1" />
      <div className="layer cloud cloud-2" />
      <div className="layer moon" />
      <Stars />

      {/* Kuala Lumpur skyline */}
      <svg className="layer city" viewBox={`0 0 1440 ${GROUND}`} preserveAspectRatio="xMidYMax slice">
        <g opacity="0.9">
          {scene.far.map((b, i) => <Building key={`f${i}`} {...b} />)}
        </g>
        <KLTower cx={1120} groundY={GROUND} />
        <Merdeka cx={600} groundY={GROUND} />
        <Petronas cx={870} groundY={GROUND} />
        {scene.near.map((b, i) => <Building key={`n${i}`} {...b} />)}
      </svg>

      {/* foreground: 3D balcony + lady */}
      <div className="layer foreground">
        <div className="building" />
        {/* 3D balcony railing */}
        <svg className="ledge" viewBox="0 0 1440 44" preserveAspectRatio="none">
          {Array.from({ length: 72 }, (_, i) => {
            const x = i * 20 + 5;
            return (
              <g key={i}>
                <rect x={x} y="10" width="7" height="34" fill="#0d1224" />
                <rect x={x} y="10" width="2.5" height="34" fill="#232a52" />
              </g>
            );
          })}
          <rect x="0" y="36" width="1440" height="8" fill="#0a0d1c" />
          {/* top rail with a lit cap edge (depth) */}
          <polygon points="0,4 1440,4 1440,1 0,1" fill="#2a3157" />
          <rect x="0" y="4" width="1440" height="8" fill="#0d1224" />
          <rect x="0" y="4" width="1440" height="2" fill="#252c52" />
        </svg>

        {/* the lady, standing at the railing, smoking */}
        <div className="lady">
          <svg viewBox="0 0 90 170" preserveAspectRatio="xMidYMax meet">
            <g fill="#04050b">
              <path d="M18 170 C14 108 22 58 40 22 C46 10 62 10 68 22 C86 58 92 108 88 170 Z" />
              <rect x="47" y="8" width="12" height="16" />
              <circle cx="53" cy="0" r="13" />
              <path d="M40 -6 C34 14 34 52 40 82 L50 82 C46 50 48 16 54 -2 Z" />
              <path d="M66 44 C84 36 90 20 78 10 C74 6 67 8 67 14 C67 24 60 34 56 40 Z" />
            </g>
            {/* rim light on the dress for depth */}
            <path d="M18 170 C15 112 22 60 39 24 L44 27 C29 62 22 112 25 170 Z" fill="#171a33" opacity="0.7" />
            <circle cx="70" cy="9" r="2.6" fill="#ff8a3d" className="ember" />
          </svg>
          <div className="smoke"><span /><span /><span /></div>
        </div>
      </div>

      <div className="vignette" />
    </div>
  );
}
