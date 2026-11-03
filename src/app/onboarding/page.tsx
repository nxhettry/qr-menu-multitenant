import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { RestaurantForm } from "@/components/restaurant-form";
import { AuthShell } from "@/components/ui/auth-shell";
import { SWRProvider } from "@/components/swr-provider";
import { getSiteOrigin } from "@/lib/env/server";
import { logout } from "@/app/auth/actions";
import { AuthSkeleton } from "@/components/ui/page-skeletons";
import { SignOutForm } from "@/components/ui/submit-button";
import { privateMetadata } from "@/lib/seo/site";

export const metadata = privateMetadata("Add your restaurant — QR Menu");

async function OnboardingContent() {
  const user = await requireUser();
  return <AuthShell eyebrow="Make it yours" title="Welcome your restaurant." description="Start with a name and an address. Your restaurant stays private until its menu is ready to publish."
    footer={<div className="flex justify-between text-ink-muted"><Link href="/dashboard" className="hover:text-ink">← Back to dashboard</Link><SignOutForm action={logout} className="hover:text-ink" /></div>}>
    <SWRProvider key={user.id}><RestaurantForm host={new URL(getSiteOrigin()).host} /></SWRProvider>
  </AuthShell>;
}
export default function OnboardingPage() {
  return <Suspense fallback={<AuthSkeleton />}><OnboardingContent /></Suspense>;
}
