"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-2.5 transition-all ${
          scrolled ? "glass-strong mx-4 md:mx-auto" : ""
        }`}
      >
        <Link href="/" className="brand-text text-xl font-bold">
          SubTrakr
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-2 md:flex">
          <a href="#features" className="transition hover:text-ink">
            Features
          </a>
          <a href="#how" className="transition hover:text-ink">
            How it works
          </a>
          <a href="#pricing" className="transition hover:text-ink">
            Pricing
          </a>
          <a href="#faq" className="transition hover:text-ink">
            FAQ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm text-ink-2 transition hover:text-ink"
          >
            Sign in
          </Link>
          <Link
            href="/login?mode=signup"
            className="brand-gradient glow-shadow rounded-full px-5 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
