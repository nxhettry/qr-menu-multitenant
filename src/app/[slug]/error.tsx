"use client";
import { StatusScreen } from "@/components/ui/status-screen";
import { darkClass } from "@/components/ui/form";

export default function MenuError({ reset }: { reset: () => void }) {
  return <StatusScreen title="We couldn’t load this menu." body="Please try again, or ask the restaurant for their menu." action={<button onClick={reset} className={darkClass}>Try again</button>} />;
}
