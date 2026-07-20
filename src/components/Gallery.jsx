import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GALLERY } from "../data/gallery";

// how many tiles to show before the "show more" arrow appears
const INITIAL = 6;

export default function Gallery() {
  const [openIndex, setOpenIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const hasOpen = openIndex !== null;
  const openImage = hasOpen ? GALLERY[openIndex] : null;
  const hasMore = GALLERY.length > INITIAL;
  const shown = expanded ? GALLERY : GALLERY.slice(0, INITIAL);

  const close = () => setOpenIndex(null);
  const prev = () => setOpenIndex((i) => (i > 0 ? i - 1 : GALLERY.length - 1));
  const next = () => setOpenIndex((i) => (i < GALLERY.length - 1 ? i + 1 : 0));

  useEffect(() => {
    if (!hasOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [hasOpen]);

  return (
    <section id="gallery" className="section gallery">
      <div className="container">
        <div className="plate wide reveal">
          <div className="work-head">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2 className="section-title">Gallery</h2>
            </div>
          </div>

          <div className="gallery-grid">
            {shown.map((img, i) => (
              <button
                key={img.id}
                className={`gallery-item${img.span ? " " + img.span : ""}`}
                onClick={() => setOpenIndex(i)}
                aria-label={`View ${img.alt || "image"}`}
              >
                <img
                  src={img.src}
                  alt={img.alt || ""}
                  loading="lazy"
                  style={img.position ? { objectPosition: img.position } : undefined}
                />
                {img.alt && <span className="gallery-caption">{img.alt}</span>}
              </button>
            ))}
            {GALLERY.length === 0 && (
              <p className="empty">No pictures added yet.</p>
            )}
          </div>

          {hasMore && (
            <button
              className={`gallery-more${expanded ? " open" : ""}`}
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              <span>{expanded ? "Show less" : `Show all ${GALLERY.length}`}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {openImage && createPortal(
        <div className="lightbox-backdrop" onClick={close}>
          <button className="modal-close" onClick={close} aria-label="Close">
            ✕
          </button>
          <button
            className="lightbox-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous image"
          >
            ‹
          </button>
          <figure className="lightbox" onClick={(e) => e.stopPropagation()}>
            <img src={openImage.src} alt={openImage.alt || ""} />
            {openImage.alt && <figcaption>{openImage.alt}</figcaption>}
          </figure>
          <button
            className="lightbox-nav next"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next image"
          >
            ›
          </button>
        </div>,
        document.body
      )}
    </section>
  );
}
