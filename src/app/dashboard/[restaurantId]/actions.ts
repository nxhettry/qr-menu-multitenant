"use server";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { editorMutation, vatModeInput, type MutationResult } from "@/lib/editor/schemas";
import { changeVatMode, executeMenuMutation, MenuEditError, requiresManagement } from "@/lib/editor/repository";
import { invalidateMenu } from "@/lib/editor/invalidation";

type Receipt = Awaited<ReturnType<typeof executeMenuMutation>>;

async function commitAndInvalidate(restaurantId: string, commit: () => Promise<Receipt | { error: string }>): Promise<MutationResult> {
  let receipt: Receipt;
  try {
    const outcome = await commit();
    if ("error" in outcome) return { error: outcome.error };
    receipt = outcome;
  } catch (error) {
    if (error instanceof MenuEditError || error instanceof TenantAccessError) return { error: error.message };
    console.error("Menu save could not be completed");
    return { error: "We couldn’t save your menu. Please refresh and try again." };
  }
  try { invalidateMenu(restaurantId, receipt); }
  catch {
    console.error("Committed menu change needs cache refresh", { restaurantId });
    return { message: "Saved.", warning: "Your change is saved, but the public menu refresh is delayed. Please check it again shortly." };
  }
  return { message: "Saved." };
}

export async function mutateEditorAction(restaurantId: string, input: unknown): Promise<MutationResult> {
  return commitAndInvalidate(restaurantId, async () => {
    const context = await getTenantContext(restaurantId);
    const parsed = editorMutation.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    return executeMenuMutation(context, parsed.data.operation, parsed.data.payload, requiresManagement(parsed.data));
  });
}

export async function changeVatModeAction(restaurantId: string, input: unknown): Promise<MutationResult> {
  return commitAndInvalidate(restaurantId, async () => {
    const context = await getTenantContext(restaurantId);
    const parsed = vatModeInput.safeParse(input);
    if (!parsed.success) return { error: "Choose how to change your VAT setting." };
    return changeVatMode(context, parsed.data);
  });
}
