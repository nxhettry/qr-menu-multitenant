import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPublicMenu } from "@/lib/menu/repository";
import { ReportMenuForm } from "@/components/report/report-menu-form";
import { PageTitle } from "@/components/ui/brand";
import { linkClass } from "@/components/ui/form";
import { privateMetadata } from "@/lib/seo/site";

export const metadata = privateMetadata("Report a menu — QR Menu");

async function ReportContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu || menu.status === "UNAVAILABLE") notFound();
  return <main className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
    <PageTitle eyebrow="Report" title={`Report ${menu.name}`}>
      <p>Tell us what’s wrong with this menu and our team will review it. Questions about prices or dishes should go to the restaurant.</p>
    </PageTitle>
    <div className="mt-8"><ReportMenuForm slug={slug} /></div>
    <p className="mt-8 text-sm"><Link href={`/${slug}`} className={linkClass}>← Back to the menu</Link></p>
  </main>;
}

export default function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  return <Suspense><ReportContent params={params} /></Suspense>;
}
