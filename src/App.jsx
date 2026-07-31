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

  // Don't mount the heavy Three.js scene while the splash is animating — its
  // one-time WebGL context + texture build competes with the loader for the
  // main thread AND the GPU/compositor, which is what caused the jitter. We
  // wait until the loader begins leaving (its animated phase is done), then
  // build the scene; it fades in behind the loader as the loader fades out.
  const [showBg, setShowBg] = useState(false);

  // Safety net: if `window.load` never fires (so the loader never signals),
  // still bring the background up after a moment.
  useEffect(() => {
    if (showBg) return;
    const t = setTimeout(() => setShowBg(true), 4000);
    return () => clearTimeout(t);
  }, [showBg]);

  return (
    <ShowreelProvider>
      <Loader onBeginLeave={() => setShowBg(true)} />
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
