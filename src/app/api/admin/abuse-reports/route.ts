import { listAbuseReports } from "@/lib/admin/repository";
import { adminJson, searchParamsOf } from "@/lib/admin/route";
import { abuseReportListQuery } from "@/lib/admin/schemas";

export function GET(request: Request) {
  return adminJson(() => listAbuseReports(abuseReportListQuery.parse(searchParamsOf(request))));
}
