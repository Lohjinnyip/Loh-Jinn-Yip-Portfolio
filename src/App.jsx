import { useEffect, useState } from "react";
import CinematicBackground from "./components/CinematicBackground";
import CursorSpotlight from "./components/CursorSpotlight";
import Loader from "./components/Loader";
import ScrollBar from "./components/ScrollBar";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Work from "./components/Work";
import Marquee from "./components/Marquee";
import Gallery from "./components/Gallery";
import About from "./components/About";
import Contact from "./components/Contact";
import { ShowreelProvider } from "./components/ShowreelModal";
import { useReveal } from "./hooks/useScrollSpy";

function App() {
  useReveal();

  // Defer the heavy Three.js scene until after the splash has painted a few
  // frames. Its synchronous WebGL / texture build would otherwise jank the
  // loader animation on the first frames (visible flicker on entry). It mounts
  // behind the opaque loader, so the short delay is never seen.
  const [showBg, setShowBg] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShowBg(true))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <ShowreelProvider>
      <Loader />
      {showBg && <CinematicBackground />}
      <CursorSpotlight />
      <ScrollBar />
      <Navbar />
      {/* Feathered scroll edge — softens content as it slides under the nav */}
      <div className="top-feather" aria-hidden="true" />
      <main>
        <Hero />
        <Work />
        <Marquee />
        <Gallery />
        <About />
        <Contact />
      </main>
      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Loh Jinn Yip · Video Editor & Content Creator
        </div>
      </footer>
    </ShowreelProvider>
  );
}

export default App;
