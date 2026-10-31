"use client";
import { memo, useCallback, useId, useState, type KeyboardEvent } from "react";
import { useController, useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { useDishSuggestions } from "@/hooks/use-dish-index";
import { dishMatchesName } from "@/lib/dishes/search";
import type { CatalogDish } from "@/lib/dishes/schemas";
import type { DishIndex } from "@/lib/dishes/search";
import { Hint, inputClass } from "@/components/ui/form";
import type { ItemFields } from "./item-form-values";

type Props = { control: Control<ItemFields>; setValue: UseFormSetValue<ItemFields>; index: DishIndex | null };

export const DishNameField = memo(function DishNameField({ control, setValue, index }: Props) {
  const id = useId();
  const listId = `${id}-options`;
  const { field } = useController({ control, name: "name" });
  const dishId = useWatch({ control, name: "dish_id" });
  const nameNe = useWatch({ control, name: "name_ne" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useDishSuggestions(index, field.value);
  const linked = dishId && index ? index.byId.get(dishId) : undefined;
  const visible = open && !linked && suggestions.length > 0;
  const { onChange } = field;

  const change = useCallback((value: string) => {
    onChange(value);
    setOpen(true);
    setActive(-1);
    const current = dishId && index ? index.byId.get(dishId) : undefined;
    if (current && !dishMatchesName(current, value)) setValue("dish_id", "");
  }, [onChange, dishId, index, setValue]);

  const pick = useCallback((dish: CatalogDish) => {
    onChange(dish.name);
    setValue("dish_id", dish.id);
    if (!nameNe.trim() && dish.nameNe) setValue("name_ne", dish.nameNe);
    setOpen(false);
    setActive(-1);
  }, [onChange, nameNe, setValue]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(current => (current + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      pick(suggestions[active]);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setOpen(false);
    }
  }

  return <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id} className="block text-sm font-medium text-ink">Item name</label>
    <input id={id} ref={field.ref} name={field.name} value={field.value} onChange={event => change(event.target.value)} onKeyDown={onKeyDown}
      onFocus={() => setOpen(true)} className={inputClass} maxLength={150} required data-autofocus autoComplete="off"
      role="combobox" aria-expanded={visible} aria-controls={listId} aria-autocomplete="list" aria-activedescendant={visible && active >= 0 ? `${id}-option-${active}` : undefined} />
    {visible && <ul id={listId} role="listbox" aria-label="Matching dishes" className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line-strong bg-surface py-1 shadow-lg">
      {suggestions.map((dish, position) => <li key={dish.id} id={`${id}-option-${position}`} role="option" aria-selected={position === active}
        onMouseDown={event => event.preventDefault()} onClick={() => pick(dish)} onMouseEnter={() => setActive(position)}
        className={`flex min-h-11 cursor-pointer flex-col justify-center px-4 py-2 text-sm ${position === active ? "bg-brand-soft" : ""}`}>
        <span className="font-medium text-ink">{dish.name}</span>
        {(dish.nameNe || dish.category) && <span className="text-xs text-ink-muted">{[dish.category, dish.nameNe].filter(Boolean).join(" · ")}</span>}
      </li>)}
    </ul>}
    {linked ? <Hint>Matches the catalog dish “{linked.name}”.</Hint> : null}
  </div>;
});
