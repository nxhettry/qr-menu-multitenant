import { Suspense, type ReactNode } from "react";

const fallback = <p role="status" className="py-16 text-center text-sm text-ink-muted">Loading…</p>;

/** Request-time admin content streams behind Suspense so the portal chrome renders immediately. */
export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="pt-4 sm:pt-6"><Suspense fallback={fallback}>{children}</Suspense></div>;
}

