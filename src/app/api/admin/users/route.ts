import { listAdminUsers } from "@/lib/admin/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { userListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listAdminUsers(userListQuery.parse(searchParamsOf(request))));
}
