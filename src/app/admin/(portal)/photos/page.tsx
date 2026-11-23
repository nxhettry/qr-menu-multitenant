import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { listPhotoReviews } from "@/lib/admin/repository";
import { photoReviewListQuery } from "@/lib/admin/schemas";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { PhotoReviewList } from "@/components/admin/photo-review-list";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Photos({ searchParams }: Props) {
  await connection();
  const admin = await requireSuperAdmin();
  const query = photoReviewListQuery.parse(await searchParams);
  const initialData = await listPhotoReviews(query);
  return <>
    <PageTitle eyebrow="Library" title="Shared photos." />
    <PhotoReviewList userId={admin.id} initialParams={{ q: "", page: query.page, status: query.status }} initialData={initialData} />
  </>;
}

export default function AdminPhotosPage(props: Props) {
  return <AdminPage><Photos {...props} /></AdminPage>;
}
