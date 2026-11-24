"use client";
import { setRestaurantSuspendedAction } from "@/app/admin/actions";
import { useAdminAction } from "@/hooks/use-admin-action";
import { dangerClass, primaryClass } from "@/components/ui/form";
import { ActionResult } from "./action-result";

export function RestaurantStatusAction({ restaurantId, suspended }: { restaurantId: string; suspended: boolean }) {
  const { pending, result, run } = useAdminAction();
  const toggle = () => {
    if (!suspended && !window.confirm("Suspend this restaurant? Its public menu goes offline and the owner can’t edit it.")) return;
    run(() => setRestaurantSuspendedAction(restaurantId, !suspended));
  };
  return <div className="space-y-3">
    <button type="button" onClick={toggle} disabled={pending} className={suspended ? primaryClass : dangerClass}>{pending ? "Saving…" : suspended ? "Restore restaurant" : "Suspend restaurant"}</button>
    <ActionResult result={result} />
  </div>;
}
