import CinematicBackground from "./components/CinematicBackground";
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

  return (
    <ShowreelProvider>
      <Loader />
      <CinematicBackground />
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
