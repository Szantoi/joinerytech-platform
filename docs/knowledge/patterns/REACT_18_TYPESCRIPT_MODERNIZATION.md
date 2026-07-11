# React 18 TypeScript Modernization (2026)

**Készítette:** Librarian (Explorer research alapján)
**Forrás:** MSG-EXPLORER-004-DONE (2026-06-22)
**Utolsó frissítés:** 2026-06-22

---

## Összefoglaló

A React 18 + TypeScript ecosystem 2026-ban 4 kulcs területen változott:
1. **Tooling:** Vite > Create React App (CRA deprecated)
2. **Architecture:** Feature-based > Type-based folder structure
3. **State Management:** TanStack Query (server) + Zustand (client)
4. **TypeScript:** Strict mode standard (78% dev adoption)

**SpaceOS gap analysis:**
- ✅ **Vite:** Már használjuk
- ❌ **Strict mode:** Nincs bekapcsolva
- ❌ **TanStack Query:** Saját `useApi` hook (nincs caching)
- ⚠️ **Folder structure:** Type-based (`components/`, `hooks/`) — régi pattern

**Ajánlás:** ⚠️ **MEGFONTOLÁST IGÉNYEL** — modernizálás hasznos, de **nem sürgős** (Doorstar Soft Launch után Q3 2026).

---

## 1. Tooling (2026 Standard)

### 1.1 Vite vs Create React App

| Aspektus | Vite | Create React App (CRA) |
|----------|------|------------------------|
| **Dev server start** | <1s | 10-30s |
| **HMR (Hot Module Reload)** | <100ms | 1-5s |
| **Build time** | 5-10s | 30-60s |
| **Bundle size** | Optimális | Nagyobb (webpack overhead) |
| **Status** | ✅ **Active development** | ⚠️ **Deprecated (2023)** |

**SpaceOS current:** ✅ **Vite** — már használjuk (2026 best practice)

**Nincs változtatási igény** — Vite már implementálva van.

### 1.2 TypeScript Strict Mode

**Current `tsconfig.json` (SpaceOS):**

```json
{
  "compilerOptions": {
    "strict": false,  // ❌ NOT enabled
    "skipLibCheck": true
  }
}
```

**Recommended `tsconfig.json` (2026):**

```json
{
  "compilerOptions": {
    "strict": true,   // ✅ Enable all strict checks
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Impact:**
- **~100+ TypeScript errors** a strict mode bekapcsolásakor
- Leggyakoribb: `undefined` handling, `any` type usage

**Migration strategy (FOKOZATOS):**

```json
// Step 1: Enable one check at a time
{
  "compilerOptions": {
    "strictNullChecks": true,  // Week 1
    "noImplicitAny": false     // Later
  }
}

// Step 2: Fix errors, then enable next check
{
  "compilerOptions": {
    "strictNullChecks": true,  // ✅ Fixed
    "noImplicitAny": true      // Week 2
  }
}

// Step 3: Full strict mode
{
  "compilerOptions": {
    "strict": true  // ✅ All checks enabled
  }
}
```

**Priority:** **MEDIUM** (Q3 2026 után)

---

## 2. Architecture (Folder Structure)

### 2.1 Type-Based vs Feature-Based

**Type-Based (SpaceOS current):**

```
src/
├── components/
│   ├── OrderCard.tsx
│   ├── BatchCard.tsx
│   ├── CuttingPlanCard.tsx
│   └── ...
├── hooks/
│   ├── useOrders.ts
│   ├── useBatches.ts
│   └── useCuttingPlans.ts
├── pages/
│   ├── OrdersPage.tsx
│   ├── BatchesPage.tsx
│   └── CuttingPlansPage.tsx
└── utils/
    └── api.ts
```

**Feature-Based (2026 recommended):**

```
src/
├── features/
│   ├── orders/
│   │   ├── components/
│   │   │   └── OrderCard.tsx
│   │   ├── hooks/
│   │   │   └── useOrders.ts
│   │   ├── pages/
│   │   │   └── OrdersPage.tsx
│   │   └── api/
│   │       └── ordersApi.ts
│   ├── batches/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── pages/
│   └── cutting/
│       ├── components/
│       ├── hooks/
│       └── pages/
└── shared/
    ├── components/  # Közös komponensek
    └── hooks/       # Közös hooks
```

**Előnyök (Feature-Based):**
- ✅ Feature kohézió (minden egy helyen)
- ✅ Könnyebb feature törlés (1 mappa delete)
- ✅ Párhuzamos fejlesztés (nincs merge conflict `components/` mappában)

**Hátrányok (Migration):**
- ⚠️ **Nagy változás:** 27 világ × N komponens átszervezése
- ⚠️ **Merge conflictok:** Ha párhuzamos fejlesztés megy
- ⚠️ **Testing törése:** Import paths megváltoznak

**Migration strategy (FOKOZATOS):**

```bash
# Step 1: Új feature-ök már feature-based
src/features/ehs/        # ✅ Új EHS module feature-based
src/features/catalog/    # ✅ Új Catalog module feature-based

