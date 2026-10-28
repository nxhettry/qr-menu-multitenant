"use client";
import { primaryClass } from "@/components/ui/form";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={primaryClass}>Print</button>;
}
