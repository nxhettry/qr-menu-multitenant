import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { preconnect } from "react-dom";
import { connection } from "next/server";
import { PublicMenu, UnavailableMenu } from "@/components/public-menu";
import { PublicMenuSkeleton } from "@/components/ui/page-skeletons";
import { DEMO_SLUG } from "@/lib/menu/demo";
import { getPublicMenu } from "@/lib/menu/repository";
import { resolveOldSlug } from "@/lib/menu/routing";
import { JsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME } from "@/lib/seo/site";
import { menuImageUrl, restaurantJsonLd } from "@/lib/seo/structured-data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return [{ slug: DEMO_SLUG }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu || menu.status === "UNAVAILABLE") {
    return { title: "Menu unavailable — QR Menu", robots: { index: false, follow: false } };
  }
  const title = `${menu.name} Menu & Prices${menu.address ? ` — ${menu.address}` : ""}`;
  const description = menu.description ?? `See the full menu, prices and specials at ${menu.name}${menu.address ? `, ${menu.address}` : ""}. Prices in NPR.`;
  const image = menuImageUrl(menu, 1280, 600);
  return {
    title, description, keywords: [`${menu.name} menu`, `${menu.name} price list`, ...(menu.address ? [`restaurants in ${menu.address}`] : []), "QR menu Nepal"],
    alternates: { canonical: `/${slug}` },
    openGraph: { type: "website", title, description, url: `/${slug}`, siteName: SITE_NAME, locale: "en_NP", ...(image ? { images: [{ url: image, width: 1280, height: 600, alt: menu.name }] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
    ...(slug === DEMO_SLUG ? { robots: { index: false, follow: false } } : {}),
  };
}

async function MenuContent({ params }: Props) {
  await connection();
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) {
    // Fallback for a proxy instance that has not yet seen a recent rename.
    const currentSlug = await resolveOldSlug(slug).catch(() => null);
    if (currentSlug) permanentRedirect(`/${currentSlug}`);
    notFound();
  }
  if (menu.status === "UNAVAILABLE") return <UnavailableMenu />;
  preconnect("https://res.cloudinary.com");
  return <>
    {slug !== DEMO_SLUG && <JsonLd data={restaurantJsonLd(menu)} />}
    <PublicMenu menu={menu} isDemo={slug === DEMO_SLUG} />
  </>;
}

export default function MenuPage({ params }: Props) {
  return <Suspense fallback={<PublicMenuSkeleton />}><MenuContent params={params} /></Suspense>;
}
