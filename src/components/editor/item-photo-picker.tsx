"use client";
import { useEffect, useRef, useState } from "react";
import { validateImageFile } from "@/lib/editor/upload-image";
import { FilePickButton } from "./file-pick-button";
import { FormError, primaryClass, secondaryClass } from "@/components/ui/form";

export function ItemPhotoPicker({ file, disabled, onChange }: { file: File | null; disabled: boolean; onChange: (file: File | null) => void }) {
  const [error, setError] = useState<string>();
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  function replacePreview(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewRef.current);
    onChange(next);
  }
  function choose(selected: File) {
    const invalid = validateImageFile(selected);
    setError(invalid);
    if (!invalid) replacePreview(selected);
  }
  return <div className="space-y-4">
    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview cannot be optimised */}
    {preview && <img src={preview} alt="Selected dish photo preview" width={128} height={96} className="h-24 w-32 rounded-xl object-cover" />}
    <p className="text-xs leading-5 text-ink-muted">Optional. JPEG, PNG, or WebP up to 3 MB. The photo uploads when you save the item.</p>
    <div className="flex flex-wrap items-center gap-3">
      <FilePickButton label="Choose item photo" disabled={disabled} className={file ? secondaryClass : primaryClass} onFile={choose}>{file ? "Choose a different photo" : "Choose photo"}</FilePickButton>
      {file && <button type="button" disabled={disabled} onClick={() => { setError(undefined); replacePreview(null); }} className={secondaryClass}>Remove photo</button>}
    </div>
    <FormError message={error} />
  </div>;
}
