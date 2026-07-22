"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";

const TABS = [
  { href: "/", key: "nav.home", Icon: Home },
  { href: "/stats", key: "nav.stats", Icon: BarChart3 },
  { href: "/settings", key: "nav.settings", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-app border-t border-border bg-surface/95 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 py-2">
        {TABS.map(({ href, key, Icon }) => {
          const active = pathname === href;
          const label = t(key);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-btn py-1.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
