const SKILLS = [
  "Premiere Pro",
  "After Effects",
  "DaVinci Resolve",
  "Motion Graphics",
  "Color Grading",
  "Sound Design",
  "Storyboarding",
  "Short-form / Social",
];

const STATS = [
  { num: "3", lbl: "Companies created for" },
  { num: "100+", lbl: "Videos delivered" },
  { num: "5+", lbl: "Years editing" },
];

export default function About() {
  return (
    <section id="about" className="section about">
      <div className="container about-grid">
        <div className="reveal">
          <p className="eyebrow">About</p>
          <h2 className="section-title" style={{ marginBottom: 22 }}>
            Behind the Cut
          </h2>
          <p>
            I'm Loh Jinn Yip — a video editor and content creator. I turn raw
            footage into stories that hold attention: brand films, product
            trailers, ads and social series.
          </p>
          <p>
            Across three companies I've owned edits end to end — from
            storyboarding and rough cuts to motion graphics, color and final
            delivery. This site is where that work lives.
          </p>
          <div className="skills">
            {SKILLS.map((s) => (
              <span key={s} className="skill">
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="stats reveal">
          {STATS.map((s) => (
            <div key={s.lbl} className="stat">
              <div className="num gradient-text">{s.num}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
