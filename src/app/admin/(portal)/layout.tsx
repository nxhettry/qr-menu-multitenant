import { AppHeader } from "@/components/ui/brand";
import { AdminNav } from "@/components/admin/admin-nav";
import { SWRProvider } from "@/components/swr-provider";
import { adminLogout } from "@/app/admin/actions";
import { SignOutForm } from "@/components/ui/submit-button";

export default function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
    <AppHeader logoHref="/admin"><span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">Admin</span><SignOutForm action={adminLogout} /></AppHeader>
    <AdminNav />
    <SWRProvider>{children}</SWRProvider>
  </main>;
}
