"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/subscribers", "Subscribers"],
  ["/admin/payments", "Payments"],
  ["/admin/plans", "Plans"],
  ["/admin/settings", "Settings"],
] as const;

export function AdminNavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(([href, label]) => {
        // /admin itself must match exactly — every other admin route also
        // starts with "/admin", which would otherwise mark Overview active
        // everywhere.
        const active = href === "/admin" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link key={href} href={href} className="relative rounded-xl">
            {active && (
              <motion.span
                layoutId="admin-nav-active"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="brand-gradient absolute inset-0 rounded-xl"
              />
            )}
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
