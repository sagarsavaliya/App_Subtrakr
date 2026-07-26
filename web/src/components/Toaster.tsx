"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircleIcon, XIcon } from "./icons";

type ToastVariant = "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Every mutating action in the app should end in a toast — silence reads
 *  as "did that even do anything?" (the exact complaint that led to this).
 *  Mounted once at the root layout so it survives client-side navigation
 *  between pages. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, variant }]);
    const timeout = variant === "error" ? 6000 : 3500;
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  const value: ToastContextValue = {
    success: (message) => push(message, "success"),
    error: (message) => push(message, "error"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`glass-strong pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)] ${
                t.variant === "error"
                  ? "border-overdue/40 bg-overdue/10"
                  : "border-glow/40 bg-glow/10"
              }`}
              role="status"
              aria-live="polite"
            >
              {t.variant === "error" ? (
                <XIcon className="h-5 w-5 shrink-0 text-overdue" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-glow" />
              )}
              <p className="flex-1 text-sm text-ink">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 cursor-pointer text-ink-3 transition-colors hover:text-ink"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
