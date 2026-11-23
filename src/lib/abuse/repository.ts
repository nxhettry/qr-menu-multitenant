import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

export async function reportMenu(slug: string, input: { reason: string; details: string; contact: string }) {
  const { data, error } = await createServiceClient().rpc("report_menu", {
    p_slug: slug, p_reason: input.reason, p_details: input.details, p_contact: input.contact,
  });
  if (error) throw new Error("Could not save the report");
  return data === true;
}
