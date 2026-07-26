"use client";

import { useTransition } from "react";
import { useToast } from "@/components/Toaster";

export type ActionResult = { ok: boolean; message?: string };

/** Next's redirect() throws internally — that throw must propagate to the
 *  router, never get caught and shown as an error toast. It's tagged with
 *  a digest starting "NEXT_REDIRECT" (checking the digest string directly
 *  rather than importing Next's internal isRedirectError, which has moved
 *  module paths across versions). */
function isNextRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** Every button/form that calls a server action should use this — it's the
 *  one place pending state, success/error toasts, and redirect passthrough
 *  are handled, so no button silently does nothing when it fails. */
export function useServerAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<ActionResult | void>,
  options?: { successMessage?: string; onSuccess?: () => void },
) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run(...args: Args) {
    startTransition(async () => {
      try {
        const result = await action(...args);
        if (result && !result.ok) {
          toast.error(result.message ?? "That didn't work — try again.");
          return;
        }
        const successMessage = result?.message ?? options?.successMessage;
        if (successMessage) toast.success(successMessage);
        options?.onSuccess?.();
      } catch (e) {
        if (isNextRedirectError(e)) throw e;
        console.error("Server action failed:", e);
        toast.error(e instanceof Error ? e.message : "That didn't work — try again.");
      }
    });
  }

  return { run, pending };
}
