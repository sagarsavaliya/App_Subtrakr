import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Same guard as /admin/login: an already-authenticated user must never
  // see the login/signup wizard again — redirect to /app before rendering
  // it, rather than leaving that check to client-side effects.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return <LoginClient />;
}
