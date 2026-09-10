import Link from "next/link";
import { profile } from "@/data/profile";

export default function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 font-mono text-xs text-fg-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {profile.name} · built with Next.js, statically exported
        </p>
        <ul className="flex flex-wrap gap-4">
          <li><a href={profile.github} className="hover:text-fg">GitHub</a></li>
          <li><a href={profile.linkedin} className="hover:text-fg">LinkedIn</a></li>
          <li><a href={`mailto:${profile.email}`} className="hover:text-fg">Email</a></li>
          <li>
            <Link href="/desktop" prefetch={false} className="hover:text-fg">
              Desktop mode <span aria-hidden>▸</span>
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
