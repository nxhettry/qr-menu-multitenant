"use client";
import { SWRConfig } from "swr";

class FetchError extends Error {
  constructor(public status: number) { super(`Request failed (${status})`); }
}
async function fetcher(key: string | readonly unknown[]) {
  const url = typeof key === "string" ? key : key[0];
  if (typeof url !== "string") throw new FetchError(400);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new FetchError(response.status);
  return response.json();
}
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{
    provider: () => new Map(), fetcher, revalidateOnFocus: true,
    revalidateOnReconnect: true, dedupingInterval: 2000,
    onErrorRetry(error: FetchError, _key, _config, revalidate, { retryCount }) {
      if ([401, 403, 404].includes(error.status) || retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 5000);
    },
  }}>{children}</SWRConfig>;
}
