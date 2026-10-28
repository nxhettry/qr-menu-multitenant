"use client";
import useSWR from "swr";
import { cardClass, darkClass } from "./ui/form";

export function SetupStatus() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ status: string }>("/api/health");
  return <div className={`${cardClass} p-6`}>
    <h2 className="text-xl font-semibold">Application connection</h2>
    <p className="mt-3 text-ink-muted" role="status" aria-live="polite">
      {isLoading ? "Checking the app…" : error ? "Connection failed. Try again." : `App is ${data?.status}.`}
    </p>
    <p className="mt-2 text-sm text-ink-subtle">This checks the local app. Supabase and Cloudinary connections are configured separately.</p>
    <button onClick={() => void mutate()} disabled={isValidating} className={`${darkClass} mt-5`}>
      {isValidating ? "Checking…" : "Check again"}
    </button>
  </div>;
}
