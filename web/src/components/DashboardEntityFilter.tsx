"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

type Entity = { id: string; name: string; type: string };

/** Same sliding-pill technique as AppNavLinks' tab indicator — one shared
 *  motion.span (layoutId) moves between chips instead of each link
 *  abruptly recoloring on click. */
export function DashboardEntityFilter({ entities }: { entities: Entity[] }) {
  const searchParams = useSearchParams();
  const entityFilter = searchParams.get("entity");

  const items = [{ id: null as string | null, name: "All" }, ...entities];

  return (
    <>
      {items.map((item) => {
        const active = item.id ? entityFilter === item.id : !entityFilter;
        return (
          <Link
            key={item.id ?? "all"}
            href={item.id ? `/app?entity=${item.id}` : "/app"}
            className="relative rounded-full px-4 py-1.5 text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            {active && (
              <motion.span
                layoutId="dashboard-entity-active"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="brand-gradient absolute inset-0 rounded-full"
              />
            )}
            {!active && <span className="glass absolute inset-0 rounded-full" />}
            <span
              className={`relative transition-colors duration-150 ${
                active ? "font-semibold text-[#08201a]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {item.name}
            </span>
          </Link>
        );
      })}
    </>
  );
}
