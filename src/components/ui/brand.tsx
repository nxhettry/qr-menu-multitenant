import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { eyebrowClass } from "./form";

export const RESTROFUEL_URL = "https://restrofuel.kree.com.np";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return <Image src="/icons/icon-192.png" alt="" aria-hidden="true" width={192} height={192} loading="eager" className={`shrink-0 ${className}`} />;
}

export function LogoLockup({ className = "h-12 w-auto" }: { className?: string }) {
  return <Image src="/qr-menu-logo.png" alt="RestroFuel QR Menu" width={1860} height={644} className={className} />;
}

export function Logo({ href = "/" }: { href?: string }) {
  return <Link href={href} className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[17px] font-semibold tracking-tight text-ink">
    <LogoMark />QR Menu
  </Link>;
}

export function PoweredBy({ className = "" }: { className?: string }) {
  return <a href={RESTROFUEL_URL} target="_blank" rel="noopener" className={`inline-flex items-center gap-1.5 text-xs text-ink-subtle transition-colors hover:text-ink ${className}`}>
    Powered by <span className="font-semibold text-ink">RestroFuel</span><span aria-hidden="true">↗</span>
  </a>;
}

export function AppHeader({ children, logoHref }: { children?: ReactNode; logoHref?: string }) {
  return <header className="flex min-h-16 items-center justify-between gap-4 border-b border-line">
    <Logo href={logoHref} />
    {children && <div className="flex items-center gap-0.5 whitespace-nowrap text-sm sm:gap-2">{children}</div>}
  </header>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div>
    {eyebrow && <p className={eyebrowClass}>{eyebrow}</p>}
    <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
    {children && <div className="mt-3 text-[15px] leading-7 text-ink-muted">{children}</div>}
  </div>;
}
