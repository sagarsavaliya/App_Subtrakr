"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSlidingRect, LIQUID_TRANSITION } from "@/lib/useSlidingRect";

type Option = { value: string; label: string };

/** Segmented chip row for small, fixed option sets (≤6) — all choices
 *  visible at once, one tap, no reveal step. Mirrors the Flutter app's
 *  AppChip pattern exactly (active = brand-gradient fill, inactive =
 *  glass), used there for the same billing-cycle/entity choices. Submits
 *  via a hidden input, so the surrounding <form action={...}> Server
 *  Action needs no changes.
 *
 *  The active background is one shared motion.span whose real DOM rect
 *  (via useSlidingRect) is re-measured on every selection and animated
 *  with mismatched left/width springs (LIQUID_TRANSITION) — the pill
 *  stretches toward the new chip before catching up to its width,
 *  reading as a liquid glide rather than a rigid slide or color swap. */
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
  const { containerRef, register, rect } = useSlidingRect<HTMLDivElement>(value);

  function select(v: string) {
    setValue(v);
    onChange?.(v);
  }

  return (
    <div ref={containerRef} className="relative flex flex-wrap gap-2">
      <input type="hidden" name={name} value={value} />
      {rect && (
        <motion.span
          className="brand-gradient absolute rounded-full"
          animate={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          transition={LIQUID_TRANSITION}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={o.value}
            ref={register(o.value)}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => select(o.value)}
            className="relative z-10 cursor-pointer rounded-full px-4 py-2 text-sm"
          >
            {!active && <span className="glass absolute inset-0 -z-10 rounded-full" />}
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
