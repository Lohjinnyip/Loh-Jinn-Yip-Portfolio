import { useEffect, useState } from "react";

// Keep the splash up at least this long so it never "flashes" on fast loads.
const MIN_MS = 1100;
// Must match the CSS fade-out transition on `.loader`.
const FADE_MS = 600;

export default function Loader() {
  const [leaving, setLeaving] = useState(false); // fade-out started
  const [gone, setGone] = useState(false); // fully removed from the DOM

  useEffect(() => {
    // lock scrolling while the splash covers the page
    document.body.style.overflow = "hidden";

    const started = performance.now();
    let fadeTimer;
    let removeTimer;

    const finish = () => {
      const wait = Math.max(0, MIN_MS - (performance.now() - started));
      fadeTimer = setTimeout(() => {
        setLeaving(true);
        document.body.style.overflow = ""; // let the user scroll as it fades
        removeTimer = setTimeout(() => setGone(true), FADE_MS);
      }, wait);
    };

    // wait for all assets (images, 3D models, fonts) then honor the min time
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      window.removeEventListener("load", finish);
      document.body.style.overflow = "";
    };
  }, []);

  if (gone) return null;

  return (
    <div className={`loader${leaving ? " leaving" : ""}`} role="status" aria-live="polite">
      <div className="loader-inner">
        <div className="loader-brand">
          JINN YIP<span className="dot">.</span>
        </div>
        <div className="loader-bar">
          <span />
        </div>
        <div className="loader-sub">Loading portfolio…</div>
      </div>
    </div>
  );
}
