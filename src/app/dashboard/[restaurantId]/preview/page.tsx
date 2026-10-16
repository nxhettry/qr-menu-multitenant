import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { getEditorData } from "@/lib/editor/repository";
import { previewMenu } from "@/lib/editor/preview";
import { PublicMenu } from "@/components/public-menu";

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
    <Link href={`/dashboard/${restaurantId}`} className="text-sm font-semibold underline">← Back to editing</Link>
    <h1 className="mt-5 font-serif text-2xl">Phone preview</h1><p className="mt-3 text-sm leading-6 text-stone-600">Only signed-in restaurant members can see this preview. It shows your saved menu with hidden categories omitted.</p>
    {unconfirmed && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Example prices still need your confirmation before publishing.</p>}
    <div className="mx-auto mt-6 max-w-[390px] overflow-hidden rounded-3xl border border-stone-300 shadow-sm"><PublicMenu menu={previewMenu(data)} /></div>
  </div>;
}

export default function PreviewPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  return <Suspense fallback={<p role="status" className="p-10 text-center">Loading preview…</p>}><PreviewContent params={params} /></Suspense>;
}
