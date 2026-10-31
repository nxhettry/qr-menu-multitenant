import { listAdminDishes } from "@/lib/dishes/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { dishListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listAdminDishes(dishListQuery.parse(searchParamsOf(request))));
}
