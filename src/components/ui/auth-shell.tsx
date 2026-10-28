import type { ReactNode } from "react";
import { Logo, PoweredBy } from "./brand";
import { cardClass, eyebrowClass } from "./form";

export function AuthShell({ eyebrow, title, description, children, footer }: {
  eyebrow?: string; title: string; description: string; children: ReactNode; footer?: ReactNode;
}) {
  return <main className="relative flex w-full flex-1 flex-col items-center px-4 py-10 sm:py-16">
    <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--brand)_12%,transparent),transparent)]" />
    <Logo />
    <div className={`${cardClass} mt-8 w-full max-w-md p-6 sm:p-9`}>
      {eyebrow && <p className={eyebrowClass}>{eyebrow}</p>}
      <h1 className={`${eyebrow ? "mt-3" : ""} text-2xl font-semibold tracking-tight sm:text-[28px]`}>{title}</h1>
      <p className="mt-2 text-[15px] leading-6 text-ink-muted">{description}</p>
      {children}
    </div>
    {footer && <div className="mt-6 w-full max-w-md text-sm">{footer}</div>}
    <PoweredBy className="mt-auto pt-10" />
  </main>;
}
