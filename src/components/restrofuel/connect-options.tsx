"use client";
import { useActionState } from "react";
import { connectExistingRestaurant, connectNewRestaurant } from "@/app/connect/restrofuel/actions";
import type { FormState } from "@/lib/auth/schemas";
import type { RestaurantSummary } from "@/lib/tenancy/restaurants";
import { RestaurantForm } from "@/components/restaurant-form";
import { FormError, secondaryClass } from "@/components/ui/form";

function LinkFields({ server, code }: { server: string; code: string }) {
  return <><input type="hidden" name="server" value={server} /><input type="hidden" name="code" value={code} /></>;
}

function ExistingRestaurants({ restaurants, server, code }: { restaurants: RestaurantSummary[]; server: string; code: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(connectExistingRestaurant, {});
  return <section aria-labelledby="existing-heading" className="mt-7">
    <h2 id="existing-heading" className="text-sm font-semibold text-ink">Use a restaurant you already have</h2>
    <p className="mt-1 text-sm leading-6 text-ink-muted">You’ll choose whether to replace its menu or add the RestroFuel items alongside it.</p>
    <form action={action} className="mt-4 space-y-3">
      <LinkFields server={server} code={code} />
      <ul className="space-y-2">
        {restaurants.map(restaurant => <li key={restaurant.id}>
          <button name="restaurantId" value={restaurant.id} disabled={pending} className={`${secondaryClass} w-full justify-between rounded-xl px-4 py-3 text-left`}>
            <span className="min-w-0"><span className="block truncate font-semibold">{restaurant.name}</span><span className="block truncate text-xs font-normal text-ink-subtle">/{restaurant.slug}</span></span>
            <span aria-hidden="true">→</span>
          </button>
        </li>)}
      </ul>
      {pending && <p role="status" className="text-sm text-ink-muted">Connecting and copying your menu…</p>}
      <FormError message={state.error} />
    </form>
  </section>;
}

export function ConnectOptions({ restaurants, server, code, host }: { restaurants: RestaurantSummary[]; server: string; code: string; host: string }) {
  return <>
    {restaurants.length > 0 && <ExistingRestaurants restaurants={restaurants} server={server} code={code} />}
    <section aria-labelledby="new-heading" className={restaurants.length ? "mt-8 border-t border-line pt-7" : "mt-7"}>
      <h2 id="new-heading" className="text-sm font-semibold text-ink">{restaurants.length ? "Or create a new restaurant" : "Create your restaurant"}</h2>
      <RestaurantForm host={host} submitAction={connectNewRestaurant} submitLabel="Create and copy menu" pendingLabel="Copying your menu…">
        <LinkFields server={server} code={code} />
      </RestaurantForm>
    </section>
  </>;
}
