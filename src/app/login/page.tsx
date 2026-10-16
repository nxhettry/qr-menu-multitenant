import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AuthForm mode="login" confirmationError={(await searchParams).error === "confirmation"} />;
}
export default function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  return <Suspense fallback={<p className="p-10">Loading sign in…</p>}><LoginContent {...props} /></Suspense>;
}
