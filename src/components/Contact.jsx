const EMAIL = "jinnyip011@gmail.com"; // change to your preferred contact email
const PHONE = "+60 18 3688 500";
const PHONE_HREF = "+60183688500";

const SOCIALS = [
  { label: "YouTube", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Vimeo", href: "#" },
  { label: "LinkedIn", href: "#" },
];

export default function Contact() {
  return (
    <section id="contact" className="section contact">
      <div className="container">
        <div className="plate center reveal" style={{ textAlign: "center" }}>
          <p className="eyebrow">Contact</p>
          <h2>
            Let's make something <span className="gradient-text">after dark.</span>
          </h2>
          <p style={{ marginBottom: 0 }}>
            Have a project, a reel to cut, or a collaboration in mind? I'm one
            message away.
          </p>
        </div>
        <div
          className="reveal"
          style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}
        >
          <a href={`mailto:${EMAIL}`} className="btn btn-primary">
            {EMAIL}
          </a>
          <a href={`tel:${PHONE_HREF}`} className="btn btn-ghost">
            {PHONE}
          </a>
        </div>
        <div className="socials reveal">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
