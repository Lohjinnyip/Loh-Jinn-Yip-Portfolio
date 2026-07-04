import CityBackground from "./components/CityBackground";
import Loader from "./components/Loader";
import ScrollBar from "./components/ScrollBar";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Work from "./components/Work";
import Gallery from "./components/Gallery";
import About from "./components/About";
import Contact from "./components/Contact";
import { useReveal } from "./hooks/useScrollSpy";

function App() {
  useReveal();

  return (
    <>
      <Loader />
      <CityBackground />
      <ScrollBar />
      <Navbar />
      {/* Feathered scroll edge — softens content as it slides under the nav */}
      <div className="top-feather" aria-hidden="true" />
      <main>
        <Hero />
        <Work />
        <Gallery />
        <About />
        <Contact />
      </main>
      <footer className="footer">
        <div className="container">
          © {new Date().getFullYear()} Loh Jinn Yip · Video Editor & Content Creator
        </div>
      </footer>
    </>
  );
}

export default App;
