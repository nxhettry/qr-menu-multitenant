import type { ReactNode } from "react";
import Link from "next/link";
import { MenuIcon } from "@/components/menu/icon";
import { PoweredBy } from "./brand";

export function StatusScreen({ eyebrow, title, body, action }: { eyebrow?: string; title: string; body: string; action?: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-20 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><MenuIcon name="bowl" className="h-7 w-7" /></span>
    {eyebrow && <p className="mt-6 text-sm font-semibold text-brand">{eyebrow}</p>}
    <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
    <p className="mt-4 leading-7 text-ink-muted">{body}</p>
    <div className="mt-8 flex flex-col items-center gap-5">{action ?? <Link href="/" className="text-sm font-medium text-ink-muted underline underline-offset-4">QR Menu home</Link>}<PoweredBy /></div>
  </main>;
}
