"use client";
import { useEffect, useId, useRef, type MouseEvent, type ReactNode, type SyntheticEvent } from "react";
import { MenuIcon } from "@/components/menu/icon";

const widths = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-2xl" };

export function Dialog({ title, description, size = "md", onClose, children }: {
  title: string; description?: string; size?: keyof typeof widths; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    root.style.overflow = "hidden";
    return () => { root.style.overflow = overflow; dialog.close(); };
  }, []);
  function cancel(event: SyntheticEvent) { event.preventDefault(); onClose(); }
  function backdrop(event: MouseEvent<HTMLDialogElement>) { if (event.target === event.currentTarget) onClose(); }
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={cancel} onClick={backdrop}
    className={`sheet m-0 mt-auto max-h-[92dvh] w-full max-w-full flex-col rounded-t-3xl border border-line bg-surface text-ink shadow-lift backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:flex sm:m-auto sm:max-h-[88dvh] sm:w-[calc(100%-3rem)] sm:rounded-3xl ${widths[size]}`}>
    <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
      <div className="min-w-0"><h2 id={titleId} className="break-words text-lg font-semibold tracking-tight">{title}</h2>{description && <p className="mt-0.5 break-words text-sm text-ink-muted">{description}</p>}</div>
      <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"><MenuIcon name="close" className="h-5 w-5" /></button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
  </dialog>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex flex-wrap gap-3 border-t border-line bg-surface px-5 py-4 sm:-mx-6 sm:px-6">{children}</div>;
}
