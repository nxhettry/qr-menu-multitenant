"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { previewImport, type ImportPreview } from "@/lib/editor/import";
import { readSpreadsheet } from "@/lib/editor/spreadsheet";
import type { EditorCategory } from "@/lib/editor/data";
import { applyDishMatch, matchDish, type DishChoice } from "@/lib/dishes/match";
import type { DishIndex } from "@/lib/dishes/search";

export function useMenuImport(categories: EditorCategory[], dishIndex: DishIndex | null) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [choices, setChoices] = useState<Record<number, DishChoice>>({});
  const generation = useRef(0);
  const read = useCallback(async (file: File) => {
    const current = ++generation.current;
    setReading(true); setError(""); setPreview(null); setConfirmed(false); setChoices({});
    try {
      const table = await readSpreadsheet(file);
      if (current !== generation.current) return;
      setPreview(previewImport(table, categories));
      setRequestId(crypto.randomUUID());
    } catch (error) {
      if (current === generation.current) setError(error instanceof Error ? error.message : "We couldn’t read this file. Try the template.");
    } finally { if (current === generation.current) setReading(false); }
  }, [categories]);
  const matches = useMemo(() => dishIndex && preview ? preview.items.map(entry => matchDish(dishIndex, entry.item.name)) : [], [dishIndex, preview]);
  const items = useMemo(() => preview?.items.map((entry, position) => applyDishMatch(entry, matches[position] ?? null, choices[position])) ?? [], [preview, matches, choices]);
  const choose = useCallback((position: number, choice: DishChoice) => setChoices(current => ({ ...current, [position]: choice })), []);
  return { preview, items, matches, choices, choose, error, reading, requestId, confirmed, setConfirmed, read };
}
