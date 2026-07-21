"use client";

import { motion } from "framer-motion";

const COLORS = ["#556B2F", "#F97316", "#3B82F6", "#EC4899", "#22C55E", "#A855F7", "#E6A23C"];

/** Lightweight one-shot celebration burst (Framer Motion only, no extra deps). */
export function Confetti({ count = 80 }: { count?: number }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 137.5) % 100; // spread deterministically-ish across width
        const delay = (i % 10) * 0.03;
        const duration = 1.3 + (i % 7) * 0.12;
        const size = 6 + (i % 4) * 2;
        const color = COLORS[i % COLORS.length];
        const drift = ((i % 5) - 2) * 30;
        return (
          <motion.div
            key={i}
            initial={{ y: -30, x: 0, opacity: 1, rotate: 0 }}
            animate={{ y: "110vh", x: drift, rotate: 360 + (i % 3) * 180, opacity: [1, 1, 0.9, 0] }}
            transition={{ duration, delay, ease: "easeIn" }}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: 0,
              width: size,
              height: size * 1.5,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        );
      })}
    </div>
  );
}
