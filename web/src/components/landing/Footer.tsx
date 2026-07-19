import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-ink-3 sm:flex-row">
        <p>
          <span className="brand-text font-bold">SubTrakr</span> · an Akshara
          Technologies product · © {new Date().getFullYear()}
        </p>
        <nav className="flex gap-5">
          <a href="#features" className="transition hover:text-ink-2">
            Features
          </a>
          <a href="#pricing" className="transition hover:text-ink-2">
            Pricing
          </a>
          <Link href="/login" className="transition hover:text-ink-2">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
