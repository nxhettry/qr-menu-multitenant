"use client";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [["/admin", "Overview"], ["/admin/restaurants", "Restaurants"], ["/admin/users", "Users"], ["/admin/activity", "Activity"], ["/admin/account", "Account"]] as const;

function NavLinks({ pathname }: { pathname?: string }) {
  return <nav aria-label="Admin" className="-mx-4 flex gap-1 overflow-x-auto px-4 py-3 sm:mx-0 sm:px-0">
    {links.map(([href, label]) => {
      const active = pathname !== undefined && (href === "/admin" ? pathname === href : pathname.startsWith(href));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition-colors ${active ? "bg-ink text-canvas" : "text-ink-muted hover:bg-surface-muted hover:text-ink"}`}>{label}</Link>;
    })}
  </nav>;
}

function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}

export function AdminNav() {
  return <Suspense fallback={<NavLinks />}><ActiveNavLinks /></Suspense>;
}
