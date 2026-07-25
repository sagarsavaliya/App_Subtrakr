"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDate } from "@/lib/format";

type Props = {
  name: string;
  defaultValue: string; // ISO yyyy-mm-dd
  min?: string;
  max?: string;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Replaces the native <input type="date"> — its popover is entirely
 *  OS/browser-styled and can't be restyled to match the app, so it looks
 *  jarring next to every other custom-built control. Submits through a
 *  hidden input with the same `name`/ISO format, so the surrounding
 *  <form action={serverAction}> needs no changes. */
export function CustomDatePicker({ name, defaultValue, min, max }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseISO(defaultValue);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedDate = value ? parseISO(value) : null;
  const today = new Date();
  const todayISO = toISO(today);
  const minDate = min ? parseISO(min) : null;
  const maxDate = max ? parseISO(max) : null;

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  function changeMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function pick(d: Date) {
    setValue(toISO(d));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-ink outline-none transition-colors duration-200 hover:border-white/20 focus:border-glow/40"
      >
        <CalendarIcon />
        {value ? formatDate(value) : "Select a date"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-elevated2 p-4 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
                className="cursor-pointer rounded-lg p-1.5 text-ink-2 transition-colors hover:bg-white/5 hover:text-ink"
              >
                <ChevronIcon direction="left" />
              </button>
              <p className="text-sm font-semibold text-ink">
                {viewMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
                className="cursor-pointer rounded-lg p-1.5 text-ink-2 transition-colors hover:bg-white/5 hover:text-ink"
              >
                <ChevronIcon direction="right" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="py-1 text-[10px] font-semibold uppercase text-ink-3">
                  {w}
                </span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const iso = toISO(d);
                const disabled = (minDate && d < minDate) || (maxDate && d > maxDate);
                const isSelected = iso === value;
                const isToday = iso === todayISO;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!!disabled}
                    onClick={() => pick(d)}
                    className={`aspect-square cursor-pointer rounded-lg text-xs transition-colors duration-150 disabled:cursor-not-allowed disabled:text-ink-3/40 ${
                      isSelected
                        ? "brand-gradient font-bold text-[#08201a]"
                        : isToday
                          ? "border border-glow/40 text-glow hover:bg-white/5"
                          : "text-ink-2 hover:bg-white/5 hover:text-ink"
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-3">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={direction === "left" ? "rotate-90" : "-rotate-90"}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
