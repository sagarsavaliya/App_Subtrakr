"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addEntity } from "@/app/app/actions";
import { useServerAction } from "@/lib/useServerAction";
import { Modal } from "@/components/Modal";
import { PlusIcon } from "./icons";

const inputClass =
  "glass w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

/** "Add business" tile for the entities grid — opens a modal instead of
 *  expanding inline, so it stays the same size as every other tile in the
 *  grid regardless of whether the form is open. */
export function AddEntityForm() {
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
        className="glass flex h-full min-h-[4.5rem] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl p-4 text-sm text-ink-2 transition-colors duration-200 hover:border-glow/30 hover:text-ink"
      >
        <PlusIcon className="h-4 w-4" />
        Add business
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add business">
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
      </Modal>
    </>
  );
}
