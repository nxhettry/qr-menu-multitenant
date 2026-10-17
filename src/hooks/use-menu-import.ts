"use client";
import { useCallback, useRef, useState } from "react";
import { previewImport, type ImportPreview } from "@/lib/editor/import";
import { readSpreadsheet } from "@/lib/editor/spreadsheet";
import type { EditorCategory } from "@/lib/editor/data";

export function useMenuImport(categories: EditorCategory[]) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const generation = useRef(0);
  const read = useCallback(async (file: File) => {
    const current = ++generation.current;
    setReading(true); setError(""); setPreview(null); setConfirmed(false);
    try {
      const table = await readSpreadsheet(file);
      if (current !== generation.current) return;
      setPreview(previewImport(table, categories));
      setRequestId(crypto.randomUUID());
    } catch (error) {
      if (current === generation.current) setError(error instanceof Error ? error.message : "We couldn’t read this file. Try the template.");
    } finally { if (current === generation.current) setReading(false); }
  }, [categories]);
  return { preview, error, reading, requestId, confirmed, setConfirmed, read };
}
