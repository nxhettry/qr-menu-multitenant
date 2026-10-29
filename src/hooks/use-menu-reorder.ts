"use client";
import { useCallback, type DragEvent } from "react";
import type { EditorCategory } from "@/lib/editor/data";
import type { EditorMutation } from "@/lib/editor/schemas";

type Kind = "category" | "item";
const dragType = "application/x-qrmenu-order";

function swapIds(entries: { id: string }[], index: number, offset: number) {
  const ids = entries.map(entry => entry.id);
  [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
  return ids;
}

export function useMenuReorder(categories: EditorCategory[], save: (input: EditorMutation) => void, disabled: boolean) {
  const moveItem = useCallback((category: EditorCategory, index: number, offset: number) => {
    if (!category.items[index + offset]) return;
    save({ operation: "reorder", payload: { kind: "item", ids: swapIds(category.items, index, offset), category_id: category.id } });
  }, [save]);

  const moveCategory = useCallback((category: EditorCategory, offset: number) => {
    const siblings = categories.filter(entry => entry.parent_id === category.parent_id);
    const neighbor = siblings[siblings.findIndex(entry => entry.id === category.id) + offset];
    if (!neighbor) return;
    const ids = categories.map(entry => entry.id === category.id ? neighbor.id : entry.id === neighbor.id ? category.id : entry.id);
    save({ operation: "reorder", payload: { kind: "category", ids } });
  }, [categories, save]);

  const dragStart = useCallback((event: DragEvent, kind: Kind, id: string, groupId?: string) => {
    event.dataTransfer.setData(dragType, JSON.stringify({ kind, id, groupId }));
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const dragOver = useCallback((event: DragEvent) => {
    if (event.dataTransfer.types.includes(dragType)) event.preventDefault();
  }, []);

  const drop = useCallback((event: DragEvent, kind: Kind, targetId: string, groupId?: string) => {
    if (!event.dataTransfer.types.includes(dragType) || disabled) return;
    event.preventDefault(); event.stopPropagation();
    try {
      const source = JSON.parse(event.dataTransfer.getData(dragType));
      if (source.kind !== kind || source.groupId !== groupId) return;
      const entries = kind === "item" ? categories.find(category => category.id === groupId)?.items ?? [] : categories;
      const from = entries.findIndex(entry => entry.id === source.id);
      const to = entries.findIndex(entry => entry.id === targetId);
      if (from < 0 || to < 0 || from === to) return;
      const ids = entries.map(entry => entry.id);
      const [moved] = ids.splice(from, 1); ids.splice(to, 0, moved);
      save({ operation: "reorder", payload: { kind, ids, category_id: kind === "item" ? groupId : undefined } });
    } catch { return; }
  }, [categories, save, disabled]);

  return { moveItem, moveCategory, dragStart, dragOver, drop };
}
