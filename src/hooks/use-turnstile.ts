"use client";
import { useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey } from "@/lib/env/public";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoad: Promise<TurnstileApi> | undefined;

function loadTurnstile() {
  scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable"));
    script.onerror = () => { scriptLoad = undefined; script.remove(); reject(new Error("Turnstile failed to load")); };
    document.head.append(script);
  });
  return scriptLoad;
}

/** Renders an invisible-until-needed Turnstile widget; the token is single-use, so `resetOn` re-arms it after each submission. */
export function useTurnstile(resetOn?: unknown) {
  const siteKey = getTurnstileSiteKey();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!siteKey || !container) return;
    let cancelled = false;
    loadTurnstile().then(api => {
      if (cancelled) return;
      widgetId.current = api.render(container, {
        sitekey: siteKey,
        appearance: "interaction-only",
        callback: (value: string) => { setToken(value); setFailed(false); },
        "expired-callback": () => setToken(null),
        "error-callback": () => { setToken(null); setFailed(true); },
      });
    }).catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [siteKey]);

  useEffect(() => {
    if (!widgetId.current) return;
    setToken(null);
    window.turnstile?.reset(widgetId.current);
  }, [resetOn]);

  const enabled = Boolean(siteKey);
  return { containerRef, token, failed, enabled, blocked: enabled && !token };
}

export type TurnstileController = ReturnType<typeof useTurnstile>;
