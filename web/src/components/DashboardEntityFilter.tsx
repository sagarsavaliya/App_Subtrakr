"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useSlidingRect, LIQUID_TRANSITION } from "@/lib/useSlidingRect";

type Entity = { id: string; name: string; type: string };

/** Same liquid sliding-pill technique as AppNavLinks' tab indicator — one
 *  shared motion.span glides between chips instead of each link abruptly
 *  recoloring on click. */
export function DashboardEntityFilter({ entities }: { entities: Entity[] }) {
  const searchParams = useSearchParams();
  const entityFilter = searchParams.get("entity");
  const activeKey = entityFilter ?? "all";

  const items = [{ id: null as string | null, key: "all", name: "All" }, ...entities.map((e) => ({ id: e.id, key: e.id, name: e.name }))];
  const { containerRef, register, rect } = useSlidingRect<HTMLDivElement>(activeKey);

  return (
    <div ref={containerRef} className="relative flex flex-wrap items-center gap-2">
      {rect && (
        <motion.span
          className="brand-gradient absolute rounded-full"
          animate={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          transition={LIQUID_TRANSITION}
        />
      )}
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Link
            key={item.key}
            ref={register(item.key)}
            href={item.id ? `/app?entity=${item.id}` : "/app"}
            className="relative z-10 rounded-full px-4 py-1.5 text-sm transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            {!active && <span className="glass absolute inset-0 -z-10 rounded-full" />}
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
    </div>
  );
}
