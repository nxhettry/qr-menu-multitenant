import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthSkeleton } from "@/components/ui/page-skeletons";
import { safeConnectPath } from "@/lib/restrofuel/connect-link";

export const metadata: Metadata = {
  title: "Create a free QR menu for your restaurant — QR Menu",
  description: "Sign up free and publish a bilingual digital QR menu for your restaurant, café or momo shop in Nepal in minutes.",
  alternates: { canonical: "/register" },
};

async function RegisterContent({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={next ? safeConnectPath(next) ?? undefined : undefined} />;
}
export default function RegisterPage(props: { searchParams: Promise<{ next?: string }> }) {
  return <Suspense fallback={<AuthSkeleton />}><RegisterContent {...props} /></Suspense>;
}
