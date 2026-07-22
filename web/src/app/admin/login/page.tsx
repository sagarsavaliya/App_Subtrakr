import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/adminAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // An already-authenticated admin must never see the login form again —
  // the parent layout renders its authenticated shell (sidebar, sign-out)
  // around whatever this page returns regardless, so without this redirect
  // a logged-in admin lands on /admin/login and sees the sidebar with the
  // raw login form dropped into the content area.
  const admin = await getAdminIdentity();
  if (admin) redirect("/admin");

  return <LoginForm />;
}
