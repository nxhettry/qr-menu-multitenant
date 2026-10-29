import type { ReactNode } from "react";

const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const inputClass = "mt-2 block w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-base font-normal text-ink shadow-[inset_0_1px_1px_rgb(0_0_0/0.02)] transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-surface-muted";
export const checkboxClass = "h-5 w-5 shrink-0";
export const primaryClass = `${buttonBase} bg-brand px-6 py-3 text-on-brand shadow-sm hover:bg-brand-strong`;
export const secondaryClass = `${buttonBase} border border-line-strong bg-surface px-4 py-2.5 font-medium text-ink hover:border-ink-subtle hover:bg-surface-muted`;
export const iconClass = `${buttonBase} min-w-11 border border-line-strong bg-surface px-3 font-medium text-ink hover:bg-surface-muted`;
export const dangerClass = `${buttonBase} bg-danger px-6 py-3 text-canvas hover:opacity-90`;
export const darkClass = `${buttonBase} bg-ink px-6 py-3 text-canvas hover:opacity-90`;
export const linkClass = "font-semibold text-brand underline-offset-4 hover:underline";
export const cardClass = "rounded-2xl border border-line bg-surface shadow-card";
export const eyebrowClass = "text-xs font-semibold uppercase tracking-[0.16em] text-brand";

const noticeTones = {
  info: "border-line bg-surface-muted text-ink-muted",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
};
export const noticeClass = (tone: keyof typeof noticeTones) => `rounded-xl border p-4 text-sm leading-6 ${noticeTones[tone]}`;

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-ink">{label}{children}</label>;
}

export function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return <span id={id} className="mt-2 block text-xs font-normal leading-5 text-ink-subtle">{children}</span>;
}

export function FormError({ message }: { message?: string }) {
  return message ? <p role="alert" className={noticeClass("danger")}>{message}</p> : null;
}
