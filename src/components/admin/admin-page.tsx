import { Suspense, type ReactNode } from "react";
import { AdminPageSkeleton } from "@/components/ui/page-skeletons";

const fallback = <AdminPageSkeleton />;

/** Request-time admin content streams behind Suspense so the portal chrome renders immediately. */
export function AdminPage({ children }: { children: ReactNode }) {
  return <div className="pt-4 sm:pt-6"><Suspense fallback={fallback}>{children}</Suspense></div>;
}

