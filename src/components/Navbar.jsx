import { useState } from "react";
import { useScrollSpy } from "../hooks/useScrollSpy";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { active, scrolled } = useScrollSpy(LINKS.map((l) => l.id));

  return (
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="container">
        <a href="#home" className="brand" onClick={() => setOpen(false)}>
          JINN YIP<span className="dot">.</span>
        </a>

        <nav className={`nav-links${open ? " open" : ""}`}>
          {LINKS.map((l) => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={active === l.id ? "active" : ""}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <button
          className="nav-toggle"
          aria-label="Toggle menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>
    </header>
  );
}
