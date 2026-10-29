import type { ReactNode } from "react";
import { cardClass } from "@/components/ui/form";

export function DetailCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <section className={`${cardClass} p-5 sm:p-6`}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{action}</div>
    <div className="mt-4">{children}</div>
  </section>;
}

export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
    {items.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-ink-subtle">{label}</dt><dd className="mt-0.5 break-words font-medium">{value}</dd></div>)}
  </dl>;
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className={`${cardClass} p-5`}>
    <p className="text-sm text-ink-muted">{label}</p>
    <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    {detail && <p className="mt-1 text-xs text-ink-subtle">{detail}</p>}
  </div>;
}
