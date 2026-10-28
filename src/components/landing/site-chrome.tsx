import Link from "next/link";
import { Logo, PoweredBy } from "@/components/ui/brand";
import { primaryClass } from "@/components/ui/form";

const navLinks = [["#features", "Features"], ["#how-it-works", "How it works"], ["/momo-house", "Example menu"]] as const;

export function SiteNav() {
  return <header className="sticky top-0 z-40 border-b border-line/60 bg-canvas/80 backdrop-blur-xl">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <Logo />
      <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-medium text-ink-muted md:flex">
        {navLinks.map(([href, label]) => <Link key={href} href={href} className="transition-colors hover:text-ink">{label}</Link>)}
      </nav>
      <div className="flex items-center gap-1 sm:gap-2">
        <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink">Sign in</Link>
        <Link href="/register" className={`${primaryClass} min-h-10 px-4 py-2`}>Get started</Link>
      </div>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="border-t border-line">
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div><Logo /><p className="mt-3 max-w-xs text-sm leading-6 text-ink-muted">A free, phone-first digital menu for Nepal’s restaurants.</p></div>
      <div className="flex flex-col gap-3 text-sm sm:items-end">
        <div className="flex gap-5 font-medium text-ink-muted"><Link href="/momo-house" className="hover:text-ink">Example menu</Link><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/register" className="hover:text-ink">Get started</Link></div>
        <PoweredBy />
      </div>
    </div>
  </footer>;
}
