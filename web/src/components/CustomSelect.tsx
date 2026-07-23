"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Option = { value: string; label: string };

type Props = {
  name: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
};

/** Custom listbox replacing the native <select> — the browser's own
 *  dropdown popover can't be restyled (rounded corners, shadows, custom
 *  chevron/checkmark) beyond the closed trigger, which is what made the
 *  old dropdown look generic. Submits through a hidden input with the same
 *  `name`, so the surrounding <form action={serverAction}> and its FormData
 *  shape need no changes at all. */
export function CustomSelect({ name, options, defaultValue, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openAt(index: number) {
    setOpen(true);
    setHighlighted(Math.max(0, index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        openAt(options.findIndex((o) => o.value === value));
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setValue(options[highlighted].value);
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openAt(options.findIndex((o) => o.value === value)))}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="glass flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left text-sm text-ink outline-none transition-colors duration-200 hover:border-white/20 focus:border-glow/40"
      >
        <span className={selected ? "" : "text-ink-3"}>
          {selected?.label ?? placeholder ?? "Select…"}
        </span>
        <ChevronIcon open={open} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-white/10 bg-elevated2 p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)]"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => {
                    setValue(o.value);
                    setOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 ${
                    i === highlighted ? "bg-glow/10 text-ink" : "text-ink-2"
                  } ${isSelected ? "font-medium text-glow" : ""}`}
                >
                  {o.label}
                  {isSelected && <CheckIcon />}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className={`ml-2 shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-2 shrink-0 text-glow">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
