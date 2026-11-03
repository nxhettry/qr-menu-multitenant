"use client";
import { useCallback, useState, useTransition } from "react";
import useSWR from "swr";
import { changeVatModeAction, mutateEditorAction } from "@/app/dashboard/[restaurantId]/actions";
import type { EditorData } from "@/lib/editor/data";
import type { EditorMutation, ItemInput, MutationResult, VatModeInput } from "@/lib/editor/schemas";
import { uploadMenuImage } from "@/lib/editor/upload-image";

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
  const saveItem = useCallback((payload: ItemInput, photo: File | null, onSuccess?: () => void) => run(async () => {
    const response = await mutateEditorAction(restaurantId, { operation: "saveItem", payload });
    if (response.error || !photo || !response.id) return response;
    const upload = await uploadMenuImage(restaurantId, { kind: "item", itemId: response.id }, photo);
    return upload.error ? { ...response, warning: `The item is saved, but its photo wasn’t uploaded. ${upload.error} Add it from the item’s menu.` } : response;
  }, onSuccess), [run, restaurantId]);
  const changeVatMode = useCallback((input: VatModeInput, onSuccess?: () => void) => run(() => changeVatModeAction(restaurantId, input), onSuccess), [run, restaurantId]);
  return { data: error ? undefined : data, error, pending, result, setResult, save, saveItem, changeVatMode, refresh: mutate, isValidating };
}
