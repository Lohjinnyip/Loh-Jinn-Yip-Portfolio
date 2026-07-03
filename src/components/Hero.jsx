export default function Hero() {
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
            <a href="#work" className="btn btn-primary">
              View Work
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
            <a href="#contact" className="btn btn-ghost">
              Get in Touch
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </a>
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
