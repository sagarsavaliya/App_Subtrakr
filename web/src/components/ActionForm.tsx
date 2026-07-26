"use client";

import { useServerAction, type ActionResult } from "@/lib/useServerAction";

/** Swaps in for a native <form action={serverAction}> wherever the result
 *  needs a toast and/or client-side navigation on success — native form
 *  actions can't report back to the page at all, which is how "delete"
 *  and "save" buttons ended up looking like they do nothing. Every child
 *  input keeps working exactly the same (still just needs a `name`), since
 *  submission still reads them via a real FormData off the form element. */
export function ActionForm({
  action,
  onSuccess,
  successMessage,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult | void>;
  onSuccess?: () => void;
  successMessage?: string;
  className?: string;
  children: React.ReactNode | ((pending: boolean) => React.ReactNode);
}) {
  const { run, pending } = useServerAction(action, { successMessage, onSuccess });

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        run(new FormData(e.currentTarget));
      }}
    >
      {typeof children === "function" ? children(pending) : children}
    </form>
  );
}
