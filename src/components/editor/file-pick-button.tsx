"use client";
import { useRef, type ReactNode } from "react";
import { IMAGE_ACCEPT } from "@/lib/editor/upload-image";

/** A real button that opens the native file chooser, so it works with keyboard, touch and screen readers. */
export function FilePickButton({ label, disabled, className, onFile, children }: {
  label: string; disabled: boolean; className: string; onFile: (file: File) => void; children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <>
    <button type="button" disabled={disabled} onClick={() => input.current?.click()} className={className}>{children}</button>
    <input ref={input} type="file" accept={IMAGE_ACCEPT} tabIndex={-1} aria-label={label} className="sr-only" disabled={disabled}
      onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onFile(file); }} />
  </>;
}
