import Link from "next/link";

export default function Home() {
  return <main className="mx-auto max-w-5xl px-6 sm:px-10">
    <nav className="flex items-center justify-between border-b border-stone-200 py-7">
      <span className="text-lg font-bold tracking-tight">qrmenu<span className="text-orange-700">.</span></span>
      <div className="flex gap-5 text-sm font-medium text-stone-600"><Link href="/login">Sign in</Link><Link href="/register">Get started ↗</Link></div>
    </nav>
    <section className="grid gap-12 py-20 sm:py-28 md:grid-cols-[1.2fr_1fr] md:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">Built for the local table</p>
        <h1 className="mt-6 font-serif text-6xl leading-[1.04] tracking-tight sm:text-7xl">Your menu.<br />One simple scan.</h1>
        <p className="mt-7 max-w-md text-lg leading-8 text-stone-600">A home for your momo, your masala tea, and everything in between. A QR menu for Nepal’s restaurants.</p>
        <Link href="/momo-house" className="mt-9 inline-flex rounded-full bg-stone-900 px-7 py-3.5 text-sm font-semibold text-white">Explore the example menu <span className="ml-6">→</span></Link>
        <p className="mt-4 text-xs text-stone-500">Foundation preview · Sample content</p>
      </div>
      <Link href="/momo-house" aria-label="Open Momo House example menu" className="rotate-2 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm transition-transform hover:rotate-0 sm:p-10">
        <div className="flex justify-between text-[10px] font-semibold uppercase tracking-widest text-stone-500"><span>Thamel, Kathmandu</span><span>Sample menu</span></div>
        <h2 className="mt-10 font-serif text-4xl">Momo House</h2>
        <p className="mt-2 text-sm text-stone-500">A little taste of home.</p>
        <div className="mt-8 border-y border-stone-200 py-5"><div className="flex justify-between text-sm font-semibold"><span>Buff momo</span><span>Rs 180</span></div><p className="mt-2 text-xs leading-5 text-stone-500">Steamed, hand-folded, served with house achar.</p></div>
        <div className="py-5"><div className="flex justify-between text-sm font-semibold"><span>Masala milk tea</span><span>Rs 60</span></div><p className="mt-2 text-xs leading-5 text-stone-500">Ginger, cardamom, and a moment to slow down.</p></div>
        <p className="mt-7 text-xs font-medium text-orange-800">See what’s on the menu ↗</p>
      </Link>
    </section>
    <section className="border-t border-stone-200 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">The build, phase by phase</p>
      <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[
        ["01", "A secure foundation", "Owner accounts, restaurants, and tenant isolation."],
        ["02", "A menu worth scanning", "Fast menus and QR links that survive a rename."],
        ["03", "Everything in your pocket", "Phone-first editing, variants, branding, and photos."],
        ["04", "From signup to table", "Starter menus, imports, and printable QR codes."],
        ["05", "Ready for real restaurants", "Billing, administration, reliability, and the pilot."],
      ].map(([number, title, text]) => <div key={number} className="py-3"><span className="text-xs font-semibold text-orange-800">{number}</span><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{text}</p></div>)}</div>
    </section>
    <footer className="border-t border-stone-200 py-6 text-xs text-stone-500">QR Menu · Local foundation · Full plan in docs/BUILD-PLAN.md</footer>
  </main>;
}
