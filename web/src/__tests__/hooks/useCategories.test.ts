import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useCategories } from '@/hooks/useCategories';
import categoryService from '@/services/categoryService';

vi.mock('@/services/categoryService', () => ({
  default: {
    getAllCategories: vi.fn(),
  },
}));

describe('useCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch categories on mount', async () => {
    const mockCategories = [
      { id: '1', name: 'Web Development' },
      { id: '2', name: 'Mobile Development' },
    ];

    vi.mocked(categoryService.getAllCategories).mockResolvedValue(
      mockCategories
    );

    const { result } = renderHook(() => useCategories());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toEqual(mockCategories);
    expect(categoryService.getAllCategories).toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    vi.mocked(categoryService.getAllCategories).mockRejectedValue(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.categories).toEqual([]);
  });

  it('should refetch categories when refetch is called', async () => {
    const mockCategories = [{ id: '1', name: 'Test' }];

    vi.mocked(categoryService.getAllCategories).mockResolvedValue(
      mockCategories
    );

    const { result } = renderHook(() => useCategories());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(categoryService.getAllCategories).toHaveBeenCalledTimes(2);
  });

  it('should return empty array initially', () => {
    vi.mocked(categoryService.getAllCategories).mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useCategories());

    expect(result.current.categories).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
