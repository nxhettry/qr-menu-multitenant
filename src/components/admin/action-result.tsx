import type { AdminActionState } from "@/lib/admin/schemas";
import { FormError, noticeClass } from "@/components/ui/form";

export function ActionResult({ result }: { result: AdminActionState }) {
  return <>
    <FormError message={result.error} />
    {result.message && <p role="status" className={noticeClass("success")}>{result.message}</p>}
  </>;
}
