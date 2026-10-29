"use client";
import { useEffect, useId, useRef, useState } from "react";

export type MenuAction = { label: string; onSelect: () => void; disabled?: boolean; tone?: "danger" };

const menuWidth = 224;
const rowHeight = 44;

export function ActionMenu({ label, actions, disabled, className = "" }: {
  label: string; actions: (MenuAction | false)[]; disabled?: boolean; className?: string;
}) {
  const [placement, setPlacement] = useState<{ left: boolean; up: boolean } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const items = actions.filter(action => action !== false);
  const open = placement !== null;
  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLButtonElement>("[data-menu-item]:not(:disabled)")?.focus();
    function outside(event: PointerEvent) { if (!rootRef.current?.contains(event.target as Node)) setPlacement(null); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setPlacement(null); triggerRef.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  function toggle() {
    if (open || !triggerRef.current) { setPlacement(null); return; }
    const rect = triggerRef.current.getBoundingClientRect();
    setPlacement({ left: rect.right < menuWidth + 8, up: rect.bottom + items.length * rowHeight + 24 > window.innerHeight && rect.top > items.length * rowHeight + 24 });
  }
  function select(action: MenuAction) {
    setPlacement(null);
    triggerRef.current?.focus();
    action.onSelect();
  }
  return <div ref={rootRef} className={`relative ${open ? "z-40" : "z-10"} ${className}`} onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setPlacement(null); }}>
    <button ref={triggerRef} type="button" disabled={disabled} aria-label={label} aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={toggle}
      className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-50 aria-expanded:bg-surface-muted aria-expanded:text-ink">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
    </button>
    {placement && <ul id={menuId} style={{ width: menuWidth }} className={`absolute z-30 overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-lift ${placement.left ? "left-0" : "right-0"} ${placement.up ? "bottom-full mb-1" : "top-full mt-1"}`}>
      {items.map(action => <li key={action.label}>
        <button type="button" data-menu-item disabled={action.disabled} onClick={() => select(action)}
          className={`flex min-h-11 w-full items-center px-4 text-left text-sm font-medium transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none disabled:opacity-40 ${action.tone === "danger" ? "text-danger" : "text-ink"}`}>{action.label}</button>
      </li>)}
    </ul>}
  </div>;
}