# Step 2: Régiek maradnak type-based
src/components/          # ⚠️ Legacy (Joinery, Cutting, Sales)
src/hooks/
src/pages/

# Step 3: Fokozatos migráció (ha van kapacitás)
# Egy-egy feature átköltöztetése (low priority)
```

**Priority:** **LOW** (Q4 2026 vagy Later) — **nincs sürgős business value**

---

## 3. State Management (Server vs Client State)

### 3.1 TanStack Query (React Query) — Server State

**Current SpaceOS pattern (custom `useApi` hook):**

```typescript
// src/hooks/useApi.ts
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  return { data, loading, error };
}
```

**Problems:**
- ❌ **Nincs caching** — minden component re-mount refetch-el
- ❌ **Nincs background refetch** — stale data 10 perc után
- ❌ **Nincs retry** — network error esetén manual refresh kell

**Recommended pattern (TanStack Query):**

```typescript
// src/features/orders/hooks/useOrders.ts
import { useQuery } from '@tanstack/react-query';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await fetch('/api/orders');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,  // 5 min cache
    refetchOnWindowFocus: true, // Background refetch
    retry: 3                    // Auto retry on error
  });
}
```

**Benefits:**
- ✅ **Automatic caching** — same query = 1 request, shared across components
- ✅ **Background refetch** — stale data auto-refreshed
- ✅ **Optimistic updates** — instant UI feedback
- ✅ **Devtools** — TanStack Query DevTools for debugging

**Migration strategy (FOKOZATOS):**

```typescript
// Step 1: Új feature-ök TanStack Query
src/features/ehs/hooks/useIncidents.ts  // ✅ TanStack Query

// Step 2: Régiek maradnak useApi
src/hooks/useOrders.ts                   // ⚠️ Legacy useApi

// Step 3: Fokozatos migráció (ha van kapacitás)
// useApi → TanStack Query wrapper
export function useApi<T>(url: string) {
  return useQuery({
    queryKey: [url],
    queryFn: () => fetch(url).then(res => res.json())
  });
}
```

**Priority:** **MEDIUM** (Q3 2026 — új feature-öknél használni)

### 3.2 Zustand — Client State

**SpaceOS current:** ✅ **Már használjuk** Zustand-ot

**Examples:**
- EHS Incident Wizard: `useIncidentDraftStore` (Zustand + persist + localForage)
- Cutting Module: Batch assignment Kanban state

**Recommended pattern (2026):**

```typescript
// ✅ GOOD: Feature-scoped store
src/features/ehs/stores/incidentDraftStore.ts

