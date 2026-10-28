import type { MenuItem } from "@/lib/menu/schema";

export function DietBadge({ diet }: { diet: MenuItem["diet"] }) {
  if (!diet) return null;
  const veg = diet === "VEG";
  return <span data-diet={diet} className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${veg ? "text-veg" : "text-non-veg"}`}>
    <span aria-hidden="true" className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-current"><span className="h-1.5 w-1.5 rounded-full bg-current" /></span>
    {veg ? "Veg" : diet === "EGG" ? "Egg" : "Non-Veg"}
  </span>;
}
