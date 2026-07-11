---
name: frontend-react
description: 'React 18+ and TypeScript development standards, component patterns and best practices. Use when implementing React components, hooks, TanStack Query, or Vite configuration.'
domain: engineering
last_updated: 2026-02-24
---

# ?? Frontend / React & TypeScript Skill

**Summary:** Ez a skill biztosítja a React 18+ és TypeScript fejlesztéséhez szükséges szabványokat, komponens mintákat és best practice-eket a projektben.

## ?? Mikor töltsd be?

- **UI Fejlesztés**: Új komponens, Page, Layout készítése.
- **Logika**: Custom Hook írása, State management.
- **API Integráció**: Adatlekérdezés (TanStack Query), Form kezelés.
- **Hibakeresés**: React renderelési hibák, TypeScript típusproblémák.

---

## ??? Architektúra és Szabályok

A frontend kód a **Feature-based** vagy **Component-based** struktúrát követi.

### ?? Projekt Struktúra

```text
src/JoineryTech.Flow.Web/src/
+¦¦ api/                # API kliens és hooks
+¦¦ features/           # Üzleti funkciók (pl. projects, auth)
+¦¦ components/         # Megosztott UI komponensek (Button, Card)
+¦¦ hooks/              # Megosztott logikai hook-ok
L¦¦ assets/             # Statikus fájlok
```

---

## ?? Kód minták

### Funkcionális komponens

```typescript
/**
 * ProjectCard Component
 * Displays a single project card.
 */
interface ProjectCardProps {
    project: ProjectResponse;
    onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
    return (
        <div className="project-card" onClick={onClick}>
            <h3 className="project-title">{project.title}</h3>
            <p className="project-description">{project.description}</p>
            <span className="project-status">{project.status}</span>
        </div>
    );
}
```

### Data fetching (TanStack Query)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectsService, type CreateProjectRequest } from '../generated';

// Query keys for cache management
export const projectKeys = {
    all: ['projects'] as const,
    detail: (id: string) => ['projects', id] as const,
};

// Lista lekérdezés
export function useProjects() {
    return useQuery({
        queryKey: projectKeys.all,
        queryFn: () => ProjectsService.getApiProjects(),
    });
}

// Egyedi projekt lekérdezés
export function useProject(id: string) {
    return useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: () => ProjectsService.getApiProjects1(id),
        enabled: !!id,
    });
}

// Mutation (létrehozás)
export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: CreateProjectRequest) =>
            ProjectsService.postApiProjects(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.all });
        },
    });
}
```

### Lista komponens loading/error kezeléssel

```typescript
import { useProjects } from '../../api/hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import './ProjectList.css';

interface ProjectListProps {
    onSelectProject?: (projectId: string) => void;
}

export function ProjectList({ onSelectProject }: ProjectListProps) {
    const { data: projects, isLoading, error } = useProjects();

    if (isLoading) {
        return (
            <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Projektek betöltése...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <h2>Hiba történt</h2>
                <p>{(error as Error).message}</p>
            </div>
        );
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="empty-state">
                <h2>Nincsenek projektek</h2>
            </div>
        );
    }

    return (
        <div className="project-grid">
            {projects.map((project) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => project.id && onSelectProject?.(project.id)}
                />
            ))}
        </div>
    );
}
```

---

## ?? Styling szabályok

A projekt **vanilla CSS**-t használ (NEM MUI/Material-UI!).

```css
/* ? JÓ - CSS osztályok külön fájlban */
.project-card {
    padding: 16px;
    margin-top: 8px;
    background: var(--color-surface);
    border-radius: 8px;
}

.project-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

```typescript
// ? JÓ - className használata
<div className="project-card">

// ? ROSSZ - inline style (kerülendõ)
<div style={{ padding: '16px', marginTop: '8px' }}>
```

### CSS fájl elnevezés

- Komponens mellé: `ProjectList.css` (import: `import './ProjectList.css'`)
- Globális: `index.css`, `App.css`

---

## ? Build parancsok

```powershell
# Navigálj a frontend mappába
cd JoineryTech.Flow.Web

# Függõségek telepítése
npm install

# Fejlesztõi szerver (Vite)
npm run dev

# Production build
npm run build

# Lint ellenõrzés
npm run lint

# API kliens generálás (backend futása szükséges!)
npm run generate:api
```

### API generálás workflow

1. Indítsd el a backend-et (`dotnet run` az Api mappában)
2. Futtasd: `npm run generate:api`
3. Újragenerálódik az `src/api/generated/` mappa

---

## ?? Gyakori hibák

| Hiba | Megoldás |
| ------ | ---------- |
| `TS2307: Cannot find module` | Hiányzó import vagy rossz path |
| `TS2339: Property does not exist` | Típus definíció hiányzik, generáld újra az API-t |
| `useQuery outside Provider` | `QueryClientProvider` kell a `main.tsx`-be |
| `CORS error` | Vite proxy mûködik, ellenõrizd a `vite.config.ts`-t |
| `Network Error` | Backend nem fut, indítsd el: `dotnet run` |
| `Swagger not found (generate:api)` | Backend fut? URL helyes? (`localhost:5058`) |

---

## ?? API integráció

### Vite proxy konfiguráció

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5058',
        changeOrigin: true,
      }
    }
  }
})
```

### OpenAPI kliens használata

```typescript
// Import a generált service-bõl
import { ProjectsService, WorkTasksService } from '../api/generated';

// Közvetlen használat (ritkán)
const projects = await ProjectsService.getApiProjects();

// ? AJÁNLOTT: Hook-on keresztül
const { data, isLoading } = useProjects();
```

---

## ?? Referencia fájlok

- `src/features/projects/ProjectList.tsx` - Lista komponens minta
- `src/features/projects/ProjectDetails.tsx` - Részletek komponens minta
- `src/api/hooks/useProjects.ts` - Query hook minta
- `src/api/hooks/useWorkTasks.ts` - Nested query minta
- `vite.config.ts` - Proxy konfiguráció
