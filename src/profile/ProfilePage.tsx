import Nav from "./Nav";
import Hero from "./Hero";
import Footer from "./Footer";
import ProfileBackground from "./ProfileBackground";

/** The recruiter-friendly landing page. Server component; sections stream in below. */
export default function ProfilePage() {
  return (
    <>
      <ProfileBackground />
      <Nav />
      <main id="main" className="mx-auto max-w-6xl px-4 sm:px-6">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
