import { listDishCandidates } from "@/lib/dishes/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { userListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listDishCandidates(userListQuery.parse(searchParamsOf(request))));
}
