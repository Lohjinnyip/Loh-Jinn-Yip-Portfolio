import { useEffect, useRef } from "react";

// ============================================================================
//  CURSOR SPOTLIGHT — a soft warm-amber radial glow that trails the cursor.
//
//  Purely decorative: the native cursor stays visible, the glow ignores pointer
//  events, and the whole effect is disabled for prefers-reduced-motion / touch.
//
//  Performance notes:
//   • ONE div, created once — never per frame.
//   • pointermove is passive and only stores target coordinates.
//   • a single rAF loop lerps position + opacity toward those targets and only
//     writes `transform` / `opacity` (both compositor-friendly, no layout).
//   • the loop parks itself once settled and is woken by the next move, so an
//     idle cursor costs zero frames.
// ============================================================================

const FOLLOW = 0.15; // position lerp factor (higher = snappier)
const FADE = 0.12;   // opacity lerp factor
const IDLE_MS = 150; // after this long without moving, dim slightly
const IDLE_OPACITY = 0.55; // dimmed level while the cursor is still
const EPS = 0.4;     // px threshold to consider movement "settled"

export default function CursorSpotlight() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion and skip devices without a fine hover pointer.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    if (reduce.matches || coarse.matches) return;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let targetOpacity = 0; // fades in on the first movement
    let opacity = 0;
    let raf = 0;
    let idle = 0;
    let alive = true;

    const tick = () => {
      raf = 0;
      x += (tx - x) * FOLLOW;
      y += (ty - y) * FOLLOW;
      opacity += (targetOpacity - opacity) * FADE;
      // translate to the cursor, then back by half our own size → centered glow
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      el.style.opacity = opacity.toFixed(3);
      const moving =
        Math.abs(tx - x) > EPS ||
        Math.abs(ty - y) > EPS ||
        Math.abs(targetOpacity - opacity) > 0.004;
      if (moving && alive) raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!raf && alive && !document.hidden) raf = requestAnimationFrame(tick);
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      targetOpacity = 1; // CSS caps the real alpha at ~0.13
      clearTimeout(idle);
      idle = setTimeout(() => {
        targetOpacity = IDLE_OPACITY; // fade slightly when the mouse stops
        wake();
      }, IDLE_MS);
      wake();
    };
    const onLeave = () => {
      targetOpacity = 0;
      wake();
    };
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else {
        wake();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(idle);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <div ref={ref} className="cursor-spotlight" aria-hidden="true" />;
}
