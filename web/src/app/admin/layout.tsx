import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/adminAuth";
import { SignOutButton } from "@/components/SignOutButton";
import { AdminNavLinks } from "@/components/admin/AdminNavLinks";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // /admin/login renders through this layout too — let it through bare.
  if (!user) {
    return <>{children}</>;
  }

  const admin = await getAdminIdentity();
  if (!admin) {
    // Signed in but not an admin: no redirect loop, just a wall.
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-lg font-semibold">Not authorized</p>
        <p className="max-w-sm text-center text-sm text-ink-2">
          This account ({user.email}) is not an admin. Sign out and use an
          admin account.
        </p>
        <SignOutButton redirectTo="/admin/login" />
      </main>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-5 py-6">
      <aside className="glass sticky top-6 flex h-fit w-52 shrink-0 flex-col rounded-3xl p-4">
        <Link href="/admin" className="brand-text px-2 text-lg font-bold">
          SubTrakr
        </Link>
        <p className="mb-4 px-2 text-[10px] uppercase tracking-widest text-ink-3">
          Super admin
        </p>
        <AdminNavLinks />
        <div className="mt-6 border-t border-white/10 px-2 pt-4">
          <p className="truncate text-xs text-ink-3">{admin.email}</p>
          <div className="mt-2">
            <SignOutButton redirectTo="/admin/login" />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 pb-16">{children}</main>
    </div>
  );
}
