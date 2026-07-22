import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";

// Self-hosted showreel. File lives at
// public/videos/Loh Jinn Yip Showreal Crave Asia.mp4
// (spaces URL-encoded so the browser can fetch it directly).
const SHOWREEL_SRC = "/videos/Loh%20Jinn%20Yip%20Showreal%20Crave%20Asia.mp4";

// ---- shared opener so the Hero button AND the Work card open the same modal --
const ShowreelContext = createContext(() => {});
export const useShowreel = () => useContext(ShowreelContext);

export function ShowreelProvider({ children }) {
  const [open, setOpen] = useState(false);
  const openShowreel = useCallback(() => setOpen(true), []);
  return (
    <ShowreelContext.Provider value={openShowreel}>
      {children}
      {open && <ShowreelModal onClose={() => setOpen(false)} />}
    </ShowreelContext.Provider>
  );
}

// Centered, responsive video modal. ESC / close button / click-outside close it.
// Autoplays MUTED so it starts instantly on every browser (muted autoplay is
// always allowed) without blasting sound — the viewer unmutes via the controls.
function ShowreelModal({ onClose }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.classList.add("modal-open"); // hides the top bar while open
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-stage">
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose} aria-label="Close showreel">
            ✕
          </button>

          <div className="modal-video">
            {failed ? (
              <div className="modal-novideo">
                Showreel coming soon — add your file at
                <br />
                <code>public/videos/Loh Jinn Yip Showreal Crave Asia.mp4</code>
              </div>
            ) : (
              <video
                src={SHOWREEL_SRC}
                controls
                autoPlay
                muted
                playsInline
                controlsList="nodownload noremoteplayback"
                onContextMenu={(e) => e.preventDefault()}
                onError={() => setFailed(true)}
              />
            )}
          </div>

          <div className="modal-body">
            <h3>2026 Creative Showreel</h3>
            <div className="meta">Video Editing · Content Creation · AI Visuals</div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
