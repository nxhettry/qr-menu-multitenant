"use client";
import { useState } from "react";
import useSWR from "swr";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { AdminDishRow } from "@/lib/dishes/schemas";
import type { AdminPage } from "@/lib/admin/schemas";
import { SearchField } from "./list-controls";

/** Search-as-you-type chooser over the admin catalog. */
export function DishPicker({ userId, excludeId, onPick }: { userId: string; excludeId?: string; onPick: (dish: AdminDishRow) => void }) {
  const [text, setText] = useState("");
  const q = useDebouncedValue(text.trim(), 300);
  const { data, isValidating } = useSWR<AdminPage<AdminDishRow>>([`/api/admin/dishes?q=${encodeURIComponent(q)}`, userId], { keepPreviousData: true, revalidateOnFocus: false });
  const rows = data?.rows.filter(row => row.id !== excludeId) ?? [];
  return <div>
    <SearchField label="Search dishes" value={text} onChange={setText} busy={isValidating || text.trim() !== q} />
    <ul className="mt-3 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line" aria-label="Matching dishes">
      {rows.map(row => <li key={row.id}><button type="button" onClick={() => onPick(row)} className="flex min-h-12 w-full flex-col justify-center px-4 py-2 text-left text-sm hover:bg-surface-muted">
        <span className="font-medium">{row.name}</span><span className="text-xs text-ink-muted">{[row.category, row.nameNe].filter(Boolean).join(" · ")}</span>
      </button></li>)}
      {!rows.length && <li className="px-4 py-6 text-center text-sm text-ink-muted">{data ? "No dishes match." : "Loading…"}</li>}
    </ul>
  </div>;
}
