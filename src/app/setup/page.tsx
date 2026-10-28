import Link from "next/link";
import { SWRProvider } from "@/components/swr-provider";
import { SetupStatus } from "@/components/setup-status";
import { AppHeader, PageTitle } from "@/components/ui/brand";
import { linkClass } from "@/components/ui/form";

export default function SetupPage() {
  return <main className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
    <AppHeader />
    <div className="mt-10"><PageTitle eyebrow="Phase 1 · Accounts and restaurants" title="Your project starts here."><p>Sign-in and restaurant setup are prepared. Database activation and email configuration complete this phase. The full build sequence is in docs/BUILD-PLAN.md.</p></PageTitle></div>
    <div className="mt-8"><SWRProvider><SetupStatus /></SWRProvider></div>
    <p className="mt-6 text-sm leading-6 text-ink-muted">Keep service settings in .env.local. See docs/PHASE-1-STATUS.md for database activation and verification details.</p>
    <div className="mt-6 flex flex-col gap-3 text-sm"><Link href="/register" className={linkClass}>Create an owner account →</Link><Link href="/momo-house" className={linkClass}>View the example menu →</Link></div>
  </main>;
}
