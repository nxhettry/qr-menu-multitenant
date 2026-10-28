import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getEditorData } from "@/lib/editor/repository";
import { previewMenu } from "@/lib/editor/preview";
import { PublicMenu } from "@/components/public-menu";
import { linkClass, noticeClass } from "@/components/ui/form";

export const metadata = { title: "Private menu preview — QR Menu", robots: { index: false, follow: false } };

async function PreviewContent({ params }: { params: Promise<{ restaurantId: string }> }) {
  await connection();
  await requireUser();
  const { restaurantId } = await params;
  let context;
  try { context = await getTenantContext(restaurantId); }
  catch (error) { if (error instanceof TenantAccessError && error.status === 404) notFound(); throw error; }
  const data = await getEditorData(context);
  const unconfirmed = data.categories.some(category => category.items.some(item => item.is_example_price));
  return <div className="mx-auto w-full max-w-lg px-4 py-8">
    <Link href={`/dashboard/${restaurantId}`} className={`${linkClass} text-sm`}>← Back to editing</Link>
    <h1 className="mt-5 text-2xl font-semibold tracking-tight">Phone preview</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Only signed-in restaurant members can see this preview. It shows your saved menu with hidden categories omitted.</p>
    {unconfirmed && <p role="status" className={`${noticeClass("warning")} mt-4`}>Example prices still need your confirmation before publishing.</p>}
    <div className="mx-auto mt-6 max-w-[390px] overflow-hidden rounded-[40px] border-[10px] border-stone-900 bg-canvas shadow-lift"><PublicMenu menu={previewMenu(data)} /></div>
  </div>;
}

export default function PreviewPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  return <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-ink-muted">Loading preview…</p>}><PreviewContent params={params} /></Suspense>;
}
