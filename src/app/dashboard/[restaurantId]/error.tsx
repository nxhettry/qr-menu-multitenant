"use client";
import { StatusScreen } from "@/components/ui/status-screen";
import { darkClass } from "@/components/ui/form";

export default function EditorError({ reset }: { reset: () => void }) {
  return <StatusScreen title="We couldn’t load this workspace." body="Please try again shortly. Your saved menu is still in place." action={<button onClick={reset} className={darkClass}>Try again</button>} />;
}
