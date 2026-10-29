import type { DragEvent } from "react";
import type { EditorCategory, EditorItem } from "@/lib/editor/data";

export type MenuEditorActions = {
  disabled: boolean;
  reorderable: boolean;
  editCategory: (category: EditorCategory) => void;
  addItem: (categoryId: string) => void;
  addSubcategory: (parentId: string) => void;
  editItem: (item: EditorItem) => void;
  itemPhoto: (item: EditorItem) => void;
  remove: (kind: "category" | "item", id: string, name: string) => void;
  setAvailable: (item: EditorItem) => void;
  setVisible: (item: EditorItem) => void;
  moveCategory: (category: EditorCategory, offset: number) => void;
  moveItem: (category: EditorCategory, index: number, offset: number) => void;
  dragStart: (event: DragEvent, kind: "category" | "item", id: string, groupId?: string) => void;
  dragOver: (event: DragEvent) => void;
  drop: (event: DragEvent, kind: "category" | "item", targetId: string, groupId?: string) => void;
};
