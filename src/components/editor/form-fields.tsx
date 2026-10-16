import type { ReactNode } from "react";

export const inputClass = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base disabled:bg-stone-100";
export const primaryClass = "rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50";
export const secondaryClass = "rounded-full border border-stone-300 px-4 py-3 text-sm font-medium disabled:opacity-50";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium">{label}{children}</label>;
}

export function FormError({ message }: { message?: string }) {
  return message ? <p role="alert" className="text-sm leading-6 text-red-800">{message}</p> : null;
}
