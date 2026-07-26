import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewSubscriptionForm } from "./NewSubscriptionForm";

export default async function NewSubscriptionPage() {
  const supabase = await createClient();
  const { data: entities } = await supabase
    .from("entities")
    .select("id, name, type")
    .order("type");

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add subscription</h1>
        <Link href="/app" className="text-sm text-ink-2 hover:text-ink">
          Cancel
        </Link>
      </div>

      <NewSubscriptionForm entities={entities ?? []} />
    </div>
  );
}
