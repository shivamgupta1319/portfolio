"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { profile } from "@/data/profile";
import type { Quest } from "@/data/types";
import ResumeLink from "./ResumeLink";
import LiveBoard from "./LiveBoard";
import { EASE_OUT } from "./motion/ease";

const NAME_WORDS = profile.name.split(" ");

/** The page's one orchestrated moment: name rises word by word, then the live board ticks in. */
export default function Hero({ live }: { live: Quest[] }) {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end lg:gap-14 lg:pb-24 lg:pt-24">
        <div className="min-w-0">
          <motion.div
            data-reveal
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="flex items-center gap-4"
          >
            {profile.photo && (
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border-strong sm:h-16 sm:w-16">
                <Image
                  src={profile.photo}
                  alt={`${profile.name}, ${profile.role}`}
                  fill
                  sizes="64px"
                  priority
                  className="object-cover"
                />
              </span>
            )}
            <p className="text-sm leading-snug text-fg-dim sm:text-base">
              <span className="inline-flex items-center gap-2 text-fg">
                <span aria-hidden className="h-2 w-2 rounded-full bg-green" />
                Open to new roles
              </span>
              <br />
              {profile.location}, remote or relocation
            </p>
          </motion.div>

          <h1
            id="hero-title"
            className="mt-8 text-[clamp(4rem,15vw,9.5rem)] font-semibold leading-[0.86] tracking-[-0.045em] text-fg [font-stretch:88%]"
          >
            {NAME_WORDS.map((w, i) => (
              <span key={w} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  data-reveal
                  className="block"
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 + i * 0.12 }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.div
            data-reveal
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.5 }}
          >
            <p className="mt-8 max-w-xl text-xl leading-snug text-fg sm:text-2xl">
              Full-stack engineer building AI and fintech systems, and shipping them to production.
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-dim sm:text-lg">
              Four years of production work at Wisflux, plus three SaaS products I designed, built and
              run on my own.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ResumeLink />
              <a
                href="#work"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-border-strong px-6 text-base font-medium text-fg transition-colors hover:bg-panel-2"
              >
                See selected work
              </a>
            </div>
          </motion.div>
        </div>

        <LiveBoard quests={live} />
      </div>
    </section>
  );
}
