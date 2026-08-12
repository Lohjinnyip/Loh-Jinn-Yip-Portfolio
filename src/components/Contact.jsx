const EMAIL = "jinnyip011@gmail.com"; // change to your preferred contact email
const PHONE = "+60 18 3688 500";
const PHONE_HREF = "+60183688500";

// Pre-filled draft so the compose window opens ready for them to type.
const MAIL_SUBJECT = "Project enquiry — Loh Jinn Yip";
const MAIL_BODY =
  "Hi Jinn Yip,\n\nI came across your portfolio and would like to talk about a project.\n\n";

const enc = encodeURIComponent;
// Opens Gmail's compose window addressed to me, with the subject/body prepared.
const GMAIL_COMPOSE =
  "https://mail.google.com/mail/?view=cm&fs=1" +
  `&to=${enc(EMAIL)}&su=${enc(MAIL_SUBJECT)}&body=${enc(MAIL_BODY)}`;

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" />
  </svg>
);

export default function Contact() {
  return (
    <section id="contact" className="section contact">
      <div className="container">
        <div className="plate center reveal" style={{ textAlign: "center" }}>
          <p className="eyebrow">Contact</p>
          <h2>
            Let's create something{" "}
            <span className="gradient-text">worth watching.</span>
          </h2>
          <p style={{ marginBottom: 0 }}>
            Have a project, a reel to cut, or a collaboration in mind? I'm one
            message away.
          </p>
        </div>
        <div className="contact-actions reveal">
          {/* Opens Gmail's compose window, ready to type a message to me. */}
          <a
            href={GMAIL_COMPOSE}
            className="btn btn-primary"
            target="_blank"
            rel="noreferrer"
          >
            <MailIcon />
            {EMAIL}
          </a>
          <a href={`tel:${PHONE_HREF}`} className="btn btn-ghost">
            <PhoneIcon />
            {PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}
