"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addEntity } from "@/app/app/actions";
import { useServerAction } from "@/lib/useServerAction";
import { Modal } from "@/components/Modal";
import { PlusIcon } from "./icons";

const inputClass =
  "glass w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

/** Round "add" button next to the Entities heading — opens a modal with
 *  either the add-business form, or (at the plan's entity cap) the
 *  upgrade prompt in the same spot, instead of a full-width grid tile
 *  that would've been a different height than its neighbors depending on
 *  which state it was in. */
export function AddEntityForm({
  atLimit,
  limit,
}: {
  atLimit: boolean;
  limit: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { run, pending } = useServerAction(addEntity, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add business"
        className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:border-glow/30 hover:text-glow"
      >
        <PlusIcon className="h-4 w-4" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add business">
        {atLimit ? (
          <p className="text-sm text-ink-2">
            Your plan allows {limit} {limit === 1 ? "entity" : "entities"}.{" "}
            <Link href="/app/billing" className="text-glow hover:underline">
              Upgrade
            </Link>{" "}
            to add another business.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(new FormData(e.currentTarget));
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs text-ink-2">Business name</label>
              <input
                name="name"
                required
                autoFocus
                placeholder="Akshara Technologies"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">GSTIN (optional)</label>
              <input name="gst_number" placeholder="22AAAAA0000A1Z5" className={inputClass} />
            </div>
            <button
              type="submit"
              disabled={pending}
              className="brand-gradient w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save business"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
