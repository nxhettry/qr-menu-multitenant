import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { listDishCandidates } from "@/lib/dishes/repository";
import { userListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { DishTabs } from "@/components/admin/dish-tabs";
import { DishCandidatesList } from "@/components/admin/dish-candidates-list";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Review({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const query = userListQuery.parse(await searchParams);
  const initialData = await listDishCandidates(query);
  return <>
    <PageTitle eyebrow="Catalog" title="Dishes." />
    <DishTabs active="/admin/dishes/review" />
    <DishCandidatesList userId={admin.id} initialParams={query} initialData={initialData} />
  </>;
}

export default function AdminDishReviewPage(props: Props) {
  return <AdminPage><Review {...props} /></AdminPage>;
}
