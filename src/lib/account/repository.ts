import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DELETION_GRACE_DAYS } from "./constants";

const releasedSchema = z.array(z.object({ id: z.uuid(), slug: z.string() }));

export async function getAccountDeletion(userId: string) {
  const { data, error } = await (await createClient()).from("profiles")
    .select("deletion_requested_at").eq("id", userId).maybeSingle();
  if (error) throw new Error("Could not load account status");
  const requestedAt = data?.deletion_requested_at ? new Date(data.deletion_requested_at) : null;
  return requestedAt && { requestedAt, purgeAt: new Date(requestedAt.getTime() + DELETION_GRACE_DAYS * 86_400_000) };
}

export async function requestAccountDeletion() {
  const { data, error } = await (await createClient()).rpc("request_account_deletion");
  if (error) throw new Error("Could not schedule account deletion");
  return releasedSchema.parse(data);
}

export async function cancelAccountDeletion() {
  const { data, error } = await (await createClient()).rpc("cancel_account_deletion");
  if (error) throw new Error("Could not cancel account deletion");
  return z.number().parse(data);
}

export async function exportAccountData() {
  const { data, error } = await (await createClient()).rpc("export_account_data");
  if (error) throw new Error("Could not export account data");
  return data;
}
