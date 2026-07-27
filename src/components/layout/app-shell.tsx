"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useGoalStore } from "@/store/goal.store";
import { useSettingsStore } from "@/store/settings.store";
import { BottomNav } from "./bottom-nav";

const NAV_ROUTES = ["/", "/stats", "/settings"];

// useLayoutEffect on client (sync before paint → no "载入中…" flash),
// useEffect on server (no-op, avoids SSR warning).
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrateGoals = useGoalStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    hydrateSettings();
    hydrateGoals();
  }, [hydrateGoals, hydrateSettings]);

  const showNav = NAV_ROUTES.includes(pathname);

  return (
    <div className="relative mx-auto min-h-screen max-w-app bg-background shadow-sm">
      <div className={showNav ? "pb-24" : ""}>{children}</div>
      {showNav && <BottomNav />}
    </div>
  );
}
