import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { listAbuseReports } from "@/lib/admin/repository";
import { abuseReportListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { AbuseReportsList } from "@/components/admin/abuse-reports-list";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Reports({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const query = abuseReportListQuery.parse(await searchParams);
  const initialData = await listAbuseReports(query);
  return <>
    <PageTitle eyebrow="Safety" title="Abuse reports." />
    <AbuseReportsList userId={admin.id} initialParams={{ q: "", page: query.page, status: query.status }} initialData={initialData} />
  </>;
}

export default function AdminReportsPage(props: Props) {
  return <AdminPage><Reports {...props} /></AdminPage>;
}
