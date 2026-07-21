"use client";

import { motion } from "framer-motion";
import { percent } from "@/utils/progress";

interface BarViewProps {
  current: number;
  total: number;
  color: string;
}

export function BarView({ current, total, color }: BarViewProps) {
  const p = percent(current, total);
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="text-4xl font-bold" style={{ color }}>
        {p}%
      </div>
      <div className="h-5 w-full overflow-hidden rounded-full bg-border/50">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${p}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
