"use client";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cardClass, eyebrowClass, noticeClass, primaryClass, secondaryClass } from "@/components/ui/form";

function LinkRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div>
    <p className="text-xs font-medium text-ink-subtle">{label}</p>
    <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-surface-muted py-1.5 pl-3 pr-1.5">
      <a href={value} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:underline">{value.replace(/^https?:\/\//, "")}</a>
      <button type="button" onClick={onCopy} aria-label={`Copy ${label.toLowerCase()}`} className="min-h-9 shrink-0 rounded-lg bg-surface px-3 text-xs font-semibold text-ink shadow-card hover:bg-canvas">{copied ? "Copied" : "Copy"}</button>
    </div>
  </div>;
}

export function QrPanel({ restaurantId, slug, shortCode, published, siteOrigin }: {
  restaurantId: string; slug: string; shortCode: string; published: boolean; siteOrigin: string;
}) {
  const { copied, copy } = useCopyToClipboard();
  const qrUrl = `${siteOrigin}/q/${shortCode}`;
  const menuUrl = `${siteOrigin}/${slug}`;
  const image = `/api/dashboard/restaurants/${restaurantId}/qr`;
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(siteOrigin);
  return <section aria-label="QR code" className={`${cardClass} space-y-6 p-5 sm:p-7`}>
    <div>
      <p className={eyebrowClass}>Share your menu</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your QR code</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">Guests scan this code to open your menu. It uses a permanent short link, so printed codes keep working even if you rename your restaurant or change its address.</p>
    </div>
    {!published && <p className={noticeClass("warning")}>Your menu isn’t published yet. Guests who scan now will see an “unavailable” message, so publish before you print.</p>}
    {localOrigin && <p className={noticeClass("danger")}>This QR points to {siteOrigin}, a development address that phones can’t open. Set NEXT_PUBLIC_SITE_URL to your live domain before printing.</p>}
    <div className="grid gap-6 sm:grid-cols-[220px_1fr] sm:items-start">
      <div className="mx-auto w-full max-w-[240px] rounded-2xl border border-line bg-white p-3 shadow-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- private, uncached SVG from an authenticated route */}
        <img src={image} alt={`QR code linking to ${qrUrl}`} width={216} height={216} className="aspect-square w-full" />
      </div>
      <div className="space-y-5">
        <LinkRow label="QR short link" value={qrUrl} copied={copied === qrUrl} onCopy={() => void copy(qrUrl)} />
        <LinkRow label="Menu address" value={menuUrl} copied={copied === menuUrl} onCopy={() => void copy(menuUrl)} />
        <div>
          <p className="text-xs font-medium text-ink-subtle">Download</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`${image}?format=png&download=1`} download className={secondaryClass}>PNG image ↓</a>
            <a href={`${image}?format=svg&download=1`} download className={secondaryClass}>SVG for printers ↓</a>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-ink-subtle">Print</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`/dashboard/${restaurantId}/print?layout=cards`} target="_blank" className={primaryClass}>Table cards · 4 per A4</a>
            <a href={`/dashboard/${restaurantId}/print?layout=poster`} target="_blank" className={secondaryClass}>Poster · A4</a>
          </div>
        </div>
      </div>
    </div>
    <p role="status" aria-live="polite" className="sr-only">{copied ? "Link copied" : ""}</p>
  </section>;
}
