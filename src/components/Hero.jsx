import { useShowreel } from "./ShowreelModal";

export default function Hero() {
  const openShowreel = useShowreel();
  return (
    <section id="home" className="hero">
      <div className="container hero-inner">
        <div className="plate reveal">
          <span className="badge">
            <span className="badge-dot" /> Available for freelance · Kuala Lumpur
          </span>
          <p className="eyebrow">Video Editor · Content Creator</p>
          <h1>
            Stories told <br />
            after <span className="gradient-text">dark.</span>
          </h1>
          <p className="tagline">
            I edit video and craft content for brands. A collection of work from
            the three companies I've created for — trailers, ads, motion and more.
          </p>
          <div className="hero-cta">
            <button type="button" className="btn btn-primary" onClick={openShowreel}>
              Play Showreel
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </button>
            <a href="#work" className="btn btn-ghost">
              View Work
              <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <a href="#contact" className="btn btn-ghost">
              Get in Touch
              <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
          </div>
        </div>

        {/* Profile picture. Drop a photo at public/profile.jpg (portrait, ~4:5)
            and it appears here automatically; until then a placeholder shows. */}
        <div className="hero-portrait reveal">
          <div className="portrait-frame">
            <div className="portrait-fallback">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span>Add your photo<br /><code>public/profile.jpg</code></span>
            </div>
            <img
              src="/profile.jpg"
              alt="Loh Jinn Yip"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <span className="portrait-name">
              Loh Jinn Yip
              <em>Video Editor</em>
            </span>
          </div>
        </div>
      </div>

      <a href="#work" className="scroll-hint" aria-label="Scroll to work">
        <span className="mouse" />
        Scroll
      </a>
    </section>
  );
}
