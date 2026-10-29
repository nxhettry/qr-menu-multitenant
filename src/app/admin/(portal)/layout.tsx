import { AppHeader } from "@/components/ui/brand";
import { AdminNav } from "@/components/admin/admin-nav";
import { SWRProvider } from "@/components/swr-provider";
import { adminLogout } from "@/app/admin/actions";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
    <AppHeader logoHref="/admin"><span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">Admin</span><form action={adminLogout}><button className="rounded-full px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">Sign out</button></form></AppHeader>
    <AdminNav />
    <SWRProvider>{children}</SWRProvider>
  </main>;
}
