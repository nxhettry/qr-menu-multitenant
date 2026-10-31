import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { listAdminDishes } from "@/lib/dishes/repository";
import { dishListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { DishTabs } from "@/components/admin/dish-tabs";
import { DishesList } from "@/components/admin/dishes-list";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Dishes({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const query = dishListQuery.parse(await searchParams);
  const initialData = await listAdminDishes(query);
  return <>
    <PageTitle eyebrow="Catalog" title="Dishes." />
    <DishTabs active="/admin/dishes" />
    <DishesList userId={admin.id} initialParams={query} initialData={initialData} />
  </>;
}

export default function AdminDishesPage(props: Props) {
  return <AdminPage><Dishes {...props} /></AdminPage>;
}
