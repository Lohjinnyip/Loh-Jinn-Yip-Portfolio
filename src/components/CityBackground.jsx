import { useEffect, useMemo, useRef } from "react";

// ============================================================================
//  FIXED BACKGROUND SCENE with scroll parallax ("drone descent")
//  - Top of page   : wide shot, balcony sits near the bottom.
//  - Scroll down    : foreground rises toward the middle, faster than the
//                     city/sky behind it -> feels like the camera descends.
//
//  ▶ USE YOUR OWN PIXEL ART:
//    Put an image in /public (e.g. public/background.png) and set BG_IMAGE.
//    It becomes the fixed, scroll-following backdrop instead of this scene.
// ============================================================================
const BG_IMAGE = ""; // e.g. "/background.png"

const WINDOW_COLORS = ["#f9d67a", "#22d3ee", "#f472b6", "#a855f7", "#8be9fd"];

function makeRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildCity() {
  const rng = makeRng(1337);
  const buildings = [];
  let x = -20;
  while (x < 1460) {
    const w = 34 + Math.floor(rng() * 46);
    const h = 90 + Math.floor(rng() * 240);
    const fill = rng() > 0.5 ? "#161a3a" : "#10132e";
    const windows = [];
    const cols = Math.max(1, Math.floor((w - 8) / 12));
    const rows = Math.max(1, Math.floor((h - 12) / 16));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rng() > 0.62) {
          windows.push({
            x: x + 6 + c * 12,
            y: 500 - h + 8 + r * 16,
            color: WINDOW_COLORS[Math.floor(rng() * WINDOW_COLORS.length)],
            lit: rng() > 0.35,
          });
        }
      }
    }
    buildings.push({ x, w, h, fill, windows });
    x += w + 2 + Math.floor(rng() * 8);
  }
  return buildings;
}

function Stars({ count = 70 }) {
  const stars = useMemo(() => {
    const rng = makeRng(99);
    return Array.from({ length: count }, (_, i) => {
      const size = rng() * 2 + 0.6;
      return {
        key: i,
        left: `${rng() * 100}%`,
        top: `${rng() * 55}%`,
        width: `${size}px`,
        height: `${size}px`,
        "--dur": `${2 + rng() * 3}s`,
        animationDelay: `${rng() * 3}s`,
      };
    });
  }, [count]);

  return (
    <div className="starfield">
      {stars.map(({ key, ...style }) => (
        <span key={key} className="star" style={style} />
      ))}
    </div>
  );
}

export default function CityBackground() {
  const city = useMemo(buildCity, []);
  const ref = useRef(null);

  // Drive a 0..1 scroll progress onto the scene as the CSS var `--p`.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const span = window.innerHeight * 0.8; // full descent by the time the pinned hero releases
        const p = Math.min(1, Math.max(0, window.scrollY / span));
        // set on <html> so any element (scene layers, scroll hint) can react
        document.documentElement.style.setProperty("--p", p.toFixed(4));
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
    return (
      <div
        className="bg-scene bg-image"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="bg-scene" ref={ref} aria-hidden="true">
      {/* far layers — drift slowly */}
      <div className="layer sky" />
      <div className="layer cloud cloud-1" />
      <div className="layer cloud cloud-2" />
      <div className="layer moon" />
      <Stars />

      {/* mid layer — neon city, rises at a medium rate */}
      <svg
        className="layer city"
        viewBox="0 0 1440 500"
        preserveAspectRatio="xMidYMax slice"
      >
        {city.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={500 - b.h} width={b.w} height={b.h} fill={b.fill} />
            {b.windows.map((w, j) => (
              <rect
                key={j}
                x={w.x}
                y={w.y}
                width="5"
                height="7"
                fill={w.color}
                opacity={w.lit ? 0.9 : 0.12}
              />
            ))}
          </g>
        ))}
      </svg>

      {/* foreground layer — balcony + lady, rises fastest (closest to camera) */}
      <div className="layer foreground">
        {/* building wall filling everything below the balcony floor */}
        <div className="building" />
        {/* balcony railing */}
        <svg className="railing" viewBox="0 0 1440 70" preserveAspectRatio="none">
          <rect x="0" y="0" width="1440" height="8" fill="#0a0d1c" />
          <rect x="0" y="60" width="1440" height="10" fill="#080b18" />
          {Array.from({ length: 60 }, (_, i) => (
            <rect key={i} x={i * 24 + 6} y="0" width="5" height="66" fill="#0a0d1c" />
          ))}
        </svg>

        {/* the lady, standing at the railing, smoking */}
        <div className="lady">
          <svg viewBox="0 0 90 170" preserveAspectRatio="xMidYMax meet">
            <g fill="#04050b">
              {/* dress / body */}
              <path d="M18 170 C14 108 22 58 40 22 C46 10 62 10 68 22 C86 58 92 108 88 170 Z" />
              {/* neck + head */}
              <rect x="47" y="8" width="12" height="16" />
              <circle cx="53" cy="0" r="13" />
              {/* long hair */}
              <path d="M40 -6 C34 14 34 52 40 82 L50 82 C46 50 48 16 54 -2 Z" />
              {/* raised arm to face (smoking) */}
              <path d="M66 44 C84 36 90 20 78 10 C74 6 67 8 67 14 C67 24 60 34 56 40 Z" />
            </g>
            {/* cigarette ember */}
            <circle cx="70" cy="9" r="2.6" fill="#ff8a3d" className="ember" />
          </svg>
          {/* smoke rising from the ember */}
          <div className="smoke">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* soft vignette keeps text readable */}
      <div className="vignette" />
    </div>
  );
}
