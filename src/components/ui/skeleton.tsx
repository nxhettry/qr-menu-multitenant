import type { CSSProperties } from "react";

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" style={style} className={`block animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none ${className}`} />;
}

export function SkeletonLines({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return <span aria-hidden="true" className={`block space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, index) => <Skeleton key={index} className={`h-3.5 ${index === lines - 1 ? "w-2/3" : "w-full"}`} />)}
  </span>;
}

/** Wraps a skeleton layout so assistive technology announces one polite loading message instead of the shapes. */
export function SkeletonRegion({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div role="status" aria-busy="true" aria-live="polite" className={className}><span className="sr-only">{label}</span>{children}</div>;
}
