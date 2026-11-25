import { memo, type ReactNode } from "react";
import { formatPrice } from "@/lib/menu/presentation";
import type { SyncReview } from "@/lib/restrofuel/status";

type Summary = NonNullable<SyncReview["pending"]>["summary"];

const fieldLabels: Record<string, string> = {
  name: "Name", description: "Description", price_minor: "Price", diet: "Veg label",
  is_available: "Availability", categoryRef: "Category", addons: "Add-ons",
};

function formatValue(field: string, value: unknown, categories: Map<string, string>) {
  if (field === "price_minor" && typeof value === "number") return formatPrice(value);
  if (field === "is_available") return value ? "Available" : "Sold out";
  if (field === "diet") return value === "VEG" ? "Veg" : "No label";
  if (field === "addons") return Array.isArray(value) && value.length ? `${value.length} add-on${value.length === 1 ? "" : "s"}` : "None";
  if (field === "categoryRef") return categories.get(String(value)) ?? "Another category";
  return typeof value === "string" && value ? value : "None";
}

function Group({ title, count, open = false, children }: { title: string; count: number; open?: boolean; children: ReactNode }) {
  if (!count) return null;
  return <details open={open} className="group rounded-2xl border border-line bg-surface">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
      <span>{title} <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-ink-muted">{count}</span></span>
      <span aria-hidden="true" className="text-ink-subtle transition-transform group-open:rotate-180">⌄</span>
    </summary>
    <ul className="divide-y divide-line border-t border-line">{children}</ul>
  </details>;
}

const rowClass = "px-4 py-3 text-sm leading-6";

export const SyncSummary = memo(function SyncSummary({ summary, categories }: { summary: Summary; categories: Map<string, string> }) {
  return <div className="space-y-3">
    <Group title="New items" count={summary.added.length} open>
      {summary.added.map(item => <li key={item.ref} className={`${rowClass} flex items-baseline justify-between gap-3`}>
        <span className="min-w-0"><span className="block break-words font-medium">{item.name}</span><span className="block text-xs text-ink-subtle">{item.category}</span></span>
        <span className="shrink-0 tabular-nums text-ink-muted">{formatPrice(item.price_minor)}</span>
      </li>)}
    </Group>
    <Group title="Changed in RestroFuel" count={summary.changed.length} open>
      {summary.changed.map(item => <li key={item.ref} className={rowClass}>
        <span className="block break-words font-medium">{item.name}</span>
        <ul className="mt-1 space-y-0.5 text-ink-muted">{item.fields.map(change => <li key={change.field}>
          {fieldLabels[change.field] ?? change.field}: <s className="text-ink-subtle">{formatValue(change.field, change.from, categories)}</s> → <span className="text-ink">{formatValue(change.field, change.to, categories)}</span>
        </li>)}</ul>
      </li>)}
    </Group>
    <Group title="Removed in RestroFuel (will be hidden)" count={summary.removed.length}>
      {summary.removed.map(item => <li key={item.ref} className={`${rowClass} break-words`}>{item.name}</li>)}
    </Group>
    <Group title="Back in RestroFuel (will be shown again)" count={summary.restored.length}>
      {summary.restored.map(item => <li key={item.ref} className={`${rowClass} break-words`}>{item.name}</li>)}
    </Group>
    <Group title="Renamed categories" count={summary.renamedCategories.length}>
      {summary.renamedCategories.map(category => <li key={`${category.from}→${category.to}`} className={`${rowClass} break-words`}><s className="text-ink-subtle">{category.from}</s> → {category.to}</li>)}
    </Group>
  </div>;
});
