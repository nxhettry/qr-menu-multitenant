import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getAccountDeletion } from "@/lib/account/repository";
import { DELETION_GRACE_DAYS } from "@/lib/account/constants";
import { cancelAccountDeletionAction } from "./actions";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { AppHeader, PageTitle } from "@/components/ui/brand";
import { StatusScreen } from "@/components/ui/status-screen";
import { SignOutForm, SubmitButton } from "@/components/ui/submit-button";
import { DashboardSkeleton } from "@/components/ui/page-skeletons";
import { cardClass, linkClass, noticeClass, primaryClass, secondaryClass } from "@/components/ui/form";
import { logout } from "@/app/auth/actions";
import { privateMetadata } from "@/lib/seo/site";

export const metadata = privateMetadata("Your account — QR Menu");

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

async function AccountContent() {
  const user = await requireUser();
  let deletion;
  try { deletion = await getAccountDeletion(user.id); }
  catch {
    return <StatusScreen title="Your account is taking a moment." body="We couldn’t load your account. Please try again shortly." action={<Link href="/dashboard/account" className={primaryClass}>Try again</Link>} />;
  }
  return <main className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
    <AppHeader logoHref="/dashboard"><Link href="/dashboard" className="rounded-full px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink">Your restaurants</Link><SignOutForm action={logout} /></AppHeader>
    <div className="mt-10"><PageTitle eyebrow="Account" title="Your account and data."><p className="text-sm">Signed in as {user.email}</p></PageTitle></div>
    <section className={`${cardClass} mt-8 space-y-4 p-5 sm:p-7`}>
      <h2 className="text-xl font-semibold tracking-tight">Download your data</h2>
      <p className="text-sm leading-6 text-ink-muted">A JSON file with your account details and every restaurant, category, item and variant you manage.</p>
      <a href="/api/dashboard/account/export" download className={secondaryClass}>Download my data</a>
    </section>
    <section className={`${cardClass} mt-6 space-y-4 p-5 sm:p-7`}>
      <h2 className="text-xl font-semibold tracking-tight">Delete account</h2>
      {deletion
        ? <>
          <p role="status" className={noticeClass("warning")}>Deletion is scheduled for {dateFormat.format(deletion.purgeAt)}. Your restaurants are hidden until then.</p>
          <p className="text-sm leading-6 text-ink-muted">If you cancel, your restaurants come back as drafts with a temporary menu address. Printed QR codes keep working, and you can choose a new address in settings.</p>
          <form action={cancelAccountDeletionAction}><SubmitButton pendingLabel="Cancelling…" className={primaryClass}>Cancel deletion</SubmitButton></form>
        </>
        : <DeleteAccountForm />}
    </section>
    <p className="mt-6 text-sm leading-6 text-ink-muted">Deletion removes data after {DELETION_GRACE_DAYS} days. Read how we handle it in our <Link href="/privacy" className={linkClass}>Privacy Policy</Link>.</p>
  </main>;
}

export default function AccountPage() {
  return <Suspense fallback={<DashboardSkeleton />}><AccountContent /></Suspense>;
}
