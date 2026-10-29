"use client";
import { useEffect } from "react";
import type { MutationResult } from "@/lib/editor/schemas";
import { noticeClass } from "@/components/ui/form";
import { MenuIcon } from "@/components/menu/icon";

export function ResultToast({ result, onDismiss }: { result: MutationResult; onDismiss: () => void }) {
  const text = result.error ?? result.warning ?? result.message;
  const tone = result.error ? "danger" : result.warning ? "warning" : "success";
  useEffect(() => {
    if (!text || tone !== "success") return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [text, tone, onDismiss]);
  return <div role={result.error ? "alert" : "status"} aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md justify-center">
    {text && <div className={`${noticeClass(tone)} pointer-events-auto flex w-full items-start gap-2 py-3 pr-2 shadow-lift`}>
      <p className="flex-1 pt-0.5">{text}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-ink/5"><MenuIcon name="close" className="h-4 w-4" /></button>
    </div>}
  </div>;
}
