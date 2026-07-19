import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name =
    (user.user_metadata?.full_name as string) ??
    user.email?.split("@")[0] ??
    "You";

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5">
      <header className="flex items-center justify-between py-5">
        <Link href="/app" className="brand-text text-xl font-bold">
          SubTrakr
        </Link>
        <nav className="glass flex items-center gap-1 rounded-full p-1 text-sm">
          <Link
            href="/app"
            className="rounded-full px-4 py-1.5 text-ink-2 transition hover:text-ink"
          >
            Dashboard
          </Link>
          <Link
            href="/app/billing"
            className="rounded-full px-4 py-1.5 text-ink-2 transition hover:text-ink"
          >
            Plan
          </Link>
          <Link
            href="/app/profile"
            className="rounded-full px-4 py-1.5 text-ink-2 transition hover:text-ink"
          >
            Profile
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-2 sm:block">{name}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="pb-16">{children}</main>
    </div>
  );
}
