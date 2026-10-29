import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { eventListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { ActivityFeed } from "@/components/admin/activity-feed";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Activity({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const { restaurantId } = eventListQuery.parse(await searchParams);
  return <>
    <PageTitle eyebrow="Audit trail" title="Activity.">{restaurantId && <p>Showing one restaurant’s activity.</p>}</PageTitle>
    <ActivityFeed key={restaurantId ?? "all"} userId={admin.id} restaurantId={restaurantId} />
  </>;
}

export default function AdminActivityPage(props: Props) {
  return <AdminPage><Activity {...props} /></AdminPage>;
}
