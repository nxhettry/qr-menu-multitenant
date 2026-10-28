import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getEditorData } from "@/lib/editor/repository";
import { getSiteOrigin } from "@/lib/env/server";
import { menuQrUrl, qrSvg } from "@/lib/menu/qr";
import { accessibleAccent } from "@/lib/menu/presentation";
import { QrPrintSheet, type PrintLayout } from "@/components/print/qr-print-sheet";
import { PrintButton } from "@/components/print/print-button";
import { linkClass } from "@/components/ui/form";

export const metadata = { title: "Print QR code — QR Menu", robots: { index: false, follow: false } };

type Props = { params: Promise<{ restaurantId: string }>; searchParams: Promise<{ layout?: string }> };
const layouts: [PrintLayout, string][] = [["cards", "Table cards · 4 per A4"], ["poster", "Poster · A4"]];

async function PrintContent({ params, searchParams }: Props) {
  await connection();
  await requireUser();
  const { restaurantId } = await params;
  const layout: PrintLayout = (await searchParams).layout === "poster" ? "poster" : "cards";
  let context;
  try { context = await getTenantContext(restaurantId); }
  catch (error) { if (error instanceof TenantAccessError && error.status === 404) notFound(); throw error; }
  const { restaurant } = await getEditorData(context);
  const shortUrl = menuQrUrl(getSiteOrigin(), restaurant.short_code);
  return <main className="mx-auto w-full max-w-4xl px-4 py-6 print:p-0">
    <div className="mb-6 space-y-4 print:hidden">
      <Link href={`/dashboard/${restaurantId}`} className={`${linkClass} text-sm`}>← Back to editing</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Print layout" className="flex gap-1 rounded-full border border-line bg-surface-muted p-1">
          {layouts.map(([value, label]) => <Link key={value} href={`?layout=${value}`} aria-current={layout === value ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium ${layout === value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"}`}>{label}</Link>)}
        </nav>
        <PrintButton />
      </div>
      <p className="text-sm leading-6 text-ink-muted">Print on A4 at 100% scale (turn off “fit to page”). Test-scan one printed copy before printing more.</p>
    </div>
    <QrPrintSheet layout={layout} name={restaurant.name} nameNe={restaurant.hidden_fields.includes("nepali") ? null : restaurant.name_ne}
      accent={accessibleAccent(restaurant.theme_color)} qrMarkup={await qrSvg(shortUrl)} shortUrl={shortUrl}
      logoPublicId={restaurant.logo_public_id} logoVersion={restaurant.logo_version} />
  </main>;
}

export default function PrintPage(props: Props) {
  return <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-ink-muted">Preparing your QR code…</p>}><PrintContent {...props} /></Suspense>;
}
