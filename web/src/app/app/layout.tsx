import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { AppNavLinks } from "@/components/AppNavLinks";

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
        <AppNavLinks />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-ink-2 sm:block">{name}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="pb-16">{children}</main>
    </div>
  );
}
