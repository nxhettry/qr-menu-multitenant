import { MenuIcon } from "@/components/menu/icon";

const dishes = [
  { name: "Steamed momo", ne: "म:म:", price: "Rs 180", veg: false, tint: "from-amber-200 to-orange-300" },
  { name: "Veg thukpa", ne: "थुक्पा", price: "Rs 220", veg: true, tint: "from-lime-200 to-emerald-300" },
  { name: "Masala tea", ne: "चिया", price: "Rs 60", veg: true, tint: "from-orange-200 to-rose-300" },
  { name: "Sel roti set", ne: "सेल रोटी", price: "Rs 150", veg: true, tint: "from-yellow-200 to-amber-300" },
];

/** Static, decorative preview of a guest menu. Uses fixed light colours so it reads like a real phone screen in either theme. */
export function PhoneMockup() {
  return <div aria-hidden="true" className="relative mx-auto w-[272px] select-none sm:w-[300px]">
    <div className="absolute -inset-10 -z-10 rounded-full bg-brand/20 blur-3xl" />
    <div className="rounded-[44px] bg-stone-900 p-2.5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] ring-1 ring-white/10">
      <div className="relative overflow-hidden rounded-[36px] bg-[#fafaf9] text-stone-900">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-stone-900" />
        <div className="px-4 pb-5 pt-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c2410c] text-xs font-semibold text-white">MH</span>
            <div><p className="text-[13px] font-semibold leading-tight">Momo House</p><p className="text-[9px] text-stone-500">Thamel, Kathmandu</p></div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[9px] text-stone-400"><MenuIcon name="search" className="h-3 w-3" />Search dishes or categories…</div>
          <div className="mt-2.5 flex gap-1.5 text-[9px] font-medium">
            <span className="rounded-full bg-[#c2410c] px-2.5 py-1 text-white">All dishes</span>
            <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600">Specials</span>
            <span className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-stone-600">Momo</span>
          </div>
          <div className="relative mt-3 overflow-hidden rounded-2xl bg-linear-to-br from-stone-800 to-stone-950 p-3.5 text-white">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#c2410c]/60 blur-2xl" />
            <p className="text-[7px] font-semibold uppercase tracking-widest text-white/70">Signature · Momo</p>
            <p className="mt-1 text-[15px] font-semibold leading-tight">Jhol momo</p>
            <p className="mt-1.5 text-[11px] font-semibold">Rs 240</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">{dishes.map(dish => <div key={dish.name} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className={`aspect-[4/3] bg-linear-to-br ${dish.tint}`} />
            <div className="p-2">
              <p className="text-[9px] font-semibold leading-tight">{dish.name}</p>
              <p lang="ne" className="text-[8px] text-stone-500">{dish.ne}</p>
              <div className="mt-1 flex items-center justify-between"><span className="text-[9px] font-semibold text-[#c2410c]">{dish.price}</span><span className={`h-2 w-2 rounded-[2px] border ${dish.veg ? "border-green-700" : "border-red-700"}`} /></div>
            </div>
          </div>)}</div>
        </div>
      </div>
    </div>
  </div>;
}
