# React Custom Hook Template

**Pattern:** Reusable logic for components (state, side effects)

## 1. Simple Hook — useAsync

```typescript
// hooks/useAsync.ts
import { useEffect, useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): UseAsyncState<T> & { refetch: () => Promise<void> } {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await asyncFunction();
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { ...state, refetch: execute };
}
```

## 2. Usage

```typescript
export function OrderList() {
  const { data: orders, loading, error, refetch } = useAsync(
    () => fetch('/api/orders').then(r => r.json()),
    true
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <ul>
        {orders?.map(order => (
          <li key={order.id}>{order.number}</li>
        ))}
      </ul>
      <button onClick={refetch}>Refresh</button>
    </>
  );
}
```

## 3. With TanStack Query (Advanced)

```typescript
import { useQuery } from '@tanstack/react-query';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => fetch('/api/orders').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Usage
export function OrderList() {
  const { data: orders, isLoading, error } = useOrders();
  // ...
}
```

**See also:** [REACT_18_TYPESCRIPT_MODERNIZATION.md](../patterns/REACT_18_TYPESCRIPT_MODERNIZATION.md)
