"use client";
import { useCallback, useState, useTransition } from "react";
import { useSWRConfig } from "swr";
import type { AdminActionState } from "@/lib/admin/schemas";

const isAdminKey = (key: unknown) => Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith("/api/admin/");

/** Runs an admin server action, then drops cached admin lists so they refetch with the change. */
export function useAdminAction() {
  const { mutate } = useSWRConfig();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionState>({});
  const run = useCallback((action: () => Promise<AdminActionState>) => {
    setResult({});
    startTransition(async () => {
      try {
        const response = await action();
        setResult(response);
        if (!response.error) await mutate(isAdminKey, undefined, { revalidate: false });
      } catch {
        setResult({ error: "We couldn’t confirm that change. Refresh the page to check." });
      }
    });
  }, [mutate]);
  return { pending, result, run };
}
