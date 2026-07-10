// ============================================================================
//  BRAND LOGO MARQUEE  — infinite horizontal scroll of the tools used
// ============================================================================
//  Logos are inline SVGs so nothing is fetched from an external host (the site
//  works fully offline / behind a strict CSP). To swap in an official asset,
//  drop the file in /public/logos/ and replace that entry's `icon` with:
//      icon: <img src="/logos/xxx.svg" alt="" />
// ============================================================================

// Adobe CC apps all share the same rounded-square-with-abbreviation mark; only
// the colours change. This helper reproduces that authentic look.
function AdobeTile({ letters, bg, fg }) {
  return (
    <svg viewBox="0 0 32 32" width="34" height="34" role="img" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="6" fill={bg} />
      <rect
        x="2.75"
        y="2.75"
        width="26.5"
        height="26.5"
        rx="5.25"
        fill="none"
        stroke={fg}
        strokeOpacity="0.4"
        strokeWidth="1.5"
      />
      <text
        x="16"
        y="17"
        fill={fg}
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Segoe UI', Arial, sans-serif"
      >
        {letters}
      </text>
    </svg>
  );
}

// CapCut — white rounded square with the bold black "cut" mark: a left bracket
// (top bar, rounded left side, bottom bar) with two crossing blades whose tips
// protrude past the top-right and bottom-right.
const CapCut = (
  <svg viewBox="0 0 32 32" width="34" height="34" role="img" aria-hidden="true">
    <rect x="2" y="2" width="28" height="28" rx="7.5" fill="#fff" />
    <g
      fill="none"
      stroke="#0c0c0c"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* rounded-rectangle frame, open on the right: long top & bottom bars
         joined by a rounded left side */}
      <path d="M20.5 9.5 L10 9.5 Q7.3 9.5 7.3 12.2 L7.3 19.8 Q7.3 22.5 10 22.5 L20.5 22.5" />
      {/* crossing blades emanating from the left corners, flaring out past the
         bars to the top-right and bottom-right */}
      <path d="M9.5 10 L26 24" />
      <path d="M9.5 22 L26 8" />
    </g>
  </svg>
);

// Anthropic's Claude "sunburst" mark, approximated with radiating spokes.
const Claude = (
  <svg viewBox="0 0 32 32" width="34" height="34" role="img" aria-hidden="true">
    <g fill="#D97757">
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
        <rect
          key={deg}
          x="15"
          y={i % 2 === 0 ? 3 : 5}
          width="2"
          height={i % 2 === 0 ? 11 : 8}
          rx="1"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
    </g>
  </svg>
);

const VSCode = (
  <svg viewBox="0 0 24 24" width="34" height="34" role="img" aria-hidden="true">
    <path
      fill="#0098FF"
      d="M23.15 2.587 18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a1 1 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a1 1 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352Zm-5.146 14.861L10.826 12l7.178-5.448v10.896Z"
    />
  </svg>
);

const LOGOS = [
  { name: "CapCut", icon: CapCut },
  { name: "Premiere Pro", icon: <AdobeTile letters="Pr" bg="#00005B" fg="#9999FF" /> },
  { name: "Photoshop", icon: <AdobeTile letters="Ps" bg="#001E36" fg="#31A8FF" /> },
  { name: "After Effects", icon: <AdobeTile letters="Ae" bg="#00005B" fg="#9999FF" /> },
  { name: "Media Encoder", icon: <AdobeTile letters="Me" bg="#00005B" fg="#9999FF" /> },
  { name: "Claude", icon: Claude },
  { name: "VS Code", icon: VSCode },
];

export default function Marquee() {
  // Render the list twice so the -50% keyframe loops seamlessly.
  const loop = [...LOGOS, ...LOGOS];

  return (
    <section className="section marquee-section" aria-label="Software and tools">
      <div className="container">
        <p className="marquee-eyebrow reveal">Tools of the trade</p>
        <div className="marquee reveal" aria-hidden="true">
          <div className="marquee-track">
            {loop.map((logo, i) => (
              <div className="logo-chip" key={`${logo.name}-${i}`}>
                <span className="logo-mark">{logo.icon}</span>
                <span className="logo-name">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