// ❌ BAD: Global store (minden feature egy helyen)
src/stores/globalStore.ts  // ← Anti-pattern, ne csináld
```

**SpaceOS current:** ✅ **Követi** a feature-scoped pattern-t

**Nincs változtatási igény** — Zustand használat már best practice szerint van.

---

## 4. SpaceOS Gap Analysis

### 4.1 Current State vs 2026 Best Practices

| Area | SpaceOS Current | 2026 Best Practice | Gap | Priority |
|------|-----------------|-------------------|-----|----------|
| **Tooling: Build tool** | Vite | Vite | ✅ **MATCH** | - |
| **Tooling: TS strict** | `strict: false` | `strict: true` | ❌ **GAP** | **MEDIUM** |
| **Architecture: Folders** | Type-based | Feature-based | ⚠️ **PARTIAL** | **LOW** |
| **State: Server** | Custom `useApi` | TanStack Query | ❌ **GAP** | **MEDIUM** |
| **State: Client** | Zustand | Zustand | ✅ **MATCH** | - |
| **Framework** | Vite + React 18 | Vite + React 18 | ✅ **MATCH** | - |

### 4.2 Javasolt Lépések (Prioritás Szerint)

**Q3 2026 (MEDIUM Priority):**

1. **TypeScript Strict Mode (fokozatos)**
   - Week 1: `strictNullChecks: true`
   - Week 2: `noImplicitAny: true`
   - Week 3: `strictFunctionTypes: true`
   - Week 4: `strict: true` (full)

2. **TanStack Query (új feature-öknél)**
   - EHS Module: `useIncidents` → TanStack Query
   - Catalog Module: `useCatalogItems` → TanStack Query
   - Régiek: maradnak `useApi` (Later migráció)

**Q4 2026 vagy Later (LOW Priority):**

3. **Feature-Based Folders (új feature-öknél)**
   - Új modulok: `src/features/<module>/`
   - Régiek: maradnak `src/components/` (Later migráció)

**NEM javasolt:**

❌ **Teljes codebase refactor** — 27 világ × komponensek átírása túl nagy kockázat
❌ **Next.js migráció** — SpaceOS SPA, nincs SSR requirement (nincs SEO igény)
❌ **React 19 migráció** — React 18 still supported 2026-ban, nincs breaking change

---

## 5. KRITIKUS ÉRTÉKELÉS — PRO/KONTRA

### 5.1 ✅ PRO érvek — Modernizálás

1. **TypeScript Strict Mode:**
   - Több compile-time bug catch
   - Jobb IDE autocomplete
   - 78% professional devs use strict mode (State of JS 2025)

2. **TanStack Query:**
   - Automatic caching → kevesebb API call → jobb performance
   - Background refetch → always fresh data
   - Optimistic updates → jobb UX (instant feedback)

3. **Feature-Based Folders:**
   - Könnyebb feature delete/refactor
   - Párhuzamos fejlesztés (nincs merge conflict)
   - Jobb code organization

### 5.2 ⚠️ KONTRA érvek — Migráció Kockázatai

1. **TypeScript Strict Mode:**
   - **100+ TypeScript error** a bekapcsoláskor
   - **2-4 hét** migráció (fokozatos)
   - **Kockázat:** Runtime bug (ha `undefined` handling rossz)

2. **TanStack Query:**
   - **Új dependency** (100kb bundle size növekedés)
   - **Tanulási görbe** (team training szükséges)
   - **Kockázat:** 100+ `useApi` call lecserélése = nagy változás

3. **Feature-Based Folders:**
   - **27 világ × N komponens** átszervezése
   - **Merge conflictok** (ha párhuzamos fejlesztés)
   - **Testing törése** (import paths megváltoznak)

### 5.3 🎯 VÉGSŐ AJÁNLÁS

**⚠️ MEGFONTOLÁST IGÉNYEL — modernizálás hasznos, de NEM sürgős**

**Javasolt roadmap:**

**Q3 2026 (Doorstar Soft Launch után):**
1. ✅ TypeScript strict mode (fokozatos, 4 hét)
2. ✅ TanStack Query (új feature-öknél)

**Q4 2026 vagy Later:**
3. ⚠️ Feature-based folders (opcionális, csak ha team size >5)

**NEM javasolt:**
- ❌ Teljes codebase refactor (túl nagy kockázat)
- ❌ Next.js migráció (nincs SSR requirement)

---

## 6. Migration Checklist

### 6.1 TypeScript Strict Mode Migration

**Week 1: `strictNullChecks: true`**

```bash
# Step 1: Enable check
echo '{"compilerOptions": {"strictNullChecks": true}}' > tsconfig.json

# Step 2: Fix errors (várható: ~50 error)
npm run type-check

# Step 3: Common fixes
- Nullish coalescing: `foo?.bar ?? defaultValue`
- Optional chaining: `foo?.bar?.baz`
- Type guards: `if (foo !== null) { ... }`
```

**Week 2: `noImplicitAny: true`**

```bash
# Fix errors (várható: ~30 error)
- Explicit function params: `(foo: string) => void`
- Explicit state type: `useState<Order | null>(null)`
```

**Week 3: `strictFunctionTypes: true`**

```bash
# Fix errors (várható: ~10 error)
- Event handler types: `(e: React.MouseEvent) => void`
```

**Week 4: `strict: true`**

```bash
# Enable all strict checks
{"compilerOptions": {"strict": true}}
```

### 6.2 TanStack Query Migration

**Step 1: Install dependency**

```bash
npm install @tanstack/react-query
```

**Step 2: Setup QueryClientProvider**

```tsx
// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 min
      retry: 3
    }
  }
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes />
    </QueryClientProvider>
  );
}
```

**Step 3: Migrate `useApi` calls (fokozatos)**

```tsx
// BEFORE (useApi)
const { data, loading, error } = useApi<Order[]>('/api/orders');

// AFTER (TanStack Query)
const { data, isLoading, error } = useQuery({
  queryKey: ['orders'],
  queryFn: () => fetch('/api/orders').then(r => r.json())
});
```

---

## 7. Források

**React 18 TypeScript Best Practices:**
- [Best Practices for TypeScript with React in 2026](https://medium.com/@mernstackdevbykevin/typescript-with-react-best-practices-2026-78ce4546210b)
- [React Architecture Best Practices 2026](https://ortemtech.com/blog/react-architecture-best-practices/)
- [React Stack Patterns](https://www.patterns.dev/react/react-2026/)
- [TypeScript Best Practices 2026: Complete Guide](https://hashtagcoders.lk/blogs/typescript-best-practices-2026)

**SpaceOS Implementation:**
- `spaceos-portal/tsconfig.json`
- `spaceos-portal/src/hooks/useApi.ts`
- `spaceos-portal/src/features/ehs/stores/incidentDraftStore.ts`

**Explorer Research:**
- MSG-EXPLORER-004-DONE (2026-06-22)

---

## 8. Changelog

| Dátum | Verzió | Változás |
|-------|--------|----------|
| 2026-06-22 | v1.0 | Initial React modernization doc (Librarian synthesis) |

---

**Következő review:** 2026-09-22 (Q3 review — strict mode migration check)
