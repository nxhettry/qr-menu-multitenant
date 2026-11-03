"use client";
import { memo, type ReactNode } from "react";
import type { EditorItem } from "@/lib/editor/data";
import { cloudinaryImageUrl, formatPrice, guestPrice } from "@/lib/menu/presentation";
import type { VatRule } from "@/lib/menu/vat";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { primaryClass, secondaryClass } from "@/components/ui/form";
import { MenuIcon } from "@/components/menu/icon";
import { DietBadge } from "@/components/menu/diet-badge";
import { MenuImageDisplay } from "@/components/menu-image-display";
import { showsGuestPrice } from "./guest-price-hint";

const spiceLabels = ["No spice", "Mild", "Medium spice", "Hot"];
const badge = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-t border-line pt-4"><h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">{title}</h3><div className="mt-2 text-sm leading-6 text-ink">{children}</div></section>;
}

function PriceLine({ label, minor, vat }: { label?: string; minor: number; vat: VatRule }) {
  return <div className="flex flex-wrap items-baseline justify-between gap-x-3">
    <span className="break-words text-ink-muted">{label}</span>
    <span className="font-semibold tabular-nums">{formatPrice(minor)}{showsGuestPrice(vat) && <span className="ml-2 text-xs font-normal text-ink-subtle">Guests pay {formatPrice(guestPrice(minor, vat))}</span>}</span>
  </div>;
}

export const ItemDetailsDialog = memo(function ItemDetailsDialog({ item, categoryName, vat, disabled, onEdit, onPhoto, onClose }: {
  item: EditorItem; categoryName?: string; vat: VatRule; disabled: boolean; onEdit: (item: EditorItem) => void; onPhoto: (item: EditorItem) => void; onClose: () => void;
}) {
  const { details } = item;
  const src = cloudinaryImageUrl(cloudName, item.image_public_id, item.image_version, 640, 480);
  return <Dialog title={item.name} description={item.name_ne ?? categoryName} size="lg" onClose={onClose}>
    <div className="space-y-4">
      {src ? <MenuImageDisplay key={src} src={src} alt={item.name} width={640} height={480} className="aspect-[4/3] w-full rounded-2xl object-cover sm:max-h-72" />
        : <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-surface-muted text-ink-subtle sm:max-h-72"><MenuIcon name="bowl" className="h-12 w-12" /></div>}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${badge} ${item.is_available ? "bg-success-soft text-success" : "bg-surface-muted text-ink-muted ring-1 ring-line"}`}>{item.is_available ? "Available" : "Sold out"}</span>
        {!item.is_visible && <span className={`${badge} bg-surface-muted text-ink-muted ring-1 ring-line`}>Hidden from menu</span>}
        {item.is_featured && <span className={`${badge} bg-brand-soft text-brand`}>Special</span>}
        {details.is_popular && <span className={`${badge} bg-warning-soft text-warning`}>Popular</span>}
        {details.is_new && <span className={`${badge} bg-success-soft text-success`}>New</span>}
        {item.is_example_price && <span className={`${badge} bg-warning-soft text-warning`}>Review price</span>}
        <DietBadge diet={item.diet} />
        {item.spice_level !== null && <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted"><MenuIcon name="flame" className="h-3.5 w-3.5 text-non-veg" />{spiceLabels[item.spice_level]}</span>}
      </div>
      {item.description && <p className="break-words text-sm leading-6 text-ink-muted">{item.description}</p>}
      {item.description_ne && <p lang="ne" className="break-words text-sm leading-6 text-ink-muted">{item.description_ne}</p>}
      <Section title={item.variants.length ? "Prices by portion" : "Price"}>
        <div className="space-y-1.5">
          {item.price_minor !== null && <PriceLine minor={item.price_minor} vat={vat} />}
          {item.variants.map(variant => <PriceLine key={variant.id} vat={vat} minor={variant.price_minor}
            label={`${variant.name}${variant.name_ne ? ` · ${variant.name_ne}` : ""}${variant.is_available ? "" : " (sold out)"}`} />)}
        </div>
      </Section>
      {(details.preparation_minutes !== null || details.calories !== null) && <Section title="Preparation">
        <p>{[details.preparation_minutes !== null && `${details.preparation_minutes} min`, details.calories !== null && `${details.calories} kcal`].filter(Boolean).join(" · ")}</p>
      </Section>}
      {!!details.tags.length && <Section title="Tags"><ul className="flex flex-wrap gap-1.5">{details.tags.map(tag => <li key={tag} className={`${badge} bg-surface-muted text-ink-muted`}>{tag}</li>)}</ul></Section>}
      {(!!details.allergens.length || !!details.allergen_notes) && <Section title="Allergens">
        {!!details.allergens.length && <p>{details.allergens.join(", ")}</p>}{details.allergen_notes && <p className="mt-1 text-ink-muted">{details.allergen_notes}</p>}
      </Section>}
      {!!details.addon_groups.length && <Section title="Add-ons">
        <div className="space-y-3">{details.addon_groups.map(group => <div key={group.name}>
          <p className="font-medium">{group.name}<span className="ml-2 text-xs font-normal text-ink-subtle">Choose {group.min_select === group.max_select ? group.max_select : `${group.min_select}–${group.max_select}`}</span></p>
          <ul className="mt-1 space-y-1">{group.options.map(option => <li key={option.name} className="flex justify-between gap-3 text-ink-muted"><span className="break-words">{option.name}{!option.is_available && " (sold out)"}</span><span className="tabular-nums">{option.price_minor ? `+ ${formatPrice(option.price_minor)}` : "Free"}</span></li>)}</ul>
        </div>)}</div>
      </Section>}
    </div>
    <DialogFooter>
      <button type="button" disabled={disabled} onClick={() => onEdit(item)} className={primaryClass}>Edit item</button>
      <button type="button" disabled={disabled} onClick={() => onPhoto(item)} className={secondaryClass}>{item.image_public_id ? "Change photo" : "Add photo"}</button>
      <button type="button" onClick={onClose} className={secondaryClass}>Close</button>
    </DialogFooter>
  </Dialog>;
});
