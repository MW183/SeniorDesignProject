import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

type Filters = Record<string, string | number | undefined>;

export default function usePaginatedData(path: string, initialFilters: Filters = {}, initialPageSize = 20) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (opts?: { page?: number; pageSize?: number; filters?: Filters }) => {
    const p = opts?.page ?? page;
    const ps = opts?.pageSize ?? pageSize;
    const f = opts?.filters ?? filters;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(ps));
      params.set('offset', String(p * ps));
      // add filters
      for (const k of Object.keys(f || {})) {
        const v = (f as any)[k];
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
      }

      const res = await api(`${path}?${params.toString()}`);
      if (res.ok && Array.isArray(res.body)) {
        setData(res.body);
        setHasMore(res.body.length === ps);
      } else {
        setData([]);
        setHasMore(false);
      }
    } catch (err) {
      setData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [path, page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  return {
    data,
    loading,
    page,
    setPage: (p: number) => { setPage(p); load({ page: p }); },
    pageSize,
    setPageSize: (ps: number) => { setPageSize(ps); load({ page: 0, pageSize: ps }); },
    filters,
    setFilters: (f: Filters) => { setFilters(f); setPage(0); load({ page: 0, filters: f }); },
    reload: () => load({ page, pageSize, filters }),
    hasMore,
  };
}
