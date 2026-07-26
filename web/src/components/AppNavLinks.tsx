"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSlidingRect, LIQUID_TRANSITION } from "@/lib/useSlidingRect";

const NAV = [
  ["/app", "Dashboard"],
  ["/app/billing", "Plan"],
  ["/app/profile", "Profile"],
] as const;

export function AppNavLinks() {
  const pathname = usePathname();
  // "/app" itself must match exactly — every other app route also starts
  // with "/app", which would otherwise mark Dashboard active everywhere
  // (e.g. on /app/profile).
  const activeHref =
    NAV.find(([href]) => (href === "/app" ? pathname === href : pathname?.startsWith(href)))?.[0] ??
    NAV[0][0];
  const { containerRef, register, rect } = useSlidingRect<HTMLElement>(activeHref);

  return (
    <nav ref={containerRef} className="glass relative flex items-center gap-1 rounded-full p-1 text-sm">
      {rect && (
        <motion.span
          className="brand-gradient absolute rounded-full"
          animate={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          transition={LIQUID_TRANSITION}
        />
      )}
      {NAV.map(([href, label]) => {
        const active = href === activeHref;
        return (
          <Link key={href} ref={register(href)} href={href} className="relative z-10 rounded-full">
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
