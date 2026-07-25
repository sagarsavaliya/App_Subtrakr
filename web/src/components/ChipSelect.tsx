"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Option = { value: string; label: string };

/** Segmented chip row for small, fixed option sets (≤6) — all choices
 *  visible at once, one tap, no reveal step. Mirrors the Flutter app's
 *  AppChip pattern exactly (active = brand-gradient fill, inactive =
 *  glass), used there for the same billing-cycle/entity choices. Submits
 *  via a hidden input, so the surrounding <form action={...}> Server
 *  Action needs no changes. */
export function ChipSelect({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");

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
            onClick={() => setValue(o.value)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm transition-colors duration-150 ${
              active
                ? "brand-gradient font-semibold text-[#08201a]"
                : "glass text-ink-2 hover:text-ink"
            }`}
          >
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}
