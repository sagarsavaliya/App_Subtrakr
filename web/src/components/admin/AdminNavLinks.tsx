"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSlidingRect, LIQUID_TRANSITION } from "@/lib/useSlidingRect";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/subscribers", "Subscribers"],
  ["/admin/payments", "Payments"],
  ["/admin/plans", "Plans"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNavLinks() {
  const pathname = usePathname();
  // /admin itself must match exactly — every other admin route also
  // starts with "/admin", which would otherwise mark Overview active
  // everywhere.
  const activeHref =
    NAV.find(([href]) => (href === "/admin" ? pathname === href : pathname?.startsWith(href)))?.[0] ??
    NAV[0][0];
  const { containerRef, register, rect } = useSlidingRect<HTMLElement>(activeHref);

  return (
    <nav ref={containerRef} className="relative flex flex-col gap-1">
      {rect && (
        <motion.span
          className="brand-gradient absolute left-0 top-0 rounded-xl"
          animate={{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }}
          transition={LIQUID_TRANSITION}
        />
      )}
      {NAV.map(([href, label]) => {
        const active = href === activeHref;
        return (
          <Link key={href} ref={register(href)} href={href} className="relative z-10 rounded-xl">
            <span
              className={`relative block rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                active ? "font-semibold text-[#08201a]" : "text-ink-2 hover:bg-white/5 hover:text-ink"
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
