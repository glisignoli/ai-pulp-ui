import { useCallback, useEffect, useRef, useState } from 'react';

export interface PulpListResponse<T> {
  count: number;
  results: T[];
}

export function usePulpList<T>(options: {
  list: (offset: number, ordering: string) => Promise<PulpListResponse<T>>;
  pageSize: number;
  errorMessage: string;
  initialOrdering?: string;
}) {
  const { list, pageSize, errorMessage, initialOrdering = '' } = options;

  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  }, [list]);

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [ordering, setOrdering] = useState<string>(initialOrdering);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  const handlePageChange = useCallback(
    (_event: unknown, newPage: number) => {
      setPage(newPage);
    },
    []
  );

  const handleOrderingChange = useCallback((newOrdering: string) => {
    setOrdering(newOrdering);
    setPage(0);
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        const offset = page * pageSize;
        const response = await listRef.current(offset, ordering);
        if (!active) return;
        setItems(response.results);
        setTotalCount(response.count);
        setError(null);
      } catch {
        if (!active) return;
        setError(errorMessage);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [errorMessage, ordering, page, pageSize, reloadKey]);

  return {
    items,
    loading,
    error,
    setError,

    page,
    totalCount,
    ordering,

    setPage,
    setOrdering,

    handlePageChange,
    handleOrderingChange,
    refresh,
  };
}
