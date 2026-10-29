import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { listAdminRestaurants } from "@/lib/admin/repository";
import { restaurantListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { AdminRestaurantsList } from "@/components/admin/restaurants-list";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Restaurants({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const query = restaurantListQuery.parse(await searchParams);
  const initialData = await listAdminRestaurants(query);
  return <>
    <PageTitle eyebrow="Tenants" title="Restaurants." />
    <AdminRestaurantsList userId={admin.id} initialParams={query} initialData={initialData} />
  </>;
}

export default function AdminRestaurantsPage(props: Props) {
  return <AdminPage><Restaurants {...props} /></AdminPage>;
}
