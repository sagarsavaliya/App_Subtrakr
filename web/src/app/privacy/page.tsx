import Link from "next/link";
import type { Metadata } from "next";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy — SubTrakr",
  description:
    "How SubTrakr collects, stores, and uses your data — subscription tracking, GST exports, and account information.",
};

const EFFECTIVE_DATE = "29 July 2026";
const CONTACT_EMAIL = "apps@aksharatech.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div>
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
          <Link href="/" className="brand-text text-xl font-bold">
            SubTrakr
          </Link>
          <Link href="/" className="text-sm text-ink-2 transition hover:text-ink">
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="mb-2 text-2xl font-bold text-ink">Privacy Policy</h1>
        <p className="mb-10 text-sm text-ink-3">
          Effective {EFFECTIVE_DATE} · SubTrakr is built and operated by Akshara
          Technologies.
        </p>

        <Section title="What this covers">
          <p>
            This policy applies to the SubTrakr mobile app (Android) and the
            SubTrakr web app at subtrakr.me. It explains what information we
            collect, why, and what we do — and don&apos;t — do with it.
          </p>
        </Section>

        <Section title="Information you provide">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-ink">Account details</strong> — your name,
              and an email address and/or mobile number, used to sign in. We
              store a hashed PIN, never the PIN itself.
            </li>
            <li>
              <strong className="text-ink">Subscription data</strong> — service
              names, amounts, billing cycles, categories, and dates you enter to
              track your recurring payments.
            </li>
            <li>
              <strong className="text-ink">Business/entity data</strong> —
              business names and GSTIN, if you add a business entity to
              separate personal and company subscriptions for GST reporting.
            </li>
            <li>
              <strong className="text-ink">Payment method labels</strong> — a
              nickname, bank or wallet name, card network, and the{" "}
              <strong className="text-ink">last four digits only</strong> of a
              card or account number, so you can remember which method a
              subscription is billed to. We never collect full card numbers,
              CVVs, or bank credentials, and we never process payments through
              these — they&apos;re for your own reference only.
            </li>
            <li>
              <strong className="text-ink">Payment confirmation text</strong> —
              if you use Android&apos;s native Share feature to send a payment
              confirmation (e.g. from your bank app or SMS) into SubTrakr, we
              read that shared text to pre-fill a &quot;mark as paid&quot;
              confirmation. SubTrakr does{" "}
              <strong className="text-ink">not</strong> read your SMS messages
              or notifications directly, does not request SMS/notification
              access permissions, and never sees anything you don&apos;t
              explicitly share into the app yourself.
            </li>
            <li>
              <strong className="text-ink">Invoices/receipts</strong> — files
              you attach to a subscription are stored locally on your device
              only. They are never uploaded to our servers.
            </li>
          </ul>
        </Section>

        <Section title="Information we don't collect">
          <p>
            SubTrakr contains no advertising SDKs, no third-party analytics or
            tracking libraries, and no SMS/notification-reading code. We
            don&apos;t sell your data to anyone, and we don&apos;t share it with
            advertisers.
          </p>
        </Section>

        <Section title="How we store your data">
          <p>
            Your account and subscription data is stored on infrastructure we
            operate ourselves, not a third-party data broker. Reasonable
            technical measures (encrypted connections, access-controlled
            databases, per-account row-level access restrictions) are used to
            protect it.
          </p>
          <p>
            If you subscribe to a paid SubTrakr plan, payment processing for{" "}
            <em>that</em> transaction is handled by Razorpay, a licensed Indian
            payment gateway — we never see or store your card/UPI credentials
            ourselves.
          </p>
        </Section>

        <Section title="Notifications">
          <p>
            Renewal reminders are scheduled locally on your device by the app
            itself. We do not use a push-notification service that routes
            through third-party servers to deliver them.
          </p>
        </Section>

        <Section title="Your data, your control">
          <p>
            You can edit or delete individual subscriptions, entities, and
            payment methods at any time from within the app. To delete your
            entire account and all associated data, email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-glow hover:underline">
              {CONTACT_EMAIL}
            </a>{" "}
            from your account&apos;s email address (or from the phone number on
            file) and we&apos;ll process the deletion.
          </p>
        </Section>

        <Section title="Children">
          <p>
            SubTrakr is a personal/business finance tool and is not directed at,
            or knowingly used to collect information from, children under 18.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If this policy changes in a material way, we&apos;ll update the
            effective date above and, where required, notify you in the app.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your data? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-glow hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
