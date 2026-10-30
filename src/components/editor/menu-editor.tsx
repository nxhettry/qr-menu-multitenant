"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { EditorData } from "@/lib/editor/data";
import type { VatRule } from "@/lib/menu/vat";
import { useMenuEditor } from "@/hooks/use-menu-editor";
import { SettingsForm } from "./settings-form";
import { ImageUploader } from "./image-uploader";
import { darkClass, noticeClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { VatModeDialog } from "./vat-mode-dialog";
import { MenuDisplayForm } from "./menu-display-form";
import { MenuWorkspace } from "./menu-workspace";
import { ResultToast } from "./result-toast";
import { QrPanel } from "./qr-panel";

const BulkImport = dynamic(() => import("./bulk-import").then(module => module.BulkImport), { loading: () => <p role="status" className="text-sm text-ink-muted">Loading import tools…</p> });

export function MenuEditor({ userId, restaurantId, initialData, canEdit, canManage, siteOrigin }: {
  userId: string; restaurantId: string; initialData: EditorData; canEdit: boolean; canManage: boolean; siteOrigin: string;
}) {
  const { data, error, pending, result, setResult, save, changeVatMode, refresh, isValidating } = useMenuEditor(userId, restaurantId, initialData);
  const [tab, setTab] = useState<"menu" | "settings" | "import" | "display" | "qr">("menu");
  const tabsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const active = tabsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && tabsRef.current) tabsRef.current.scrollTo({ left: active.offsetLeft - 16, behavior: "smooth" });
  }, [tab]);
  const pricesIncludeVat = data?.restaurant.prices_include_vat ?? true;
  const vatPercent = data?.restaurant.vat_percent ?? 0;
  const vat = useMemo<VatRule>(() => ({ pricesIncludeVat, vatPercent }), [pricesIncludeVat, vatPercent]);
  const [vatTarget, setVatTarget] = useState<boolean | null>(null);
  const closeVatDialog = useCallback(() => setVatTarget(null), []);
  const openVatDialog = useCallback((toInclusive: boolean) => { setResult({}); setVatTarget(toInclusive); }, [setResult]);
  const [unpublishing, setUnpublishing] = useState(false);
  const closeUnpublish = useCallback(() => setUnpublishing(false), []);
  const openUnpublish = useCallback(() => { setResult({}); setUnpublishing(true); }, [setResult]);
  const clearResult = useCallback(() => setResult({}), [setResult]);
  const refreshImages = useCallback(() => refresh(), [refresh]);
  if (error || !data) return <div role="alert" className={`${noticeClass("danger")} mt-8`}><p>We couldn’t refresh this restaurant. Sign in again or try loading it again.</p><div className="mt-4 flex flex-wrap items-center gap-4"><button onClick={() => void refresh()} className={secondaryClass}>Try again</button><Link href="/dashboard" className="text-sm font-semibold underline">Your restaurants</Link></div></div>;
  const { restaurant, categories } = data;
  function image(kind: "logo" | "cover", publicId: string | null, version: number | null) {
    return <ImageUploader restaurantId={restaurantId} kind={kind} publicId={publicId} version={version}
      disabled={pending || !canManage} onSaved={refreshImages} onRemove={() => save({ operation: "removeImage", payload: { kind } })} />;
  }
  return <div className="mt-8 space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${restaurant.status === "PUBLISHED" ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted"}`}><span className={`h-1.5 w-1.5 rounded-full ${restaurant.status === "PUBLISHED" ? "bg-success" : "bg-ink-subtle"}`} />{restaurant.status}</span><h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{restaurant.name}</h1><p className="mt-1 text-sm text-ink-subtle">/{restaurant.slug}</p></div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/${restaurantId}/preview`} target="_blank" className={secondaryClass}>Phone preview ↗</Link>
        {restaurant.status === "PUBLISHED" && <Link href={`/${restaurant.slug}`} target="_blank" className={secondaryClass}>View live ↗</Link>}
        {restaurant.status === "PUBLISHED" && tab !== "qr" && <button onClick={() => setTab("qr")} className={secondaryClass}>Get QR code</button>}
        {canManage && <button disabled={pending} className={restaurant.status === "PUBLISHED" ? darkClass : primaryClass} onClick={() => restaurant.status === "PUBLISHED" ? openUnpublish() : save({ operation: "visibility", payload: { published: true } })}>{pending ? "Saving…" : restaurant.status === "PUBLISHED" ? "Unpublish" : "Publish menu"}</button>}
      </div>
    </header>
    {!canEdit && <p role="status" className={noticeClass("warning")}>Editing is currently locked. You can still view your saved menu.</p>}
    {restaurant.status === "PUBLISHED" && <p className="text-sm leading-6 text-ink-muted">Saved edits go live immediately. Preview your changes before sharing your menu.</p>}
    <ResultToast result={result} onDismiss={clearResult} />
    {vatTarget !== null && <VatModeDialog categories={categories} vatPercent={restaurant.vat_percent} toInclusive={vatTarget} pending={pending} error={result.error} onCancel={closeVatDialog}
      onConfirm={convertPrices => changeVatMode({ prices_include_vat: vatTarget, convert_prices: convertPrices }, closeVatDialog)} />}
    {unpublishing && <Dialog title="Unpublish this menu?" size="sm" onClose={closeUnpublish}>
      <p className="text-sm leading-6 text-ink-muted">Guests won’t see your menu. Your QR code will keep working and show an unavailable message until you publish again.</p>
      {result.error && <p role="alert" className="mt-3 text-sm text-danger">{result.error}</p>}
      <DialogFooter><button disabled={pending} className={darkClass} onClick={() => save({ operation: "visibility", payload: { published: false } }, closeUnpublish)}>{pending ? "Saving…" : "Unpublish menu"}</button><button disabled={pending} className={secondaryClass} onClick={closeUnpublish}>Cancel</button></DialogFooter>
    </Dialog>}
    <nav ref={tabsRef} aria-label="Restaurant workspace" className="relative -mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"><div className="flex w-max gap-1 rounded-full border border-line bg-surface-muted p-1">{([['menu', 'Menu'], ['import', 'Bulk import'], ['display', 'Menu display'], ['settings', 'Settings & images'], ['qr', 'QR code']] as const).map(([value, label]) => <button key={value} aria-current={tab === value ? "page" : undefined} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${tab === value ? "bg-surface text-ink shadow-card" : "text-ink-muted hover:text-ink"}`} onClick={() => setTab(value)}>{label}</button>)}</div></nav>
    {tab === "qr" ? <QrPanel restaurantId={restaurantId} slug={restaurant.slug} shortCode={restaurant.short_code} published={restaurant.status === "PUBLISHED"} siteOrigin={siteOrigin} /> : tab === "import" ? <BulkImport categories={categories} pending={pending} disabled={!canEdit} onImport={save} /> : tab === "display" ? <MenuDisplayForm key={`${restaurant.id}-${restaurant.hidden_fields.join(',')}`} initialHiddenFields={restaurant.hidden_fields} pending={pending} disabled={!canManage} onSave={hidden_fields => save({ operation: "displaySettings", payload: { hidden_fields } })} /> : tab === "settings" ? <div className="space-y-6">
      {!canManage && <p className="text-sm text-ink-muted">Only owners and managers can change restaurant settings.</p>}
      <SettingsForm key={restaurant.id} restaurant={restaurant} pending={pending} disabled={!canManage} onSave={payload => save({ operation: "settings", payload })} onChangeVatMode={openVatDialog} />
      <div className="grid gap-5 sm:grid-cols-2">{image("logo", restaurant.logo_public_id, restaurant.logo_version)}{image("cover", restaurant.cover_public_id, restaurant.cover_version)}</div>
    </div> : <MenuWorkspace restaurantId={restaurantId} categories={categories} vat={vat} canEdit={canEdit} pending={pending} result={result} save={save} clearResult={clearResult} refresh={refreshImages} />}
    <button disabled={isValidating || pending} onClick={() => void refresh()} className="py-3 text-sm font-medium text-ink-muted hover:text-ink disabled:opacity-50">{isValidating ? "Refreshing…" : "Refresh menu"}</button>
  </div>;
}
