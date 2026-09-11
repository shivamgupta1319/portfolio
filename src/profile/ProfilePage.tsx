import Nav from "./Nav";
import Hero from "./Hero";
import Featured from "./Featured";
import Projects from "./projects/Projects";
import Experience from "./Experience";
import Skills from "./Skills";
import Contact from "./Contact";
import Footer from "./Footer";
import ProfileBackground from "./ProfileBackground";

/** The recruiter-friendly landing page. Server component with client islands. */
export default function ProfilePage() {
  return (
    <>
      <ProfileBackground />
      <Nav />
      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6">
        <Hero />
        <Featured />
        <Experience />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
