"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { ADMIN_PAGE_SIZE, type AdminPage } from "@/lib/admin/schemas";
import { useDebouncedValue } from "./use-debounced-value";

export type AdminListParams = { q: string; page: number; status?: string };

function toQuery({ q, page, status }: AdminListParams) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

/** Server-paginated admin list with debounced search, mirrored to the URL so back/forward keep the view. */
export function useAdminList<Row>(endpoint: string, userId: string, initialParams: AdminListParams, initialData: AdminPage<Row>) {
  const [params, setParams] = useState(initialParams);
  const q = useDebouncedValue(params.q.trim(), 350);
  const query = toQuery({ q, page: params.page, status: params.status });
  const initialQuery = useMemo(() => toQuery(initialParams), [initialParams]);
  const { data, error, isValidating, mutate } = useSWR<AdminPage<Row>>([`${endpoint}?${query}`, userId], {
    fallbackData: query === initialQuery ? initialData : undefined,
    keepPreviousData: true, revalidateOnFocus: false, revalidateIfStale: false,
  });
  useEffect(() => {
    window.history.replaceState(window.history.state, "", query ? `?${query}` : window.location.pathname);
  }, [query]);
  const setSearch = useCallback((value: string) => setParams(current => ({ ...current, q: value, page: 1 })), []);
  const setStatus = useCallback((status?: string) => setParams(current => ({ ...current, status, page: 1 })), []);
  const setPage = useCallback((page: number) => setParams(current => ({ ...current, page })), []);
  return {
    params, data, error, mutate, setSearch, setStatus, setPage,
    searching: params.q.trim() !== q || isValidating,
    pageCount: Math.max(1, Math.ceil((data?.total ?? 0) / ADMIN_PAGE_SIZE)),
  };
}
