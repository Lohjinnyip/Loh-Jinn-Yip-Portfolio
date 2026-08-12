import { useEffect, useRef, useState } from "react";

// Keep the splash up at least this long so it never "flashes" on fast loads.
const MIN_MS = 900;
// Must match the CSS fade-out transition on `.loader`.
const FADE_MS = 600;
// Hard ceiling: reveal the site even if the 3D scene never signals ready.
const MAX_MS = 9000;

// The bar shows REAL progress driven by actual load milestones (not a timer):
//   fonts ready, page resources completing, window `load`, and finally the 3D
//   scene's first render. Each milestone raises a target the displayed % eases
//   toward; the scene-ready signal owns the last stretch to 100%.
export default function Loader({ sceneReady }) {
  const [leaving, setLeaving] = useState(false); // fade-out started
  const [gone, setGone] = useState(false); // fully removed from the DOM
  const [pct, setPct] = useState(0);

  const targetRef = useRef(6); // where the bar is climbing toward
  const startedRef = useRef(performance.now());
  const revealedRef = useRef(false);

  // lock scrolling while the splash covers the page
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // --- raise the target on real load milestones ---
  useEffect(() => {
    const raise = (v) => {
      targetRef.current = Math.max(targetRef.current, v);
    };
    raise(14); // DOM is parsed enough to run this

    // web fonts finished loading
    if (document.fonts?.ready) document.fonts.ready.then(() => raise(38));

    // count core resources (css/js/img/font) as they complete
    let obs;
    try {
      obs = new PerformanceObserver((list) => {
        raise(Math.min(82, targetRef.current + list.getEntries().length * 4));
      });
      obs.observe({ type: "resource", buffered: true });
    } catch (_) {
      /* PerformanceObserver unsupported → milestones still drive the bar */
    }

    // all render-blocking assets + initial images done
    const onLoad = () => raise(72);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      obs?.disconnect();
      window.removeEventListener("load", onLoad);
    };
  }, []);

  // 3D scene painted → drive the bar home
  useEffect(() => {
    if (sceneReady) targetRef.current = 100;
  }, [sceneReady]);

  // ease the displayed % toward the current target every frame
  useEffect(() => {
    let raf;
    const tick = () => {
      setPct((p) => {
        const t = targetRef.current;
        if (p >= t) return p;
        const next = p + (t - p) * 0.12 + 0.15;
        return next > t ? t : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // reveal once the scene is ready (and the min time has elapsed), or on the
  // hard MAX_MS fallback — whichever comes first.
  useEffect(() => {
    let fadeTimer;
    let removeTimer;
    const reveal = () => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      targetRef.current = 100;
      setLeaving(true);
      document.body.style.overflow = ""; // let the user scroll as it fades
      removeTimer = setTimeout(() => setGone(true), FADE_MS);
    };

    const maxTimer = setTimeout(reveal, MAX_MS);
    if (sceneReady) {
      const wait = Math.max(0, MIN_MS - (performance.now() - startedRef.current));
      fadeTimer = setTimeout(reveal, wait);
    }
    return () => {
      clearTimeout(maxTimer);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [sceneReady]);

  if (gone) return null;

  const shown = Math.min(100, Math.round(pct));
  return (
    <div className={`loader${leaving ? " leaving" : ""}`} role="status" aria-live="polite">
      <div className="loader-inner">
        <div className="loader-brand">
          JINN YIP<span className="dot">.</span>
        </div>
        <div className="loader-bar">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className="loader-sub">Loading… {shown}%</div>
      </div>
    </div>
  );
}
