"use client";
import Link from "next/link";
import { memo } from "react";
import { useRestroFuelStatus } from "@/hooks/use-restrofuel-sync";
import { changeCount } from "@/lib/restrofuel/status";
import { linkClass, noticeClass } from "@/components/ui/form";

const ACTIVE_LICENSE = new Set(["pilot", "active", "expiring", "extended"]);
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Tells the owner when RestroFuel sent menu changes that are waiting for review. */
export const SyncBanner = memo(function SyncBanner({ userId, restaurantId }: { userId: string; restaurantId: string }) {
  const status = useRestroFuelStatus(userId, restaurantId);
  const link = status?.link;
  if (!link || link.status !== "ACTIVE") return null;
  const href = `/dashboard/${restaurantId}/restrofuel`;
  const pending = status.pending;
  if (pending) {
    const { added, changed, removed } = pending.summary;
    const parts = [added.length && `${added.length} new`, changed.length && `${changed.length} changed`, removed.length && `${removed.length} removed`].filter(Boolean);
    return <div role="status" className={`${noticeClass("warning")} flex flex-wrap items-center justify-between gap-3`}>
      <p><strong>RestroFuel menu updated:</strong> {parts.length ? parts.join(", ") : plural(changeCount(pending.summary), "change")}. Nothing is live until you apply it.</p>
      <Link href={href} className={`${linkClass} shrink-0`}>Review changes →</Link>
    </div>;
  }
  if (!ACTIVE_LICENSE.has(link.licenseState)) {
    return <p role="status" className={noticeClass("warning")}>Your RestroFuel license isn’t active, so syncing is paused. Your QR menu keeps working. <Link href={href} className={linkClass}>Details</Link></p>;
  }
  return <p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
    <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />Connected to RestroFuel</span>
    <Link href={href} className={linkClass}>Manage</Link>
  </p>;
});
