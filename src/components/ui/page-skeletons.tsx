import { cardClass } from "./form";
import { Skeleton, SkeletonLines, SkeletonRegion } from "./skeleton";

const shell = "mx-auto w-full px-4 sm:px-6";

function HeaderSkeleton() {
  return <div className="flex min-h-16 items-center justify-between gap-4 border-b border-line">
    <div className="flex items-center gap-2.5"><Skeleton className="h-8 w-8 rounded-xl" /><Skeleton className="h-4 w-20" /></div>
    <Skeleton className="h-9 w-24 rounded-full" />
  </div>;
}

function RowSkeleton() {
  return <div className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div><Skeleton className="h-6 w-16 rounded-full" /></div>;
}

export function ListSkeleton({ rows = 5, label = "Loading", search = true }: { rows?: number; label?: string; search?: boolean }) {
  return <SkeletonRegion label={label}>
    {search && <Skeleton className="mt-8 h-12 w-full rounded-full" />}
    <div className={`${cardClass} mt-5 divide-y divide-line overflow-hidden`}>{Array.from({ length: rows }, (_, index) => <RowSkeleton key={index} />)}</div>
  </SkeletonRegion>;
}

export function AdminPageSkeleton() {
  return <SkeletonRegion label="Loading" className="pt-2">
    <Skeleton className="h-3 w-20" /><Skeleton className="mt-4 h-9 w-56" />
    <ListSkeleton rows={6} label="Loading list" />
  </SkeletonRegion>;
}

export function DashboardSkeleton() {
  return <SkeletonRegion label="Loading your workspace" className={`${shell} max-w-5xl pb-16`}>
    <HeaderSkeleton />
    <div className="mt-10 flex flex-wrap items-end justify-between gap-5"><div><Skeleton className="h-3 w-28" /><Skeleton className="mt-4 h-9 w-64" /></div><Skeleton className="h-11 w-44 rounded-full" /></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">{[0, 1].map(key => <div key={key} className={`${cardClass} p-6`}>
      <Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="mt-4 h-6 w-2/3" /><Skeleton className="mt-2 h-3 w-1/3" /><SkeletonLines className="mt-5" /><Skeleton className="mt-6 h-11 w-36 rounded-full" />
    </div>)}</div>
  </SkeletonRegion>;
}

export function EditorSkeleton() {
  return <SkeletonRegion label="Loading your restaurant" className={`${shell} max-w-4xl pb-16`}>
    <HeaderSkeleton />
    <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="mt-3 h-9 w-64" /><Skeleton className="mt-2 h-3 w-24" /></div><div className="flex gap-2"><Skeleton className="h-11 w-32 rounded-full" /><Skeleton className="h-11 w-32 rounded-full" /></div></div>
    <Skeleton className="mt-6 h-12 w-full max-w-xl rounded-full" />
    <div className="mt-6 space-y-4">{[0, 1, 2].map(key => <div key={key} className={`${cardClass} flex items-center gap-3 p-4`}><Skeleton className="h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/5" /></div></div>)}</div>
  </SkeletonRegion>;
}

export function PublicMenuSkeleton() {
  return <SkeletonRegion label="Loading menu" className="mx-auto w-full max-w-[960px] px-4 pb-8 sm:px-7">
    <div className="flex items-center gap-4 pb-5 pt-6 sm:pt-9"><Skeleton className="h-14 w-14 rounded-2xl sm:h-[72px] sm:w-[72px]" /><div className="flex-1 space-y-2"><Skeleton className="h-6 w-2/3 max-w-xs" /><Skeleton className="h-3 w-1/2 max-w-[200px]" /></div></div>
    <Skeleton className="h-12 w-full rounded-full" />
    <div className="mt-4 flex gap-2 overflow-hidden">{[0, 1, 2, 3].map(key => <Skeleton key={key} className="h-10 w-24 shrink-0 rounded-full" />)}</div>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">{Array.from({ length: 6 }, (_, key) => <div key={key} className={`${cardClass} overflow-hidden`}>
      <Skeleton className="aspect-[4/3] w-full rounded-none" /><div className="space-y-2 p-3"><Skeleton className="h-4 w-3/4" /><SkeletonLines lines={2} /><Skeleton className="h-4 w-1/3" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}

export function PanelSkeleton({ label }: { label: string }) {
  return <SkeletonRegion label={label} className={`${cardClass} space-y-4 p-5`}><Skeleton className="h-5 w-40" /><SkeletonLines lines={4} /><Skeleton className="h-11 w-32 rounded-full" /></SkeletonRegion>;
}

export function ItemDialogSkeleton() {
  return <SkeletonRegion label="Loading" className="space-y-4"><Skeleton className="aspect-[4/3] w-full rounded-2xl" /><Skeleton className="h-6 w-2/3" /><SkeletonLines /></SkeletonRegion>;
}

export function AuthSkeleton() {
  return <SkeletonRegion label="Loading" className="mx-auto w-full max-w-md px-6 py-16">
    <Skeleton className="h-3 w-24" /><Skeleton className="mt-4 h-9 w-3/4" /><SkeletonLines lines={2} className="mt-4" />
    <div className="mt-8 space-y-5"><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-full" /></div>
  </SkeletonRegion>;
}
