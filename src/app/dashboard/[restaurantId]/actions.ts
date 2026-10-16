"use server";
import { getTenantContext, TenantAccessError } from "@/lib/tenancy/context";
import { editorMutation, type MutationResult } from "@/lib/editor/schemas";
import { executeMenuMutation, MenuEditError, requiresManagement } from "@/lib/editor/repository";
import { invalidateMenu } from "@/lib/editor/invalidation";

export async function mutateEditorAction(restaurantId: string, input: unknown): Promise<MutationResult> {
  let receipt;
  try {
    const context = await getTenantContext(restaurantId);
    const parsed = editorMutation.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    receipt = await executeMenuMutation(context, parsed.data.operation, parsed.data.payload, requiresManagement(parsed.data));
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
