const tones = {
  PUBLISHED: "bg-success-soft text-success", DRAFT: "bg-surface-muted text-ink-muted", SUSPENDED: "bg-danger-soft text-danger",
  BANNED: "bg-danger-soft text-danger", ADMIN: "bg-brand-soft text-brand", UNVERIFIED: "bg-warning-soft text-warning",
} as const;
const dots = {
  PUBLISHED: "bg-success", DRAFT: "bg-ink-subtle", SUSPENDED: "bg-danger", BANNED: "bg-danger", ADMIN: "bg-brand", UNVERIFIED: "bg-warning",
} as const;
export type BadgeTone = keyof typeof tones;

export function StatusBadge({ tone, label = tone }: { tone: BadgeTone; label?: string }) {
  return <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${tones[tone]}`}>
    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dots[tone]}`} />{label}
  </span>;
}
