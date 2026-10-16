import type { MenuItem } from "@/lib/menu/schema";
import { formatPrice } from "@/lib/menu/presentation";
import { itemAvailable } from "@/lib/menu/filter";
import { DietBadge } from "./diet-badge";
import { MenuPhoto } from "./photo";
import { MenuIcon } from "./icon";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const available = itemAvailable(item);
  return <article id={`dish-${item.id}`} className="scroll-mt-44 overflow-hidden rounded-2xl border border-[#eae2d8] bg-[#fffdf9] shadow-[0_3px_14px_#46230b05]">
    <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#eee7dd] text-[#aa9580]">
      <MenuIcon name="bowl" className="h-12 w-12 opacity-50" />
      <MenuPhoto publicId={item.imagePublicId} version={item.imageVersion} alt={item.name} kind="item" className="absolute inset-0 h-full w-full object-cover" />
      {item.isFeatured && <span className="absolute left-2 top-2 rounded-full bg-[#fff7e9] px-2 py-1 text-[10px] font-semibold text-orange-900">House special</span>}
      {!available && <span className="absolute bottom-2 left-2 rounded-full bg-stone-900/90 px-2.5 py-1 text-[10px] font-semibold text-white">Sold out</span>}
    </div>
    <div className="p-3 sm:p-4">
      <h3 className="break-words font-serif text-[19px] font-bold leading-tight sm:text-xl">{item.name}</h3>
      {item.nameNe && <p lang="ne" className="mt-1 text-xs text-stone-600">{item.nameNe}</p>}
      {item.description && <p className="mt-2 line-clamp-3 break-words text-xs leading-[1.5] text-stone-600 sm:text-sm">{item.description}</p>}
      {item.descriptionNe && <p lang="ne" className="mt-1 text-xs leading-5 text-stone-600">{item.descriptionNe}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {item.priceMinor !== null && <span className="text-[15px] font-bold tabular-nums text-[var(--menu-accent)] sm:text-lg">{formatPrice(item.priceMinor)}</span>}
        <DietBadge diet={item.diet} />
      </div>
      {!!item.variants.length && <dl className="mt-3 space-y-2 border-t border-stone-200 pt-3">{item.variants.map(variant => <div key={variant.id} className="flex flex-wrap justify-between gap-x-2 text-xs leading-5">
        <dt className="break-words text-stone-600">{variant.name}{variant.nameNe && <span lang="ne" className="ml-1">{variant.nameNe}</span>}{(!item.isAvailable || !variant.isAvailable) && <span className="ml-1 font-medium text-stone-700">(Sold out)</span>}</dt>
        <dd className="font-semibold tabular-nums text-[var(--menu-accent)]">{formatPrice(variant.priceMinor)}</dd>
      </div>)}</dl>}
      {!!item.spiceLevel && <p className="mt-3 text-[10px] font-medium text-stone-600">{["", "Mild", "Medium spice", "Hot"][item.spiceLevel]}</p>}
    </div>
  </article>;
}
