import { useMemo } from "react";

// ============================================================================
//  FIXED BACKGROUND SCENE  (stays put while the page scrolls over it)
// ============================================================================
//
//  ▶ WANT TO USE YOUR OWN PIXEL ART INSTEAD?
//    1. Put your image in the /public folder, e.g. public/background.png
//    2. Set BG_IMAGE below to "/background.png"
//    That image then becomes the fixed, scroll-following backdrop and the
//    hand-built scene below is skipped.
//
const BG_IMAGE = ""; // e.g. "/background.png"
// ============================================================================

// Neon-ish window colors for the pixel-city vibe.
const WINDOW_COLORS = ["#f9d67a", "#22d3ee", "#f472b6", "#a855f7", "#8be9fd"];

// Deterministic pseudo-random so the city looks the same every render.
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
    const shade = rng();
    const fill = shade > 0.5 ? "#161a3a" : "#10132e";
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
    <div className="bg-scene" aria-hidden="true">
      <div className="sky" />
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="moon" />
      <Stars />

      {/* distant neon city */}
      <svg className="city" viewBox="0 0 1440 500" preserveAspectRatio="xMidYMax slice">
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

      {/* foreground: balcony floor, railing, and the lady smoking */}
      <svg
        className="foreground"
        viewBox="0 0 1440 460"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* balcony floor */}
        <rect x="0" y="360" width="1440" height="100" fill="#05060c" />
        <rect x="0" y="356" width="1440" height="6" fill="#0b0e1e" />

        {/* --- the lady (silhouette, standing at the railing, smoking) --- */}
        <g fill="#04050b">
          {/* dress / body */}
          <path d="M300 360 C296 300 302 250 320 214 C326 202 344 202 350 214 C368 250 374 300 370 360 Z" />
          {/* torso taper */}
          <path d="M322 224 C318 250 318 280 326 320 L344 320 C352 280 352 250 348 224 Z" />
          {/* neck + head */}
          <rect x="329" y="196" width="12" height="16" />
          <circle cx="335" cy="188" r="13" />
          {/* long hair */}
          <path d="M322 182 C316 200 316 236 322 262 L332 262 C328 232 330 202 336 186 Z" />
          {/* raised arm to face (smoking) */}
          <path d="M348 232 C366 224 372 210 360 200 C356 196 349 198 349 204 C349 212 344 220 340 226 Z" />
        </g>
        {/* cigarette ember */}
        <circle cx="352" cy="199" r="2.4" fill="#ff8a3d" className="ember" />

        {/* balcony railing (in front of lower body) */}
        <g fill="#0a0d1c">
          <rect x="0" y="300" width="1440" height="8" />
          <rect x="0" y="352" width="1440" height="8" />
          {Array.from({ length: 60 }, (_, i) => (
            <rect key={i} x={i * 24 + 6} y="300" width="5" height="60" />
          ))}
        </g>
      </svg>

      {/* cigarette smoke rising from the ember */}
      <div className="smoke">
        <span />
        <span />
        <span />
      </div>

      {/* soft vignette to keep text readable */}
      <div className="vignette" />
    </div>
  );
}
