import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { RestaurantForm } from "@/components/restaurant-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { logout } from "@/app/auth/actions";

async function OnboardingContent() {
  await requireUser();
  return <AuthShell eyebrow="Make it yours" title="Welcome your restaurant." description="Start with a name and an address. Your restaurant stays private until its menu is ready to publish."
    footer={<div className="flex justify-between text-ink-muted"><Link href="/dashboard" className="hover:text-ink">← Back to dashboard</Link><form action={logout}><button className="hover:text-ink">Sign out</button></form></div>}>
    <RestaurantForm />
  </AuthShell>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<p role="status" className="p-10 text-center text-sm text-ink-muted">Loading restaurant setup…</p>}><OnboardingContent /></Suspense>;
}
