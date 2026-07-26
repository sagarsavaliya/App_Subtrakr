"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";

type Option = { value: string; label: string };

/** Segmented chip row for small, fixed option sets (≤6) — all choices
 *  visible at once, one tap, no reveal step. Mirrors the Flutter app's
 *  AppChip pattern exactly (active = brand-gradient fill, inactive =
 *  glass), used there for the same billing-cycle/entity choices. Submits
 *  via a hidden input, so the surrounding <form action={...}> Server
 *  Action needs no changes.
 *
 *  The active background is one shared `motion.span` (layoutId) that
 *  slides/morphs between chips instead of each button abruptly
 *  recoloring — same technique as AppNavLinks' tab indicator. `useId`
 *  scopes the layoutId per instance so two ChipSelects on the same page
 *  (e.g. billing cycle + card network) never animate into each other. */
export function ChipSelect({
  name,
  options,
  defaultValue,
  onChange,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  /** Only needed when a sibling field must react to the choice (e.g.
   *  showing different fields per payment-method type) — the hidden input
   *  still carries the value into the surrounding form either way. */
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const uid = useId();

  function select(v: string) {
    setValue(v);
    onChange?.(v);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={o.value}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => select(o.value)}
            className="relative cursor-pointer rounded-full px-4 py-2 text-sm"
          >
            {active ? (
              <motion.span
                layoutId={`chip-active-${uid}`}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="brand-gradient absolute inset-0 rounded-full"
              />
            ) : (
              <span className="glass absolute inset-0 rounded-full" />
            )}
            <span
              className={`relative transition-colors duration-150 ${
                active ? "font-semibold text-[#08201a]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {o.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
