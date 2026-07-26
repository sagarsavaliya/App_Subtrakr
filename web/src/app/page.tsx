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
    description: "Track up to 5 subscriptions on your personal entity.",
    price_monthly: 0,
    price_quarterly: 0,
    price_half_yearly: 0,
    price_yearly: 0,
    max_entities: 1,
    max_subscriptions: 5,
  },
  {
    code: "starter",
    name: "Starter",
    description: "Up to 10 subscriptions on your personal entity.",
    price_monthly: 29,
    price_quarterly: 79,
    price_half_yearly: 139,
    price_yearly: 239,
    max_entities: 1,
    max_subscriptions: 10,
  },
  {
    code: "pro",
    name: "Personal",
    description:
      "Unlimited subscriptions on your personal entity, GST export, invoice vault.",
    price_monthly: 49,
    price_quarterly: 129,
    price_half_yearly: 229,
    price_yearly: 399,
    max_entities: 1,
    max_subscriptions: null,
  },
  {
    code: "business_lite",
    name: "Business Lite",
    description:
      "Unlimited subscriptions across your personal entity plus 2 business entities.",
    price_monthly: 99,
    price_quarterly: 259,
    price_half_yearly: 459,
    price_yearly: 799,
    max_entities: 3,
    max_subscriptions: null,
  },
  {
    code: "team",
    name: "Business",
    description:
      "Unlimited subscriptions across your personal entity plus unlimited business entities.",
    price_monthly: 149,
    price_quarterly: 389,
    price_half_yearly: 699,
    price_yearly: 1199,
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
        "code, name, description, price_monthly, price_quarterly, price_half_yearly, price_yearly, max_entities, max_subscriptions",
      )
      .order("sort_order");
    if (!data?.length) return FALLBACK_PLANS;
    return data.map((p) => ({
      ...p,
      price_monthly: Number(p.price_monthly),
      price_quarterly: Number(p.price_quarterly),
      price_half_yearly: Number(p.price_half_yearly),
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
