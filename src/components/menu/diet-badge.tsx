import type { MenuItem } from "@/lib/menu/schema";

export function DietBadge({ diet }: { diet: MenuItem["diet"] }) {
  if (!diet) return null;
  const veg = diet === "VEG";
  return <span data-diet={diet} className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${veg ? "text-green-800" : "text-red-700"}`}>
    <span aria-hidden="true" className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border ${veg ? "border-green-700" : "border-red-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${veg ? "bg-green-700" : "bg-red-700"}`} /></span>
    {veg ? "Veg" : diet === "EGG" ? "Egg" : "Non-Veg"}
  </span>;
}
