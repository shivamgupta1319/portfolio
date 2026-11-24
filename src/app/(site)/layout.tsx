import Nav from "@/site/Nav";
import Footer from "@/site/Footer";

/** Shared chrome for every site page. /desktop sits outside this group and keeps its own shell. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site flex min-h-dvh flex-col">
      <Nav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
