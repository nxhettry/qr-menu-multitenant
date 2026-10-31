import Link from "next/link";

const tabs = [["/admin/dishes", "Catalog"], ["/admin/dishes/review", "Needs review"]] as const;

export function DishTabs({ active }: { active: (typeof tabs)[number][0] }) {
  return <nav aria-label="Dish catalog" className="mt-6 flex gap-1">
    {tabs.map(([href, label]) => <Link key={href} href={href} aria-current={href === active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${href === active ? "bg-ink text-canvas" : "bg-surface-muted text-ink-muted hover:text-ink"}`}>{label}</Link>)}
  </nav>;
}
