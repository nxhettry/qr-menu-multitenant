import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { listAdminUsers } from "@/lib/admin/repository";
import { userListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { UsersList } from "@/components/admin/users-list";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Users({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const query = userListQuery.parse(await searchParams);
  const initialData = await listAdminUsers(query);
  return <>
    <PageTitle eyebrow="Accounts" title="Users." />
    <UsersList userId={admin.id} initialParams={query} initialData={initialData} />
  </>;
}

export default function AdminUsersPage(props: Props) {
  return <AdminPage><Users {...props} /></AdminPage>;
}
