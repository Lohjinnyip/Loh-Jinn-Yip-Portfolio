import CityBackground from "./components/CityBackground";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Work from "./components/Work";
import About from "./components/About";
import Contact from "./components/Contact";
import { useReveal } from "./hooks/useScrollSpy";

function App() {
  useReveal();

  return (
    <>
      <CityBackground />
      <Navbar />
      <main>
        <Hero />
        <Work />
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
