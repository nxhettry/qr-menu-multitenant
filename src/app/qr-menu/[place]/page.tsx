import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteNav } from "@/components/landing/site-chrome";
import { MenuIcon } from "@/components/menu/icon";
import { FaqList } from "@/components/landing/faq-list";
import { JsonLd } from "@/lib/seo/json-ld";
import { generalFaqs, faqJsonLd, type Faq } from "@/lib/seo/faq";
import { findPlace, places, type Place } from "@/lib/seo/places";
import { absoluteUrl, SITE_NAME } from "@/lib/seo/site";
import { breadcrumbJsonLd } from "@/lib/seo/structured-data";
import { eyebrowClass, primaryClass, secondaryClass } from "@/components/ui/form";

type Props = { params: Promise<{ place: string }> };

export function generateStaticParams() { return places.map(place => ({ place: place.slug })); }

const heading = (place: Place) => place.kind === "country" ? "Free QR menu for restaurants in Nepal" : `Free QR menu for restaurants in ${place.name}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const place = findPlace((await params).place);
  if (!place) return { robots: { index: false, follow: false } };
  const title = `${heading(place)} | ${SITE_NAME}`;
  const description = `Create a free digital QR code menu for your ${place.kind === "country" ? "Nepali" : place.name} restaurant or café. Bilingual English and नेपाली, instant price updates, no app for guests.`;
  const path = `/qr-menu/${place.slug}`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path, type: "website", locale: "en_NP", siteName: SITE_NAME }, twitter: { card: "summary_large_image", title, description } };
}

const benefits: [string, string][] = [
  ["Live in minutes", "Type your dishes in from your phone or import them from Excel, then publish. Guests see changes the moment you save."],
  ["English and नेपाली", "Show Nepali names and descriptions beside English so locals and visitors read the same menu."],
  ["QR codes that never expire", "Print your table QR once. Rename your restaurant later and the printed code keeps working."],
  ["Prices, VAT and sold-out in one tap", "Update Rs prices, set VAT and service charge, and mark a dish sold out without reprinting."],
];

export default async function PlacePage({ params }: Props) {
  const place = findPlace((await params).place);
  if (!place) notFound();
  const where = place.kind === "country" ? "Nepal" : place.name;
  const faqs: Faq[] = [
    { question: `Is there a free QR menu maker for restaurants in ${where}?`, answer: `Yes. ${SITE_NAME} is free for every ${where} restaurant, café and food stall, with no app for guests to install.` },
    { question: `Can I show my menu in Nepali and English in ${where}?`, answer: "Yes. Add Nepali names and descriptions beside the English ones and guests see both." },
    ...generalFaqs.slice(3, 6),
  ];
  const others = places.filter(other => other.slug !== place.slug && other.kind === "city").slice(0, 8);
  return <>
    <JsonLd data={[
      breadcrumbJsonLd([{ name: SITE_NAME, path: "/" }, { name: `QR menu in ${where}`, path: `/qr-menu/${place.slug}` }]),
      faqJsonLd(faqs),
      { "@context": "https://schema.org", "@type": "WebPage", name: heading(place), url: absoluteUrl(`/qr-menu/${place.slug}`), inLanguage: "en", about: { "@type": "SoftwareApplication", name: SITE_NAME, applicationCategory: "BusinessApplication", operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "NPR" } } },
    ]} />
    <SiteNav />
    <main className="overflow-x-clip">
      <section className="mx-auto max-w-4xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pt-20">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-subtle"><Link href="/" className="hover:text-ink">{SITE_NAME}</Link> <span aria-hidden="true">/</span> <span>{where}</span></nav>
        <p className={eyebrowClass}>QR menu · {where}</p>
        <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{heading(place)}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-ink-muted sm:text-lg sm:leading-8">{place.intro} Perfect for {place.venues}.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className={`${primaryClass} px-7`}>Create your free menu<MenuIcon name="arrow" className="h-4 w-4" /></Link>
          <Link href="/momo-house" className={`${secondaryClass} px-7 py-3`}>View example menu</Link>
        </div>
      </section>
      <section className="border-t border-line bg-surface-muted/50 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Why {where} restaurants choose {SITE_NAME}</h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">{benefits.map(([title, body]) => <li key={title} className="rounded-2xl border border-line bg-surface p-6 shadow-card"><h3 className="font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-muted">{body}</p></li>)}</ul>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Digital menus for every part of {where}</h2>
        <p className="mt-4 leading-7 text-ink-muted">Whether you run a place in {place.areas.slice(0, -1).join(", ")} or {place.areas.at(-1)}, your guests only need a phone camera. Your menu opens fast on mobile data and works in light and dark mode.</p>
        <h2 className="mt-12 text-2xl font-semibold tracking-tight sm:text-3xl">Frequently asked questions</h2>
        <FaqList faqs={faqs} className="mt-6" />
      </section>
      <section className="border-t border-line py-12">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-lg font-semibold">QR menus in other Nepali cities</h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">{[...(place.kind === "city" ? [places[0]] : []), ...others].map(other => <li key={other.slug}><Link href={`/qr-menu/${other.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand">{other.kind === "country" ? "All of Nepal" : other.name}</Link></li>)}</ul>
        </div>
      </section>
    </main>
    <SiteFooter />
  </>;
}
