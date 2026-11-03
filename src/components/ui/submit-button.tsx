"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel, className }: { children: ReactNode; pendingLabel: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? pendingLabel : children}</button>;
}

const signOutClass = "rounded-full px-3 py-2 font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink";

export function SignOutForm({ action, className = signOutClass }: { action: () => void | Promise<void>; className?: string }) {
  return <form action={action}><SubmitButton pendingLabel="Signing out…" className={className}>Sign out</SubmitButton></form>;
}
