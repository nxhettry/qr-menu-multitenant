import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_SLUG, formatPrice, getPublicMenu } from "@/lib/menu/demo";

export function generateStaticParams() { return [{ slug: DEMO_SLUG }]; }

async function MenuContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  return <main className="mx-auto max-w-2xl px-5 pb-12 sm:px-8">
    <div className="border-b border-stone-200 py-4 text-center text-xs font-medium tracking-wide text-stone-500">EXAMPLE MENU · ILLUSTRATIVE PRICES</div>
    <header className="py-12 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-800">{menu.address}</p>
      <h1 className="mt-5 font-serif text-5xl tracking-tight sm:text-6xl">{menu.name}</h1>
      <p lang="ne" className="mt-3 text-lg text-stone-500">{menu.nameNe}</p>
      <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-stone-600">{menu.description}</p>
    </header>
    <nav aria-label="Menu categories" className="sticky top-0 z-10 -mx-5 flex gap-2 overflow-x-auto border-y border-stone-200 bg-[#faf8f2] px-5 py-3 sm:-mx-8 sm:px-8">
      {menu.categories.map((category, index) => <a key={category.name} href={`#category-${index}`} className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-xs font-medium hover:bg-stone-100">{category.name}</a>)}
    </nav>
    {menu.categories.map((category, index) => <section key={category.name} id={`category-${index}`} className="scroll-mt-24 pt-10">
      <h2 className="mb-2 font-serif text-3xl">{category.name}</h2>
      {category.items.map((item) => <article key={item.name} className="border-b border-stone-200 py-6">
        <div className="flex items-baseline justify-between gap-5">
          <h3 className="font-semibold">{item.name} {item.nameNe && <span lang="ne" className="ml-1 text-sm font-normal text-stone-500">{item.nameNe}</span>}</h3>
          {item.priceMinor !== undefined && <span className="shrink-0 text-sm font-medium">{formatPrice(item.priceMinor)}</span>}
        </div>
        <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">{item.description}</p>
        {item.variants && <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">{item.variants.map((variant) => <div key={variant.name} className="flex gap-3 text-sm"><dt className="text-stone-500">{variant.name}</dt><dd className="font-medium">{formatPrice(variant.priceMinor)}</dd></div>)}</dl>}
      </article>)}
    </section>)}
    <footer className="mt-10 text-center text-xs leading-6 text-stone-500">
      <p>Example tax setting: prices include 13% VAT. No service charge.</p>
      <p>Last updated: <time dateTime={menu.updatedAt}>16 October 2026</time></p>
      <Link href="/" className="mt-5 inline-block font-semibold text-stone-700">Made with QR Menu ↗</Link>
    </footer>
  </main>;
}

export default function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense fallback={<p className="p-10 text-center">Loading menu…</p>}><MenuContent params={params} /></Suspense>;
}
