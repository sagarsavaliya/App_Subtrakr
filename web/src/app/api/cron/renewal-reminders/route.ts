import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRenewalReminderWhatsApp, whatsappConfigured } from "@/lib/whatsapp";
import { formatINR, formatDate } from "@/lib/format";

/** Triggered daily by a scheduled GitHub Actions workflow (see
 *  .github/workflows/renewal-reminders.yml), not user-facing — protected
 *  by a shared secret rather than a session, since there's no logged-in
 *  user in a cron context. Mirrors NotificationService's cascade in the
 *  Flutter app (see notification_service.dart) so a WhatsApp reminder and
 *  the local push notification fire on the same days, rather than being
 *  two independently-tuned schedules that drift apart. */

const OFFSETS_BY_CYCLE: Record<string, number[]> = {
  yearly: [14, 7, 3, 1],
  half_yearly: [14, 7, 3, 1],
  quarterly: [7, 3, 1],
  monthly: [3, 1],
  weekly: [3, 1],
};
const DEFAULT_OFFSETS = [3, 1];

function daysUntil(dueDate: string, today: Date): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await whatsappConfigured())) {
    return NextResponse.json({ sent: 0, note: "WhatsApp not configured" });
  }

  const db = createAdminClient();
  const { data: subs, error } = await db
    .from("subscriptions")
    .select("id, user_id, name, amount, billing_cycle, next_due_date")
    .eq("status", "active");
  if (error) {
    console.error("renewal-reminders: subscriptions query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let sent = 0;
  let failed = 0;

  for (const sub of subs ?? []) {
    const offset = daysUntil(sub.next_due_date, today);
    const validOffsets = OFFSETS_BY_CYCLE[sub.billing_cycle] ?? DEFAULT_OFFSETS;
    if (!validOffsets.includes(offset)) continue;

    // Idempotency: keyed on (subscription, due date, offset) so a second
    // cron run the same day — or a workflow_dispatch re-trigger — never
    // double-sends, while a resend correctly fires again next renewal
    // cycle once next_due_date has moved on.
    const { data: alreadySent } = await db
      .from("renewal_reminders_sent")
      .select("id")
      .eq("subscription_id", sub.id)
      .eq("next_due_date", sub.next_due_date)
      .eq("offset_days", offset)
      .maybeSingle();
    if (alreadySent) continue;

    const { data: userRes } = await db.auth.admin.getUserById(sub.user_id);
    const phone = userRes?.user?.phone;
    if (!phone) continue; // email-only accounts have no WhatsApp channel

    const result = await sendRenewalReminderWhatsApp(phone, {
      serviceName: sub.name,
      amount: formatINR(Number(sub.amount)),
      renewsOn: formatDate(sub.next_due_date),
    });

    if (result.ok) {
      sent++;
      await db.from("renewal_reminders_sent").insert({
        subscription_id: sub.id,
        next_due_date: sub.next_due_date,
        offset_days: offset,
      });
    } else {
      failed++;
      console.error(`renewal-reminders: send failed for subscription ${sub.id}:`, result.error);
    }
  }

  return NextResponse.json({ sent, failed, checked: subs?.length ?? 0 });
}
