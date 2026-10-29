import { listAdminRestaurants } from "@/lib/admin/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { restaurantListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listAdminRestaurants(restaurantListQuery.parse(searchParamsOf(request))));
}
