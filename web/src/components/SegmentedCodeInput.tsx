"use client";

import { useRef } from "react";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  mask?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  label: string;
};

/** Individual-box code input (OTP / PIN) — auto-advances on type, steps back
 *  on backspace from an empty box, and fills every box from a single paste
 *  (WhatsApp/SMS codes are almost always copy-pasted, not typed digit by
 *  digit). `mask` renders dots instead of digits, for PIN entry. */
export function SegmentedCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  mask = false,
  autoFocus = false,
  disabled = false,
  label,
}: Props) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function commit(next: string[]) {
    const joined = next.join("");
    onChange(joined);
    if (joined.length === length) onComplete?.(joined);
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    const next = [...chars];
    if (!raw) {
      next[i] = "";
      commit(next);
      return;
    }
    next[i] = raw[raw.length - 1];
    commit(next);
    if (i < length - 1) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      e.preventDefault();
      const next = [...chars];
      next[i - 1] = "";
      commit(next);
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      inputRefs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    commit(pasted.split(""));
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2 sm:gap-3">
      {chars.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type={mask ? "password" : "text"}
          inputMode="numeric"
          autoComplete={i === 0 && !mask ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`${label} — digit ${i + 1} of ${length}`}
          className={`glass h-12 w-10 rounded-xl text-center text-lg font-semibold text-ink outline-none transition-all duration-200 focus:border-glow/60 focus:shadow-[0_0_0_3px_rgba(94,234,197,0.18)] disabled:opacity-50 sm:h-14 sm:w-12 sm:text-xl ${
            digit ? "border-glow/30" : ""
          }`}
        />
      ))}
    </div>
  );
}
