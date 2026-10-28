import Link from "next/link";
import { MenuIcon, type MenuIconName } from "@/components/menu/icon";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { SiteFooter, SiteNav } from "@/components/landing/site-chrome";
import { RESTROFUEL_URL } from "@/components/ui/brand";
import { eyebrowClass, primaryClass, secondaryClass } from "@/components/ui/form";

const highlights = ["No app to install", "English & नेपाली", "Updates instantly", "Free for restaurants"];

const features: [MenuIconName, string, string][] = [
  ["bolt", "Live the moment you save", "Change a price or add a dish and guests see it right away. No reprinting, ever."],
  ["device", "Made for every phone", "A fast, searchable menu that feels at home on any phone, in light or dark mode."],
  ["globe", "English and Nepali", "Show Nepali names and descriptions beside English, so every guest feels welcome."],
  ["flame", "Specials that sell", "Feature up to six signature dishes in a banner at the very top of your menu."],
  ["toggle", "Sold out? One tap.", "Mark dishes or portions unavailable, with variants, add-ons and allergen notes."],
  ["sheet", "Import from Excel", "Fill in a spreadsheet and bring up to 200 dishes into your menu in one go."],
];

const steps = [
  ["Create your free account", "Sign up with your email and name your restaurant. It stays private until you publish."],
  ["Add your dishes", "Type them in from your phone, or import your whole menu from an Excel or CSV sheet."],
  ["Put QR codes on tables", "Publish your menu and share the QR code. Rename later and printed codes keep working."],
];

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="mx-auto max-w-2xl text-center">
    <p className={eyebrowClass}>{eyebrow}</p>
    <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[40px] sm:leading-[1.15]">{title}</h2>
    <p className="mt-4 text-[15px] leading-7 text-ink-muted sm:text-base">{body}</p>
  </div>;
}

export default function Home() {
  return <>
    <SiteNav />
    <main className="overflow-x-clip">
      <section className="relative">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklab,var(--brand)_16%,transparent),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div className="text-center lg:text-left">
            <a href={RESTROFUEL_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted shadow-card transition-colors hover:text-ink">
              <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand">Free</span>Powered by RestroFuel<span aria-hidden="true">↗</span>
            </a>
            <h1 className="mt-6 text-[40px] font-bold leading-[1.08] tracking-tight sm:text-6xl">Your menu,<br /><span className="text-brand">one scan away.</span></h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-ink-muted sm:text-lg sm:leading-8 lg:mx-0">A beautiful, phone-first QR menu for Nepal’s restaurants. Update dishes, prices and specials in seconds, and guests always see what’s fresh.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/register" className={`${primaryClass} px-7`}>Create your free menu<MenuIcon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/momo-house" className={`${secondaryClass} px-7 py-3`}>View example menu</Link>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-ink-muted lg:justify-start">
              {highlights.map(text => <li key={text} className="inline-flex items-center gap-1.5"><MenuIcon name="check" className="h-4 w-4 text-brand" />{text}</li>)}
            </ul>
          </div>
          <PhoneMockup />
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-t border-line bg-surface-muted/50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Features" title="Everything your menu needs. Nothing it doesn’t." body="Designed for busy restaurant teams, so keeping your menu up to date takes minutes, not hours." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([icon, title, body]) => <div key={title} className="rounded-2xl border border-line bg-surface p-6 shadow-card">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><MenuIcon name={icon} className="h-5 w-5" /></span>
            <h3 className="mt-5 text-base font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
          </div>)}</div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="How it works" title="From sign-up to every table in an afternoon." body="No designers, no printers on speed dial. Just your menu, online." />
          <ol className="mt-12 grid gap-4 md:grid-cols-3">{steps.map(([title, body], index) => <li key={title} className="relative rounded-2xl border border-line bg-surface p-6">
            <span className="text-sm font-semibold tabular-nums text-brand">0{index + 1}</span>
            <h3 className="mt-3 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p>
          </li>)}</ol>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-stone-950 px-6 py-12 text-white ring-1 ring-white/10 sm:px-12 sm:py-16">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-orange-600/30 blur-3xl" />
          <div aria-hidden="true" className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">Powered by RestroFuel</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-[40px]">Free menus today. A complete restaurant system when you’re ready.</h2>
              <p className="mt-4 max-w-xl leading-7 text-white/70">QR Menu is offered free to every restaurant by RestroFuel, Nepal’s offline-first restaurant system for billing, VAT-ready accounting and live margins on every plate.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
              <a href={RESTROFUEL_URL} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-stone-900 transition-colors hover:bg-orange-50">Explore RestroFuel<span aria-hidden="true">↗</span></a>
              <Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10">Start with a free menu</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
