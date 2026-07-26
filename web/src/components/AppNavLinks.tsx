"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV = [
  ["/app", "Dashboard"],
  ["/app/billing", "Plan"],
  ["/app/profile", "Profile"],
] as const;

export function AppNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="glass flex items-center gap-1 rounded-full p-1 text-sm">
      {NAV.map(([href, label]) => {
        // "/app" itself must match exactly — every other app route also
        // starts with "/app", which would otherwise mark Dashboard active
        // everywhere (e.g. on /app/profile).
        const active = href === "/app" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link key={href} href={href} className="relative rounded-full">
            {active && (
              <motion.span
                layoutId="app-nav-active"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="brand-gradient absolute inset-0 rounded-full"
              />
            )}
            <span
              className={`relative block rounded-full px-4 py-1.5 transition-colors duration-150 ${
                active ? "font-semibold text-[#08201a]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
