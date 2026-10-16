"use client";
import { useCallback, useState, useTransition } from "react";
import useSWR from "swr";
import { mutateEditorAction } from "@/app/dashboard/[restaurantId]/actions";
import type { EditorData } from "@/lib/editor/data";
import type { EditorMutation, MutationResult } from "@/lib/editor/schemas";

export function useMenuEditor(userId: string, restaurantId: string, initialData: EditorData) {
  const { data, error, mutate, isValidating } = useSWR<EditorData>(
    [`/api/dashboard/restaurants/${restaurantId}/menu`, userId, restaurantId], { fallbackData: initialData },
  );
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<MutationResult>({});
  const save = useCallback((input: EditorMutation, onSuccess?: () => void) => {
    setResult({});
    startTransition(async () => {
      try {
        const response = await mutateEditorAction(restaurantId, input);
        setResult(response);
        if (!response.error) {
          onSuccess?.();
          await mutate();
        }
      } catch {
        setResult({ error: "We couldn’t confirm the save. Refresh your menu before trying again." });
      }
    });
  }, [restaurantId, mutate]);
  return { data: error ? undefined : data, error, pending, result, setResult, save, refresh: mutate, isValidating };
}
