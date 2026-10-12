import { useEffect, useState } from "react";

// Tracks which section id is currently in view + whether the page has scrolled.
export function useScrollSpy(sectionIds, offset = 90) {
  const [active, setActive] = useState(sectionIds[0]);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);

      // At (or within a hair of) the very bottom the page can't scroll far
      // enough for the last section's top to cross the offset line — so a short
      // final section (Contact + footer < viewport) would never activate.
      // Snap to the last section once we've hit the bottom.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActive(sectionIds[sectionIds.length - 1]);
        return;
      }

      const pos = window.scrollY + offset;
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= pos) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sectionIds, offset]);

  return { active, scrolled };
}

// Adds a `.visible` class to `.reveal` elements as they enter the viewport.
// Triggers once the element's top is 12% above the viewport bottom, NOT on a
// visible-ratio threshold: a ratio can never be reached by a section taller
// than viewport/ratio (e.g. the one-column Work grid on a phone is ~8,000px,
// so 12% of it never fits on screen and it stayed invisible).
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}
