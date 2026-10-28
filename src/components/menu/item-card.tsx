import type { MenuItem } from "@/lib/menu/schema";
import { formatPrice } from "@/lib/menu/presentation";
import { itemAvailable } from "@/lib/menu/filter";
import { DietBadge } from "./diet-badge";
import { MenuPhoto } from "./photo";
import { MenuIcon } from "./icon";
import { fieldVisible } from "@/lib/menu/visibility";
import { ItemExtras } from "./item-extras";

const spiceLabels = ["No spice", "Mild", "Medium spice", "Hot"];
const pill = "rounded-full px-2 py-0.5 text-[10px] font-semibold";
const overlayPill = "absolute rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm backdrop-blur-md";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const available = itemAvailable(item);
  const photos = fieldVisible(item.details, "photos");
  const special = item.isFeatured && fieldVisible(item.details, "badges");
  return <article id={`dish-${item.id}`} className={`group scroll-mt-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition-shadow hover:shadow-lift has-[details[open]]:col-span-2`}>
    {photos && <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface-muted text-ink-subtle/50">
      <MenuIcon name="bowl" className="h-10 w-10" />
      <MenuPhoto publicId={item.imagePublicId} version={item.imageVersion} alt={item.name} kind="item" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${available ? "" : "grayscale"}`} />
      {special && <span className={`${overlayPill} left-2 top-2 bg-white/90 text-stone-900`}>House special</span>}
      {!available && <span className={`${overlayPill} bottom-2 left-2 bg-stone-950/85 text-white`}>Sold out</span>}
    </div>}
    <div className="p-3 sm:p-4">
      {item.subcategory && <p className="mb-1 break-words text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">{item.subcategory}</p>}
      <h3 className="break-words text-[15px] font-semibold leading-snug tracking-tight sm:text-base">{item.name}</h3>
      {item.nameNe && <p lang="ne" className="text-xs text-ink-muted">{item.nameNe}</p>}
      {item.description && <p className="mt-1.5 line-clamp-3 break-words text-xs leading-[1.55] text-ink-muted sm:text-[13px]">{item.description}</p>}
      {item.descriptionNe && <p lang="ne" className="mt-1 text-xs text-ink-muted">{item.descriptionNe}</p>}
      {(item.details?.is_popular || item.details?.is_new || (!photos && (!available || special))) && <div className="mt-2.5 flex flex-wrap gap-1.5">
        {item.details?.is_popular && <span className={`${pill} bg-warning-soft text-warning`}>Popular</span>}
        {item.details?.is_new && <span className={`${pill} bg-success-soft text-success`}>New</span>}
        {!photos && !available && <span className={`${pill} bg-ink text-canvas`}>Sold out</span>}
        {!photos && special && <span className={`${pill} bg-brand-soft text-brand`}>House special</span>}
      </div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {item.priceMinor !== null && <span className="text-[15px] font-semibold tabular-nums text-accent sm:text-base">{formatPrice(item.priceMinor)}</span>}
        <DietBadge diet={item.diet} />
      </div>
      {!!item.variants.length && <dl className="mt-3 space-y-1.5 rounded-xl bg-surface-muted p-2.5">{item.variants.map(variant => <div key={variant.id} className="flex flex-wrap justify-between gap-x-2 text-xs leading-5">
        <dt className="break-words text-ink-muted">{variant.name}{variant.nameNe && <span lang="ne" className="ml-1">{variant.nameNe}</span>}{(!item.isAvailable || !variant.isAvailable) && <span className="ml-1 font-medium text-ink-subtle">(Sold out)</span>}</dt>
        <dd className="font-semibold tabular-nums text-accent">{formatPrice(variant.priceMinor)}</dd>
      </div>)}</dl>}
      {item.spiceLevel !== null && <p className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-ink-muted"><MenuIcon name="flame" className="h-3.5 w-3.5 text-non-veg" />{spiceLabels[item.spiceLevel]}</p>}
      <ItemExtras details={item.details} />
    </div>
  </article>;
}
