import Link from "next/link";
import { profile } from "@/data/profile";

export default function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-sm text-fg-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {profile.name}. Built with Next.js and Motion.
        </p>
        <Link href="/desktop" prefetch={false} className="inline-flex min-h-11 items-center hover:text-fg">
          Try Desktop mode, the same portfolio as an interactive OS
        </Link>
      </div>
    </footer>
  );
}
