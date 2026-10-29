import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/session";

export class AdminAccessError extends Error {
  constructor() { super("Not permitted"); }
}

// Admin status lives in private.super_admins and is checked on every request, never read from metadata.
export const getSuperAdmin = cache(async () => {
  const user = await getVerifiedUser();
  if (!user) return null;
  const { data, error } = await (await createClient()).rpc("is_super_admin");
  if (error) throw new Error("Could not verify admin access");
  return data === true ? user : null;
});

export async function requireSuperAdmin() {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function assertSuperAdmin() {
  const admin = await getSuperAdmin();
  if (!admin) throw new AdminAccessError();
  return admin;
}
