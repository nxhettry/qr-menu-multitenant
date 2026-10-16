import Link from "next/link";
import { SWRProvider } from "@/components/swr-provider";
import { SetupStatus } from "@/components/setup-status";

export default function SetupPage() {
  return <main className="mx-auto max-w-2xl px-6 py-16">
    <Link href="/" className="text-sm text-stone-600">← QR Menu</Link>
    <p className="mt-12 text-sm font-semibold uppercase tracking-widest text-orange-700">Phase 1 · Accounts and restaurants</p>
    <h1 className="mt-4 text-4xl font-semibold tracking-tight">Your project starts here.</h1>
    <p className="mt-5 leading-7 text-stone-600">Sign-in and restaurant setup are prepared. Database activation and email configuration complete this phase. The full build sequence is in docs/BUILD-PLAN.md.</p>
    <div className="mt-8"><SWRProvider><SetupStatus /></SWRProvider></div>
    <p className="mt-6 text-sm leading-6 text-stone-600">Keep service settings in .env.local. See docs/PHASE-1-STATUS.md for database activation and verification details.</p>
    <Link href="/register" className="mt-6 inline-block font-medium text-orange-800 underline underline-offset-4">Create an owner account →</Link>
    <Link href="/momo-house" className="mt-8 inline-block font-medium text-orange-800 underline underline-offset-4">View the example menu →</Link>
  </main>;
}
