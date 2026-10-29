"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function parse<T>(raw: string | null, fallback: T, isValid: (value: unknown) => value is T) {
  if (raw === null) return fallback;
  try { const value: unknown = JSON.parse(raw); return isValid(value) ? value : fallback; } catch { return fallback; }
}

export function usePersistedState<T>(key: string, fallback: T, isValid: (value: unknown) => value is T) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => parse(raw, fallback, isValid), [raw, fallback, isValid]);
  const setValue = useCallback((next: T | ((current: T) => T)) => {
    const current = parse(read(key), fallback, isValid);
    const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { return; }
    listeners.forEach(listener => listener());
  }, [key, fallback, isValid]);
  return [value, setValue] as const;
}
