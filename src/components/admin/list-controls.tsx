"use client";
import { MenuIcon } from "@/components/menu/icon";
import { secondaryClass } from "@/components/ui/form";

export function SearchField({ label, value, onChange, busy }: { label: string; value: string; onChange: (value: string) => void; busy: boolean }) {
  return <label className="relative block flex-1">
    <span className="sr-only">{label}</span>
    <MenuIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
    <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={label} maxLength={100} autoComplete="off"
      className="block min-h-12 w-full rounded-full border border-line-strong bg-surface pl-11 pr-11 text-base text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15" />
    {busy && <span role="status" aria-label="Loading" className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line-strong border-t-brand" />}
  </label>;
}

export function Pagination({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (page: number) => void }) {
  return <div className="mt-5 flex items-center justify-between gap-3 text-sm text-ink-muted">
    <p aria-live="polite">{total} result{total === 1 ? "" : "s"} · Page {Math.min(page, pageCount)} of {pageCount}</p>
    <div className="flex gap-2">
      <button type="button" className={secondaryClass} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><MenuIcon name="back" className="h-4 w-4" /></button>
      <button type="button" className={secondaryClass} disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page"><MenuIcon name="arrow" className="h-4 w-4" /></button>
    </div>
  </div>;
}

export function ListError({ onRetry }: { onRetry: () => void }) {
  return <p role="alert" className="mt-5 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-danger">
    We couldn’t load this list. <button type="button" className="font-semibold underline" onClick={onRetry}>Try again</button>
  </p>;
}
