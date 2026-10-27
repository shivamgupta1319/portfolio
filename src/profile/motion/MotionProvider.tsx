"use client";

import { MotionConfig } from "motion/react";

/** One place to honour `prefers-reduced-motion` for every motion component below. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
