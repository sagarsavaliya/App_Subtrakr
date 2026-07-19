import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Pricing, type LandingPlan } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

// Revalidate hourly — pricing rarely changes, and the landing page should
// be served statically fast.
export const revalidate = 3600;

const FALLBACK_PLANS: LandingPlan[] = [
  {
    code: "free",
    name: "Free",
    description: "Track up to 3 subscriptions on your personal entity.",
    price_monthly: 0,
    price_yearly: 0,
    max_entities: 1,
    max_subscriptions: 3,
  },
  {
    code: "pro",
    name: "Pro",
    description:
      "Unlimited subscriptions, business entities, GST export, invoice vault.",
    price_monthly: 149,
    price_yearly: 1490,
    max_entities: null,
    max_subscriptions: null,
  },
  {
    code: "team",
    name: "Team",
    description: "Everything in Pro, for your whole finance team.",
    price_monthly: 499,
    price_yearly: 4990,
    max_entities: null,
    max_subscriptions: null,
  },
];

async function fetchPlans(): Promise<LandingPlan[]> {
  try {
    // Anon client without cookies — plans are public, and this keeps the
    // page statically renderable.
    const db = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await db
      .from("plans")
      .select(
        "code, name, description, price_monthly, price_yearly, max_entities, max_subscriptions",
      )
      .order("sort_order");
    if (!data?.length) return FALLBACK_PLANS;
    return data.map((p) => ({
      ...p,
      price_monthly: Number(p.price_monthly),
      price_yearly: Number(p.price_yearly),
    }));
  } catch {
    return FALLBACK_PLANS;
  }
}

export default async function LandingPage() {
  const plans = await fetchPlans();

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing plans={plans} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
