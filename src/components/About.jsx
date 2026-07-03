const SKILLS = [
  "Premiere Pro",
  "After Effects",
  "AI Video",
  "AI Photo",
  "Color Grading",
  "Sound Design",
  "Storyboarding",
  "Short-form / Social",
];

const STATS = [
  { num: "3", lbl: "Companies created for" },
  { num: "100+", lbl: "Videos delivered" },
  { num: "1+", lbl: "Years editing" },
];

const EDUCATION = [
  {
    date: "Sept 2022 – Sept 2025",
    school: "UCSI University",
    detail: "Bachelor of Creative Art (HONS) in 3D Animation Design",
  },
  {
    date: "January 2021 – May 2022",
    school: "UCSI University",
    detail: "Foundation in Arts",
  },
];

const LANGUAGES = ["English", "Bahasa Malaysia", "Mandarin"];

export default function About() {
  return (
    <section id="about" className="section about">
      <div className="container">
        <div className="plate wide reveal">
          <div className="about-grid">
            <div>
              <p className="eyebrow">About</p>
              <h2 className="section-title" style={{ marginBottom: 22 }}>
                Behind the Cut
              </h2>
              <p>
                I'm Loh Jinn Yip — a video editor and content creator. I create
                social media content and ads that hold attention, including AI
                video and AI photo.
              </p>
              <p>
                Across three companies I've owned edits end to end — from
                storyboarding and rough cuts to color and final delivery. This
                site is where that work lives.
              </p>
              <div className="skills">
                {SKILLS.map((s) => (
                  <span key={s} className="skill">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="stats">
              {STATS.map((s) => (
                <div key={s.lbl} className="stat">
                  <div className="num gradient-text">{s.num}</div>
                  <div className="lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="about-detail">
            <div>
              <p className="info-title">Education</p>
              {EDUCATION.map((e) => (
                <div key={e.date} className="edu-item">
                  <p className="edu-date">{e.date}</p>
                  <p className="edu-school">{e.school}</p>
                  <ul className="info-list">
                    <li>{e.detail}</li>
                  </ul>
                </div>
              ))}
            </div>

            <div>
              <p className="info-title">Languages</p>
              <ul className="info-list">
                {LANGUAGES.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>

              <p className="info-title" style={{ marginTop: 34 }}>
                Photos and Videos Editing
              </p>
              <p style={{ marginBottom: 0 }}>
                I am proficient in using Adobe software to edit photos and videos
                for promoting content on the company's social media platforms.
                Additionally, I am able to use CapCut for quick video edits and
                Canva for creating promotional posters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
