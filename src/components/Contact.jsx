import { useEffect, useRef, useState } from "react";

const EMAIL = "jinnyip011@gmail.com"; // change to your preferred contact email
const PHONE = "+60 18 3688 500";
const PHONE_HREF = "+60183688500";

// Pre-filled draft details, reused across every mail provider.
const MAIL_SUBJECT = "Project enquiry — Loh Jinn Yip";
const MAIL_BODY =
  "Hi Jinn Yip,\n\nI came across your portfolio and would like to talk about a project.\n\n";

const enc = encodeURIComponent;
const COMPOSE = {
  gmail:
    "https://mail.google.com/mail/?view=cm&fs=1" +
    `&to=${enc(EMAIL)}&su=${enc(MAIL_SUBJECT)}&body=${enc(MAIL_BODY)}`,
  outlook:
    "https://outlook.live.com/mail/0/deeplink/compose" +
    `?to=${enc(EMAIL)}&subject=${enc(MAIL_SUBJECT)}&body=${enc(MAIL_BODY)}`,
  yahoo:
    "https://compose.mail.yahoo.com/" +
    `?to=${enc(EMAIL)}&subject=${enc(MAIL_SUBJECT)}&body=${enc(MAIL_BODY)}`,
  mailto: `mailto:${EMAIL}?subject=${enc(MAIL_SUBJECT)}&body=${enc(MAIL_BODY)}`,
};

const YOUTUBE_URL = "https://www.youtube.com/channel/UCavSz1JhkP8J_3v2-isu_ag";

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
const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 12s0-3.5-.44-5.17a2.78 2.78 0 0 0-1.95-1.96C18.9 4.43 12 4.43 12 4.43s-6.9 0-8.61.44A2.78 2.78 0 0 0 1.44 6.83 29 29 0 0 0 1 12a29 29 0 0 0 .44 5.17 2.78 2.78 0 0 0 1.95 1.96c1.71.44 8.61.44 8.61.44s6.9 0 8.61-.44a2.78 2.78 0 0 0 1.95-1.96C23 15.5 23 12 23 12zM9.75 15.02V8.98L15.5 12z" />
  </svg>
);

function EmailMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openMail = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="email-menu" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MailIcon />
        {EMAIL}
      </button>

      {open && (
        <div className="email-pop" role="menu">
          <p className="email-pop-title">Email me via…</p>
          <button role="menuitem" onClick={() => openMail(COMPOSE.gmail)}>
            Gmail
          </button>
          <button role="menuitem" onClick={() => openMail(COMPOSE.outlook)}>
            Outlook
          </button>
          <button role="menuitem" onClick={() => openMail(COMPOSE.yahoo)}>
            Yahoo Mail
          </button>
          <button role="menuitem" onClick={() => openMail(COMPOSE.mailto)}>
            Default mail app
          </button>
          <div className="email-pop-sep" />
          <button role="menuitem" onClick={copyEmail}>
            {copied ? "Copied ✓" : "Copy address"}
          </button>
        </div>
      )}
    </div>
  );
}

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
        <div className="contact-actions reveal">
          <EmailMenu />
          <a href={`tel:${PHONE_HREF}`} className="btn btn-ghost">
            <PhoneIcon />
            {PHONE}
          </a>
          <a href={YOUTUBE_URL} className="btn btn-ghost" target="_blank" rel="noreferrer">
            <YouTubeIcon />
            YouTube
          </a>
        </div>
      </div>
    </section>
  );
}
