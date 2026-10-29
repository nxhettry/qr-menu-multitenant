import { connection } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/session";
import { AdminPage } from "@/components/admin/admin-page";
import { PageTitle } from "@/components/ui/brand";
import { DetailCard } from "@/components/admin/detail";
import { OwnPasswordForm } from "@/components/admin/own-password-form";

async function Account() {
  await connection();
  const admin = await requireSuperAdmin();
  return <>
    <PageTitle eyebrow="Your account" title="Account."><p>Signed in as {admin.email}</p></PageTitle>
    <div className="mt-8 max-w-lg"><DetailCard title="Change password"><OwnPasswordForm /></DetailCard></div>
  </>;
}

export default function AdminAccountPage() {
  return <AdminPage><Account /></AdminPage>;
}
