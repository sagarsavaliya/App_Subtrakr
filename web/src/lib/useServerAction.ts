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

/** Never surface a raw/empty error to the user — a bare "{}" (which
 *  Error.message can produce when something upstream JSON.stringifies an
 *  Error, since `message` isn't enumerable) or "[object Object]" is worse
 *  than no detail at all. Also recognizes the classic "stale server
 *  action" symptom: the page was open from before the last deploy landed,
 *  so its embedded action reference 404s against the redeployed server —
 *  a plain refresh fixes it, which a generic "try again" message doesn't
 *  communicate. */
function friendlyErrorMessage(e: unknown): string {
  const fallback = "That didn't work — try again.";
  if (!(e instanceof Error)) return fallback;
  const msg = e.message?.trim();
  if (!msg || msg === "{}" || msg === "[object Object]") return fallback;
  if (/fetch|network|404|failed to load/i.test(msg)) {
    return "That didn't work — refresh the page and try again (a new version may have just deployed).";
  }
  return msg;
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
        toast.error(friendlyErrorMessage(e));
      }
    });
  }

  return { run, pending };
}
