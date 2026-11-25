import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getVerifiedUser } from "@/lib/auth/session";
import { listRestaurantsForUser } from "@/lib/tenancy/restaurants";
import { connectPath, parseConnectParams } from "@/lib/restrofuel/connect-link";
import { getSiteOrigin } from "@/lib/env/server";
import { privateMetadata } from "@/lib/seo/site";
import { AuthShell } from "@/components/ui/auth-shell";
import { AuthSkeleton } from "@/components/ui/page-skeletons";
import { StatusScreen } from "@/components/ui/status-screen";
import { SWRProvider } from "@/components/swr-provider";
import { ConnectOptions } from "@/components/restrofuel/connect-options";

export const metadata = privateMetadata("Connect RestroFuel — QR Menu");

type ConnectParams = { server?: string; code?: string };

async function ConnectContent({ searchParams }: { searchParams: Promise<ConnectParams> }) {
  await connection();
  const { server, code } = await searchParams;
  const link = parseConnectParams(server, code);
  if (!link) return <StatusScreen eyebrow="RestroFuel" title="This connect link isn’t valid." body="Open RestroFuel and choose Connect QR menu again. Each link works once, for ten minutes." />;
  const user = await getVerifiedUser();
  if (!user) redirect(`/login?${new URLSearchParams({ next: connectPath(link) })}`);
  const restaurants = await listRestaurantsForUser(user.id);
  return <AuthShell eyebrow="RestroFuel" title="Bring your RestroFuel menu."
    description={`We’ll copy the menu from ${new URL(link.server.url).host}. Nothing goes live until you review it.`}
    footer={<Link href="/dashboard" className="text-ink-muted hover:text-ink">← Your restaurants</Link>}>
    <SWRProvider key={user.id}>
      <ConnectOptions restaurants={restaurants} server={link.server.url} code={link.code} host={new URL(getSiteOrigin()).host} />
    </SWRProvider>
  </AuthShell>;
}

export default function ConnectRestroFuelPage(props: { searchParams: Promise<ConnectParams> }) {
  return <Suspense fallback={<AuthSkeleton />}><ConnectContent {...props} /></Suspense>;
}
