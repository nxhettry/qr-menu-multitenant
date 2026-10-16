import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PublicMenu, UnavailableMenu } from "@/components/public-menu";
import { DEMO_SLUG } from "@/lib/menu/demo";
import { getPublicMenu } from "@/lib/menu/repository";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return [{ slug: DEMO_SLUG }]; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu || menu.status === "UNAVAILABLE") {
    return { title: "Menu unavailable — QR Menu", robots: { index: false, follow: false } };
  }
  return {
    title: `${menu.name} — Menu`,
    description: menu.description ?? `Explore the menu at ${menu.name}. Prices in NPR.`,
    ...(slug === DEMO_SLUG ? { robots: { index: false, follow: false } } : {}),
  };
}

async function MenuContent({ params }: Props) {
  await connection();
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  if (menu.status === "UNAVAILABLE") return <UnavailableMenu />;
  return <PublicMenu menu={menu} isDemo={slug === DEMO_SLUG} />;
}

export default function MenuPage({ params }: Props) {
  return <Suspense fallback={<p role="status" className="p-10 text-center">Loading menu…</p>}><MenuContent params={params} /></Suspense>;
}
