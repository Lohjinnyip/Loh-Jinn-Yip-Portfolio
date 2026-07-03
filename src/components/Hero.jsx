export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container hero-inner">
        <div className="plate reveal">
          <p className="eyebrow">Video Editor · Content Creator</p>
          <h1>
            Stories told <br />
            after <span className="gradient-text">dark.</span>
          </h1>
          <p className="tagline">
            I edit video and craft content for brands. A collection of work from
            the three companies I've created for — trailers, ads, motion and more.
          </p>
        </div>
        <div className="hero-cta reveal">
          <a href="#work" className="btn btn-primary">
            View Work
          </a>
          <a href="#contact" className="btn btn-ghost">
            Get in Touch
          </a>
        </div>
      </div>

      <a href="#work" className="scroll-hint" aria-label="Scroll to work">
        <span className="mouse" />
        Scroll
      </a>
    </section>
  );
}
