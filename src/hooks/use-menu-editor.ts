"use client";
import { useCallback, useState, useTransition } from "react";
import useSWR from "swr";
import { changeVatModeAction, mutateEditorAction } from "@/app/dashboard/[restaurantId]/actions";
import type { EditorData } from "@/lib/editor/data";
import type { EditorMutation, MutationResult, VatModeInput } from "@/lib/editor/schemas";

export function useMenuEditor(userId: string, restaurantId: string, initialData: EditorData) {
  const { data, error, mutate, isValidating } = useSWR<EditorData>(
    [`/api/dashboard/restaurants/${restaurantId}/menu`, userId, restaurantId], { fallbackData: initialData },
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult>({});
  const run = useCallback((action: () => Promise<MutationResult>, onSuccess?: () => void) => {
    setResult({});
    startTransition(async () => {
      try {
        const response = await action();
        setResult(response);
        if (!response.error) {
          onSuccess?.();
          await mutate();
        }
      } catch {
        setResult({ error: "We couldn’t confirm the save. Refresh your menu before trying again." });
      }
    });
  }, [mutate]);
  const save = useCallback((input: EditorMutation, onSuccess?: () => void) => run(() => mutateEditorAction(restaurantId, input), onSuccess), [run, restaurantId]);
  const changeVatMode = useCallback((input: VatModeInput, onSuccess?: () => void) => run(() => changeVatModeAction(restaurantId, input), onSuccess), [run, restaurantId]);
  return { data: error ? undefined : data, error, pending, result, setResult, save, changeVatMode, refresh: mutate, isValidating };
}
