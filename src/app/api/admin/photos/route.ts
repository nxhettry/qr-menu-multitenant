import { listPhotoReviews } from "@/lib/admin/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { photoReviewListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listPhotoReviews(photoReviewListQuery.parse(searchParamsOf(request))));
}
