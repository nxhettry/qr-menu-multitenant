import { listAdminEvents } from "@/lib/admin/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { eventListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listAdminEvents(eventListQuery.parse(searchParamsOf(request))));
}
