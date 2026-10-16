"use client";
import useSWR from "swr";

export function SetupStatus() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ status: string }>("/api/health");
  return <div className="rounded-2xl border border-stone-200 bg-white p-6">
    <h2 className="text-xl font-semibold">Application connection</h2>
    <p className="mt-3 text-stone-600" role="status" aria-live="polite">
      {isLoading ? "Checking the app…" : error ? "Connection failed. Try again." : `App is ${data?.status}.`}
    </p>
    <p className="mt-2 text-sm text-stone-500">This checks the local app. Supabase and Cloudinary connections are configured separately.</p>
    <button onClick={() => void mutate()} disabled={isValidating} className="mt-5 rounded-full bg-stone-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
      {isValidating ? "Checking…" : "Check again"}
    </button>
  </div>;
}
