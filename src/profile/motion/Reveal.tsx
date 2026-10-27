"use client";

import { motion } from "motion/react";
import { DURATION, EASE_OUT } from "./ease";

/**
 * Fades + lifts its children the first time they scroll into view.
 * `data-reveal` lets the <noscript> rule in ProfilePage show content when JS is off.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: DURATION.reveal, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
