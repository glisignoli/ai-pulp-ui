import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePulpList } from '../hooks/usePulpList';

type Item = { id: string };

describe('usePulpList', () => {
  it('calls list with offset=0 and initial ordering', async () => {
    const list = vi.fn().mockResolvedValue({ count: 0, results: [] as Item[] });

    const { result } = renderHook(() =>
      usePulpList<Item>({
        list,
        pageSize: 25,
        errorMessage: 'Failed to load',
        initialOrdering: '',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(list).toHaveBeenCalledWith(0, '');
  });

  it('changes page and requests the correct offset', async () => {
    const list = vi.fn().mockResolvedValue({ count: 0, results: [] as Item[] });

    const { result } = renderHook(() =>
      usePulpList<Item>({
        list,
        pageSize: 25,
        errorMessage: 'Failed to load',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handlePageChange(null, 1);
    });

    await waitFor(() => {
      expect(list).toHaveBeenLastCalledWith(25, '');
      expect(result.current.page).toBe(1);
    });
  });

  it('changing ordering resets page to 0 and refetches', async () => {
    const list = vi.fn().mockResolvedValue({ count: 0, results: [] as Item[] });

    const { result } = renderHook(() =>
      usePulpList<Item>({
        list,
        pageSize: 25,
        errorMessage: 'Failed to load',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handlePageChange(null, 2);
    });
    await waitFor(() => expect(result.current.page).toBe(2));

    act(() => {
      result.current.handleOrderingChange('name');
    });

    await waitFor(() => {
      expect(result.current.page).toBe(0);
      expect(list).toHaveBeenLastCalledWith(0, 'name');
    });
  });

  it('refresh triggers a refetch', async () => {
    const list = vi.fn().mockResolvedValue({ count: 0, results: [] as Item[] });

    const { result } = renderHook(() =>
      usePulpList<Item>({
        list,
        pageSize: 25,
        errorMessage: 'Failed to load',
      })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = list.mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(list.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('uses the latest list function after it changes', async () => {
    const listA = vi.fn().mockResolvedValue({ count: 0, results: [{ id: 'a' }] as Item[] });
    const listB = vi.fn().mockResolvedValue({ count: 0, results: [{ id: 'b' }] as Item[] });

    const { result, rerender } = renderHook(
      ({ list }) =>
        usePulpList<Item>({
          list,
          pageSize: 25,
          errorMessage: 'Failed to load',
        }),
      { initialProps: { list: listA } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: 'a' }]);

    rerender({ list: listB });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(listB).toHaveBeenCalled();
      expect(result.current.items).toEqual([{ id: 'b' }]);
    });
  });

  it('does not set state after unmount when the request resolves later', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    let resolveDeferred!: (value: { count: number; results: Item[] }) => void;
    const deferred = new Promise<{ count: number; results: Item[] }>((resolve) => {
      resolveDeferred = resolve;
    });
    const list = vi.fn().mockReturnValue(deferred);

    const { unmount } = renderHook(() =>
      usePulpList<Item>({
        list,
        pageSize: 25,
        errorMessage: 'Failed to load',
      })
    );

    unmount();
    resolveDeferred({ count: 0, results: [] });

    // Allow microtasks to flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
