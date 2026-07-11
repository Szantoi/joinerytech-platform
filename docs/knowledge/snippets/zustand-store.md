# Zustand Store Boilerplate Pattern

**Use case:** Global state management for React Portal (auth, user preferences, feature toggles)

## 1. Store Definition (TypeScript)

```typescript
// src/store/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  roles: string[];
  tenantId: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      
      setToken: (token) => set({ token }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false 
      }),
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        token: state.token,
        // Don't persist user (refresh from API)
      }),
    }
  )
);
```

## 2. Usage in Components

```typescript
// src/components/Dashboard.tsx
import { useAuthStore } from '@/store/useAuthStore';

export function Dashboard() {
  const { user, isAuthenticated, logout } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## 3. DevTools Integration

```typescript
// src/store/index.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set) => ({
        // ... store definition
      }),
      { name: 'auth-storage' }
    ),
    { name: 'AuthStore' }
  )
);
```

## 4. Testing

```typescript
// src/store/__tests__/useAuthStore.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null });
  });

  it('should set user and token', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setUser({ 
        id: '1', 
        email: 'test@example.com',
        roles: ['user'],
        tenantId: 'tenant-1'
      });
      result.current.setToken('jwt-token-here');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });
});
```

**See also:** [REACT_18_TYPESCRIPT_MODERNIZATION.md](../patterns/REACT_18_TYPESCRIPT_MODERNIZATION.md)
