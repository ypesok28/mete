"use client";

// Scroll-reveal primitive — a fade + gentle rise the first time an element enters the viewport.
// Uses the console's instrument easing so the marketing surface moves like the app. Honors
// prefers-reduced-motion (renders the content statically, no transform).

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

export function Reveal({
  children,
  delay = 0,
  y = 18,
  duration = 0.6,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
