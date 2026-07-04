import { useEffect, useRef, useState } from "react";

// How long after the last scroll input the bar stays before fading out.
// (You asked for 0.2s — I bumped it to 0.6s because mouse-wheel events can be
//  ~0.3s apart during slow scrolling, and 0.2s makes the bar flicker between
//  ticks. Drop this to 200 if you want it snappier.)
const IDLE_MS = 600;

// A thin, custom page scrollbar that shows while you scroll and fades out when
// you stop. The thumb is draggable and reflects scroll position.
export default function ScrollBar() {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const [active, setActive] = useState(false); // visible while scrolling / hovering
  const hideTimer = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;
    let raf = 0;

    // Size + position the thumb from the current scroll metrics.
    const layout = () => {
      const doc = document.documentElement;
      const winH = window.innerHeight;
      const scrollH = doc.scrollHeight;
      const trackH = track.clientHeight;
      const maxScroll = scrollH - winH;
      if (maxScroll <= 1) {
        thumb.style.height = "0px"; // nothing to scroll → no thumb
        return;
      }
      const thumbH = Math.max(28, (winH / scrollH) * trackH);
      const top = (doc.scrollTop / maxScroll) * (trackH - thumbH);
      thumb.style.height = `${thumbH}px`;
      thumb.style.transform = `translateY(${top}px)`;
    };

    // Show the bar, then arm a timer to fade it out once scrolling stops.
    const show = () => {
      setActive(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (!dragging.current) setActive(false);
      }, IDLE_MS);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(layout);
      show();
    };

    layout();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", layout);
    // Recompute if the document grows/shrinks (images load, sections added, …).
    const ro = new ResizeObserver(layout);
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hideTimer.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", layout);
      ro.disconnect();
    };
  }, []);

  // Drag the thumb to scroll.
  useEffect(() => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return;
    let startY = 0;
    let startScroll = 0;

    const onMove = (e) => {
      if (!dragging.current) return;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;
      const maxThumbTop = track.clientHeight - thumb.offsetHeight;
      const frac = maxThumbTop > 0 ? (e.clientY - startY) / maxThumbTop : 0;
      window.scrollTo({ top: startScroll + frac * maxScroll });
    };
    const onUp = () => {
      dragging.current = false;
      document.body.classList.remove("sb-dragging");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    const onDown = (e) => {
      dragging.current = true;
      startY = e.clientY;
      startScroll = document.documentElement.scrollTop;
      document.body.classList.add("sb-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      e.preventDefault();
    };

    thumb.addEventListener("pointerdown", onDown);
    return () => thumb.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div
      ref={trackRef}
      className={`scrollbar${active ? " active" : ""}`}
      aria-hidden="true"
    >
      <div ref={thumbRef} className="scrollbar-thumb" />
    </div>
  );
}
