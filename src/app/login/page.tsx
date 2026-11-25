import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthSkeleton } from "@/components/ui/page-skeletons";
import { AuthForm } from "@/components/auth-form";
import { safeConnectPath } from "@/lib/restrofuel/connect-link";

export const metadata: Metadata = { title: "Sign in — QR Menu", robots: { index: false, follow: true } };

type LoginParams = { error?: string; next?: string };
async function LoginContent({ searchParams }: { searchParams: Promise<LoginParams> }) {
  const { error, next } = await searchParams;
  return <AuthForm mode="login" confirmationError={error === "confirmation"} next={next ? safeConnectPath(next) ?? undefined : undefined} />;
}
export default function LoginPage(props: { searchParams: Promise<LoginParams> }) {
  return <Suspense fallback={<AuthSkeleton />}><LoginContent {...props} /></Suspense>;
}
