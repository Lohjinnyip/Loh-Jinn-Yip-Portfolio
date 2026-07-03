const EMAIL = "fitri@craveasia.com"; // change to your preferred contact email

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
        <p className="eyebrow reveal" style={{ textAlign: "center" }}>
          Contact
        </p>
        <h2 className="reveal">
          Let's make something <span className="gradient-text">after dark.</span>
        </h2>
        <p className="reveal">
          Have a project, a reel to cut, or a collaboration in mind? I'm one
          message away.
        </p>
        <div className="reveal" style={{ display: "flex", justifyContent: "center" }}>
          <a href={`mailto:${EMAIL}`} className="btn btn-primary">
            {EMAIL}
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
