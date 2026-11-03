import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSkeleton } from "@/components/ui/page-skeletons";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in — QR Menu", robots: { index: false, follow: true } };

async function LoginContent({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return <AuthForm mode="login" confirmationError={(await searchParams).error === "confirmation"} />;
}
export default function LoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  return <Suspense fallback={<AuthSkeleton />}><LoginContent {...props} /></Suspense>;
}
