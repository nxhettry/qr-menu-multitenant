"use client";
import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { applySyncAction, disconnectAction, dismissSyncAction } from "@/app/dashboard/[restaurantId]/restrofuel/actions";
import type { MutationResult } from "@/lib/editor/schemas";
import type { SyncMode } from "@/lib/restrofuel/plan";
import type { SyncStatus } from "@/lib/restrofuel/status";

// A sync is started from RestroFuel, so an open dashboard checks for one now and then.
const STATUS_REFRESH_MS = 60_000;

export function useRestroFuelStatus(userId: string, restaurantId: string) {
  const { data } = useSWR<SyncStatus>([`/api/dashboard/restaurants/${restaurantId}/restrofuel`, userId, restaurantId], {
    refreshInterval: STATUS_REFRESH_MS,
  });
  return data;
}

export function useRestroFuelReview(restaurantId: string, snapshotId: string | null) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult>({});
  const run = useCallback((action: () => Promise<MutationResult>) => {
    setResult({});
    startTransition(async () => {
      try {
        const response = await action();
        if (response.error) return setResult(response);
        router.push(`/dashboard/${restaurantId}`);
        router.refresh();
      } catch {
        setResult({ error: "We couldn’t confirm this change. Refresh the page before trying again." });
      }
    });
  }, [restaurantId, router]);
  const apply = useCallback((mode: SyncMode, publish: boolean) => {
    if (snapshotId) run(() => applySyncAction(restaurantId, { snapshotId, mode, publish }));
  }, [run, restaurantId, snapshotId]);
  const dismiss = useCallback(() => {
    if (snapshotId) run(() => dismissSyncAction(restaurantId, snapshotId));
  }, [run, restaurantId, snapshotId]);
  const disconnect = useCallback(() => run(() => disconnectAction(restaurantId)), [run, restaurantId]);
  const clearResult = useCallback(() => setResult({}), []);
  return { pending, result, clearResult, apply, dismiss, disconnect };
}
