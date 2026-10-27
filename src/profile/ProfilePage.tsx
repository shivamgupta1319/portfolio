import { showcase } from "@/data/quests";
import Nav from "./Nav";
import Hero from "./Hero";
import StackMarquee from "./StackMarquee";
import Showcase from "./showcase/Showcase";
import MoreWork from "./more/MoreWork";
import Experience from "./Experience";
import Skills from "./Skills";
import Contact from "./Contact";
import Footer from "./Footer";
import MotionProvider from "./motion/MotionProvider";

/** Showcased products with a public URL, for the hero's "Running in production" board. */
const live = showcase.filter((q) => q.liveUrl);

/** The recruiter-friendly landing page. Server component with client islands. */
export default function ProfilePage() {
  return (
    <div className="profile">
      {/* Without JS, motion's initial (hidden) styles would never animate away. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <MotionProvider>
        <Nav />
        <main id="main">
          <Hero live={live} />
          <StackMarquee />
          <Showcase />
          <MoreWork />
          <Experience />
          <Skills />
          <Contact />
        </main>
        <Footer />
      </MotionProvider>
    </div>
  );
}
